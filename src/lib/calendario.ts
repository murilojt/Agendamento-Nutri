import { JWT } from "google-auth-library";
import { CONFIG_AGENDA } from "@/core/config";
import type { Intervalo } from "@/core/disponibilidade";

/** Lançado quando o horário já foi reservado por outra pessoa. */
export class HorarioOcupadoError extends Error {}

export type Reserva = { inicio: Date; fim: Date; titulo: string; descricao: string; dados: Record<string, string> };

export interface Calendario {
  /** Intervalos ocupados na agenda entre duas datas. */
  ocupados(de: Date, ate: Date): Promise<Intervalo[]>;
  /** Cria o evento. Se o horário já tiver reserva do site, lança HorarioOcupadoError. */
  reservar(reserva: Reserva): Promise<void>;
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

  async reservar(reserva: Reserva): Promise<void> {
    const id = idDoEvento(reserva.inicio);
    const cal = encodeURIComponent(this.calendarId);
    const evento = {
      id,
      summary: reserva.titulo,
      description: reserva.descricao,
      start: { dateTime: reserva.inicio.toISOString(), timeZone: CONFIG_AGENDA.fusoIana },
      end: { dateTime: reserva.fim.toISOString(), timeZone: CONFIG_AGENDA.fusoIana },
      extendedProperties: { private: { origem: "site-agendamentos", ...reserva.dados } },
      status: "confirmed",
    };

    const criado = await this.chamar(`/calendars/${cal}/events`, { method: "POST", body: JSON.stringify(evento) });
    if (criado.ok) return;
    if (criado.status !== 409) await this.falhar(criado, "criar evento");

    // 409: já existe evento com este id. Se foi cancelado pela nutricionista, reaproveita.
    const atual = await this.chamar(`/calendars/${cal}/events/${id}`);
    if (!atual.ok) await this.falhar(atual, "ler evento existente");
    const existente = await atual.json();
    if (existente.status !== "cancelled") throw new HorarioOcupadoError();

    const reativado = await this.chamar(`/calendars/${cal}/events/${id}`, {
      method: "PUT",
      body: JSON.stringify(evento),
    });
    if (!reativado.ok) await this.falhar(reativado, "reativar evento");
  }
}

// ---------------- Agenda simulada (modo de teste) ----------------

const globalComAgenda = globalThis as unknown as { __agendaTeste?: Map<string, Intervalo> };

class CalendarioEmMemoria implements Calendario {
  private eventos = (globalComAgenda.__agendaTeste ??= new Map());

  async ocupados(de: Date, ate: Date) {
    return [...this.eventos.values()].filter((e) => e.inicio < ate && e.fim > de);
  }

  async reservar(reserva: Reserva) {
    const id = idDoEvento(reserva.inicio);
    if (this.eventos.has(id)) throw new HorarioOcupadoError();
    this.eventos.set(id, { inicio: reserva.inicio, fim: reserva.fim });
    console.log(`[agenda de teste] ${reserva.titulo} em ${reserva.inicio.toISOString()}`);
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
