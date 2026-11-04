import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularMarmitas, lerPorcoes, refeicoesIniciais } from "../src/lib/marmitas.ts";

const refs = [{ id: "m1", meal_name: "Café da manhã" }, { id: "m2", meal_name: "Almoço" }, { id: "m3", meal_name: "Jantar" }];
const itens = [
  { meal_id: "m1", name: "Pão", quantity_g: 50, kcal: 126 },
  { meal_id: "m2", name: "Arroz", quantity_g: 100, kcal: 130 },
  { meal_id: "m2", name: "Frango", quantity_g: 100, kcal: 159 },
  { meal_id: "m2", name: "Brócolis", quantity_g: 50, kcal: 17 },
  { meal_id: "m3", name: "arroz ", quantity_g: 80, kcal: 104 },
  { meal_id: "m3", name: "Ovo", quantity_g: 100, kcal: 146 },
];

test("o exemplo: 7 almoços = 700 g de arroz, 700 g de frango, 350 g de brócolis", () => {
  const r = calcularMarmitas(refs, itens, ["m2"], 7);
  assert.deepEqual(r.total.map((l) => [l.nome, l.gramasTotal]), [["Arroz", 700], ["Brócolis", 350], ["Frango", 700]]);
  assert.equal(r.porRefeicao[0].kcalPorPorcao, 306);
});

test("almoço e jantar juntos somam o mesmo alimento (arroz 100 + 80 por dia × 14)", () => {
  const r = calcularMarmitas(refs, itens, ["m2", "m3"], 14);
  const arroz = r.total.find((l) => l.nome === "Arroz")!;
  assert.equal(arroz.gramasPorPorcao, 180);
  assert.equal(arroz.gramasTotal, 2520);
  assert.equal(r.porRefeicao.length, 2);
  assert.equal(r.kcalPorDia, 306 + 250);
});

test("refeição não escolhida fica de fora; sem escolha, resultado vazio", () => {
  assert.ok(!calcularMarmitas(refs, itens, ["m2"], 7).total.some((l) => l.nome === "Pão"));
  assert.equal(calcularMarmitas(refs, itens, [], 7).total.length, 0);
});

test("leitura do número de marmitas", () => {
  assert.equal(lerPorcoes("7"), 7);
  assert.equal(lerPorcoes(" 30 "), 30);
  for (const ruim of ["", "0", "-3", "2,5", "abc", "91", "1e3"]) assert.equal(lerPorcoes(ruim), null, ruim);
});

test("escolha inicial: almoço e jantar; sem eles, todas", () => {
  assert.deepEqual(refeicoesIniciais(refs), ["m2", "m3"]);
  assert.deepEqual(refeicoesIniciais([{ id: "a", meal_name: "Lanche" }, { id: "b", meal_name: "Ceia" }]), ["a", "b"]);
});
