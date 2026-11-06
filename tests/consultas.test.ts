import { test } from "node:test";
import assert from "node:assert/strict";
import { dataUtcCompacta, gerarIcs, LINK_ROTA, linkGoogleAgenda, paraBanco, rotuloModalidade, separarConsultas, tituloParaAgenda } from "../src/core/consultas.ts";

const ev = { inicio: new Date("2026-11-10T13:00:00Z"), fim: new Date("2026-11-10T14:00:00Z"), titulo: "Consulta, nutrição; Ayllus", descricao: "Linha 1\nLinha 2", local: "Rua Itapicuru, 369" };

test("modalidade: rótulos e valor do banco", () => {
  assert.equal(rotuloModalidade("online"), "Online");
  assert.equal(rotuloModalidade("in_person"), "Presencial");
  assert.equal(rotuloModalidade(null), null);
  assert.equal(paraBanco("presencial"), "in_person");
  assert.equal(paraBanco("online"), "online");
  assert.equal(tituloParaAgenda("online"), "Consulta de nutrição (online) — Ayllus");
  assert.equal(tituloParaAgenda(undefined), "Consulta de nutrição — Ayllus");
});

test(".ics: campos, escapes e quebras CRLF", () => {
  const ics = gerarIcs({ ...ev, uid: "abc", agora: new Date("2026-11-01T10:00:00Z") });
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /DTSTART:20261110T130000Z\r\n/);
  assert.match(ics, /DTEND:20261110T140000Z\r\n/);
  assert.match(ics, /SUMMARY:Consulta\\, nutrição\; Ayllus\r\n/);
  assert.match(ics, /DESCRIPTION:Linha 1\\nLinha 2\r\n/);
  assert.match(ics, /LOCATION:Rua Itapicuru\\, 369\r\n/);
  assert.match(ics, /TRIGGER:-P1D/);
  assert.match(ics, /END:VCALENDAR\r\n$/);
  assert.ok(!/(?<!\r)\n/.test(ics), "todas as quebras são CRLF");
});

test("link do Google Agenda e da rota", () => {
  const u = new URL(linkGoogleAgenda(ev));
  assert.equal(u.origin + u.pathname, "https://calendar.google.com/calendar/render");
  assert.equal(u.searchParams.get("dates"), "20261110T130000Z/20261110T140000Z");
  assert.equal(u.searchParams.get("location"), "Rua Itapicuru, 369");
  assert.equal(decodeURIComponent(LINK_ROTA.split("destination=")[1]), "Rua Itapicuru, 369, Perdizes, São Paulo - SP, 05005-020");
  assert.equal(dataUtcCompacta(new Date("2026-01-02T03:04:05Z")), "20260102T030405Z");
});

test("separar próximas e anteriores", () => {
  const c = (id: string, ini: string, fim: string, status: string) => ({ id, starts_at: ini, ends_at: fim, status });
  const agora = new Date("2026-11-05T12:00:00Z");
  const r = separarConsultas([
    c("a", "2026-11-20T13:00:00Z", "2026-11-20T14:00:00Z", "confirmed"),
    c("b", "2026-11-10T13:00:00Z", "2026-11-10T14:00:00Z", "confirmed"),
    c("c", "2026-10-01T13:00:00Z", "2026-10-01T14:00:00Z", "completed"),
    c("d", "2026-11-12T13:00:00Z", "2026-11-12T14:00:00Z", "cancelled"),
    c("e", "2026-09-01T13:00:00Z", "2026-09-01T14:00:00Z", "confirmed"),
    c("f", "2026-11-05T11:30:00Z", "2026-11-05T12:30:00Z", "confirmed"),
  ], agora);
  assert.deepEqual(r.proximas.map((x) => x.id), ["f", "b", "a"]); // "f" ainda está em andamento
  assert.deepEqual(r.anteriores.map((x) => x.id), ["d", "c", "e"]);
});
