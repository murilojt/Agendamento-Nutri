import { JWT } from "google-auth-library";
import { CONFIG_AGENDA } from "@/core/config";
import type { Intervalo } from "@/core/disponibilidade";

/** Lançado quando o horário já foi reservado por outra pessoa. */
export class HorarioOcupadoError extends Error {}

export type Reserva = { inicio: Date; fim: Date; titulo: string; descricao: string; dados: Record<string, string> };

export interface Calendario {
  /** Intervalos ocupados na agenda entre duas datas. */
  ocupados(de: Date, ate: Date): Promise<Intervalo[]>;
  /** Cria o evento e devolve o id dele. Se o horário já tiver reserva do site, lança HorarioOcupadoError. */
  reservar(reserva: Reserva): Promise<string>;
  /**
   * Muda uma consulta de horário e devolve o id do evento (que muda, pois o id é derivado do horário).
   * `reserva` serve de base só se o evento antigo não existir mais na agenda.
   * Se o novo horário já estiver reservado, lança HorarioOcupadoError e nada é alterado.
   */
  mover(idAtual: string, inicio: Date, fim: Date, reserva: Reserva): Promise<string>;
}

/**
 * Id do evento derivado do horário: dois pedidos para o mesmo horário geram o mesmo id,
 * e o Google recusa o segundo. É isso que "trava" o horário mesmo com cliques simultâneos.
 * (O Google aceita apenas letras a-v e números em ids personalizados.)
 */
const idDoEvento = (inicio: Date) => `allyus${Math.floor(inicio.getTime() / 60_000)}`;

// ---------------- Google Agenda ----------------

const API = "https://www.googleapis.com/calendar/v3";

class GoogleCalendario implements Calendario {
  private auth: JWT;

  constructor(email: string, chave: string, private calendarId: string) {
    this.auth = new JWT({
      email,
      key: chave.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });
  }

  private async chamar(caminho: string, init: RequestInit = {}) {
    const { token } = await this.auth.getAccessToken();
    return fetch(`${API}${caminho}`, {
      ...init,
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
    });
  }

  private async falhar(r: Response, acao: string): Promise<never> {
    throw new Error(`Google Agenda (${acao}) respondeu ${r.status}: ${await r.text()}`);
  }

  async ocupados(de: Date, ate: Date): Promise<Intervalo[]> {
    const r = await this.chamar("/freeBusy", {
      method: "POST",
      body: JSON.stringify({
        timeMin: de.toISOString(),
        timeMax: ate.toISOString(),
        timeZone: CONFIG_AGENDA.fusoIana,
        items: [{ id: this.calendarId }],
      }),
    });
    if (!r.ok) await this.falhar(r, "consultar horários");
    const corpo = await r.json();
    const agenda = corpo.calendars?.[this.calendarId];
    if (agenda?.errors?.length) {
      throw new Error(`Sem acesso à agenda ${this.calendarId}: ${JSON.stringify(agenda.errors)}`);
    }
    return (agenda?.busy ?? []).map((b: { start: string; end: string }) => ({
      inicio: new Date(b.start),
      fim: new Date(b.end),
    }));
  }

  /** Cria o evento (ou reativa um cancelado com o mesmo id). Lança HorarioOcupadoError se o horário já está reservado. */
  private async criarEvento(evento: { id: string } & Record<string, unknown>): Promise<string> {
    const id = evento.id;
    const cal = encodeURIComponent(this.calendarId);
    const criado = await this.chamar(`/calendars/${cal}/events`, { method: "POST", body: JSON.stringify(evento) });
    if (criado.ok) return id;
    if (criado.status !== 409) await this.falhar(criado, "criar evento");

    // 409: já existe evento com este id. Se foi cancelado pela nutricionista (ou remarcado), reaproveita.
    const atual = await this.chamar(`/calendars/${cal}/events/${id}`);
    if (!atual.ok) await this.falhar(atual, "ler evento existente");
    const existente = await atual.json();
    if (existente.status !== "cancelled") throw new HorarioOcupadoError();

    const reativado = await this.chamar(`/calendars/${cal}/events/${id}`, {
      method: "PUT",
      body: JSON.stringify(evento),
    });
    if (!reativado.ok) await this.falhar(reativado, "reativar evento");
    return id;
  }

  private montarEvento(id: string, inicio: Date, fim: Date, base: { summary?: string; description?: string; extendedProperties?: unknown }) {
    return {
      id,
      summary: base.summary,
      description: base.description,
      start: { dateTime: inicio.toISOString(), timeZone: CONFIG_AGENDA.fusoIana },
      end: { dateTime: fim.toISOString(), timeZone: CONFIG_AGENDA.fusoIana },
      extendedProperties: base.extendedProperties,
      status: "confirmed",
    };
  }

  async reservar(reserva: Reserva): Promise<string> {
    return this.criarEvento(
      this.montarEvento(idDoEvento(reserva.inicio), reserva.inicio, reserva.fim, {
        summary: reserva.titulo,
        description: reserva.descricao,
        extendedProperties: { private: { origem: "site-agendamentos", ...reserva.dados } },
      }),
    );
  }

  async mover(idAtual: string, inicio: Date, fim: Date, reserva: Reserva): Promise<string> {
    const novoId = idDoEvento(inicio);
    if (novoId === idAtual) return idAtual;
    const cal = encodeURIComponent(this.calendarId);

    // Copia título, descrição e dados do evento atual (se ele sumiu da agenda, usa a reserva como base)
    const atual = await this.chamar(`/calendars/${cal}/events/${idAtual}`);
    let base: { summary?: string; description?: string; extendedProperties?: unknown } = {
      summary: reserva.titulo,
      description: reserva.descricao,
      extendedProperties: { private: { origem: "site-agendamentos", ...reserva.dados } },
    };
    if (atual.ok) {
      const e = await atual.json();
      if (e.status !== "cancelled") base = { summary: e.summary, description: e.description, extendedProperties: e.extendedProperties };
    } else if (atual.status !== 404 && atual.status !== 410) {
      await this.falhar(atual, "ler evento atual");
    }

    // Primeiro cria no horário novo (se estiver ocupado, nada muda); depois libera o horário antigo
    await this.criarEvento(this.montarEvento(novoId, inicio, fim, base));
    const apagado = await this.chamar(`/calendars/${cal}/events/${idAtual}`, { method: "DELETE" });
    if (!apagado.ok && apagado.status !== 404 && apagado.status !== 410) {
      console.error(`Consulta movida, mas o horário antigo não foi liberado na Google Agenda (${apagado.status}).`);
    }
    return novoId;
  }
}

// ---------------- Agenda simulada (modo de teste) ----------------

const globalComAgenda = globalThis as unknown as { __agendaTeste?: Map<string, Intervalo> };

class CalendarioEmMemoria implements Calendario {
  private eventos = (globalComAgenda.__agendaTeste ??= new Map());

  async ocupados(de: Date, ate: Date) {
    return [...this.eventos.values()].filter((e) => e.inicio < ate && e.fim > de);
  }

  async reservar(reserva: Reserva): Promise<string> {
    const id = idDoEvento(reserva.inicio);
    if (this.eventos.has(id)) throw new HorarioOcupadoError();
    this.eventos.set(id, { inicio: reserva.inicio, fim: reserva.fim });
    console.log(`[agenda de teste] ${reserva.titulo} em ${reserva.inicio.toISOString()}`);
    return id;
  }

  async mover(idAtual: string, inicio: Date, fim: Date, reserva: Reserva): Promise<string> {
    const novoId = idDoEvento(inicio);
    if (novoId === idAtual) return idAtual;
    if (this.eventos.has(novoId)) throw new HorarioOcupadoError();
    this.eventos.delete(idAtual);
    this.eventos.set(novoId, { inicio, fim });
    console.log(`[agenda de teste] ${reserva.titulo} remarcada para ${inicio.toISOString()}`);
    return novoId;
  }
}

// ---------------- Escolha automática ----------------

let instancia: Calendario | undefined;

export function getCalendario(): Calendario {
  if (instancia) return instancia;
  const { GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_CALENDAR_ID } = process.env;
  if (GOOGLE_CLIENT_EMAIL && GOOGLE_PRIVATE_KEY && GOOGLE_CALENDAR_ID) {
    instancia = new GoogleCalendario(GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_CALENDAR_ID);
  } else {
    console.warn("Google Agenda não configurado: usando agenda simulada em memória.");
    instancia = new CalendarioEmMemoria();
  }
  return instancia;
}
