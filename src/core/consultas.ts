// Regras puras sobre consultas (rótulos, endereço, links de agenda). Sem React e sem banco: testável.

export type Modalidade = "presencial" | "online";
/** Valor guardado no banco (coluna appointments.modality). */
export type ModalidadeBanco = "in_person" | "online";

export const MODALIDADES: { valor: Modalidade; rotulo: string }[] = [
  { valor: "presencial", rotulo: "Presencial" },
  { valor: "online", rotulo: "Online" },
];

export const paraBanco = (m: Modalidade): ModalidadeBanco => (m === "online" ? "online" : "in_person");

/** Rótulo para mostrar ("Presencial"/"Online"); null se a consulta é antiga e não tem modalidade. */
export function rotuloModalidade(m: string | null | undefined): string | null {
  if (m === "online") return "Online";
  if (m === "in_person") return "Presencial";
  return null;
}

export const ENDERECO_CLINICA = "Edifício Perdizes Trade Center, Rua Itapicuru, 369 — Conjunto 1101, Perdizes, São Paulo — SP, CEP 05005-020";
const ENDERECO_MAPA = "Rua Itapicuru, 369, Perdizes, São Paulo - SP, 05005-020";
/** Abre o Google Maps com o destino já preenchido (a pessoa só informa de onde sai). */
export const LINK_ROTA = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ENDERECO_MAPA)}`;

export type DadosEvento = { inicio: Date; fim: Date; titulo: string; descricao?: string; local?: string | null };

const doisDigitos = (n: number) => String(n).padStart(2, "0");
/** Data em UTC no formato dos calendários: 20261105T130000Z */
export const dataUtcCompacta = (d: Date) =>
  `${d.getUTCFullYear()}${doisDigitos(d.getUTCMonth() + 1)}${doisDigitos(d.getUTCDate())}T${doisDigitos(d.getUTCHours())}${doisDigitos(d.getUTCMinutes())}${doisDigitos(d.getUTCSeconds())}Z`;

/** Texto de campo do .ics: escapa \ ; , e quebras de linha (RFC 5545). */
const escapaIcs = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Arquivo .ics (abre em qualquer agenda: Google, Apple, Outlook) com um lembrete 1 dia antes. */
export function gerarIcs(e: DadosEvento & { uid: string; agora?: Date }): string {
  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ayllus//Agendamento//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.uid}@ayllus`,
    `DTSTAMP:${dataUtcCompacta(e.agora ?? new Date())}`,
    `DTSTART:${dataUtcCompacta(e.inicio)}`,
    `DTEND:${dataUtcCompacta(e.fim)}`,
    `SUMMARY:${escapaIcs(e.titulo)}`,
    ...(e.descricao ? [`DESCRIPTION:${escapaIcs(e.descricao)}`] : []),
    ...(e.local ? [`LOCATION:${escapaIcs(e.local)}`] : []),
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Consulta amanhã",
    "TRIGGER:-P1D",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return linhas.join("\r\n") + "\r\n";
}

/** Link "Adicionar ao Google Agenda". */
export function linkGoogleAgenda(e: DadosEvento): string {
  const p = new URLSearchParams({ action: "TEMPLATE", text: e.titulo, dates: `${dataUtcCompacta(e.inicio)}/${dataUtcCompacta(e.fim)}` });
  if (e.descricao) p.set("details", e.descricao);
  if (e.local) p.set("location", e.local);
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

export type ConsultaPaciente = { id: string; starts_at: string; ends_at: string; status: string; kind?: string | null; modality?: string | null };

/** Separa próximas (confirmadas, ainda não passaram) e anteriores (o resto, da mais recente para a mais antiga). */
export function separarConsultas<T extends { starts_at: string; ends_at: string; status: string }>(lista: T[], agora: Date) {
  const emAberto = (c: T) => c.status === "confirmed" && new Date(c.ends_at).getTime() >= agora.getTime();
  return {
    proximas: lista.filter(emAberto).sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    anteriores: lista.filter((c) => !emAberto(c)).sort((a, b) => b.starts_at.localeCompare(a.starts_at)),
  };
}

export const ROTULO_STATUS: Record<string, string> = { confirmed: "Confirmada", completed: "Realizada", no_show: "Faltou", cancelled: "Cancelada" };

/** Título da consulta para a agenda do paciente. */
export function tituloParaAgenda(modalidade: string | null | undefined): string {
  const m = rotuloModalidade(modalidade);
  return m ? `Consulta de nutrição (${m.toLowerCase()}) — Ayllus` : "Consulta de nutrição — Ayllus";
}
