import { test } from "node:test";
import assert from "node:assert/strict";
import { imc, lerRegistro, resumo, serie, type Registro } from "../src/lib/evolucao.ts";

const r = (id: string, d: string, w: number | null, c: number | null = null): Registro => ({ id, measured_on: d, weight_kg: w, body_fat_pct: null, waist_cm: c, hip_cm: null, notes: null });
const regs = [r("2", "2026-09-01", 78.5), r("1", "2026-08-01", 82), r("3", "2026-10-01", 75.2, 80)];

test("série ordena por data e ignora vazios", () => {
  assert.deepEqual(serie(regs, "weight_kg").map((p) => p.valor), [82, 78.5, 75.2]);
  assert.deepEqual(serie(regs, "waist_cm"), [{ data: "2026-10-01", valor: 80 }]);
});

test("resumo: primeiro, último e variação", () => {
  assert.deepEqual(resumo(regs, "weight_kg"), { primeiro: 82, ultimo: 75.2, variacao: -6.8, quantidade: 3 });
  assert.equal(resumo(regs, "hip_cm"), null);
});

test("IMC", () => {
  assert.equal(imc(70, 165), 25.7);
  assert.equal(imc(null, 165), null);
  assert.equal(imc(70, null), null);
});

test("ler registro: vírgula, limites e campos vazios", () => {
  const base = { data: "2026-10-10", weight_kg: "", body_fat_pct: "", waist_cm: "", hip_cm: "" };
  assert.deepEqual(lerRegistro({ ...base, weight_kg: "72,4", waist_cm: "80" }, "2026-10-14"), { dados: { measured_on: "2026-10-10", weight_kg: 72.4, body_fat_pct: null, waist_cm: 80, hip_cm: null } });
  assert.ok("erro" in lerRegistro(base, "2026-10-14"));
  assert.ok("erro" in lerRegistro({ ...base, weight_kg: "5" }, "2026-10-14"));
  assert.ok("erro" in lerRegistro({ ...base, weight_kg: "abc" }, "2026-10-14"));
  assert.ok("erro" in lerRegistro({ ...base, data: "2027-01-01", weight_kg: "70" }, "2026-10-14"));
  assert.ok("erro" in lerRegistro({ ...base, data: "", weight_kg: "70" }, "2026-10-14"));
});
