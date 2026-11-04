import { test } from "node:test";
import assert from "node:assert/strict";
import { gramasDe, lerQuantidade, qtdEm, quantidadeEmTexto, quantidadeParaMostrar, textoDaMedida, validarMedida } from "../src/lib/medidas.ts";

const colher = { name: "colher de sopa", plural: "colheres de sopa", grams: 25 };

test("conversão entre unidades e gramas", () => {
  assert.equal(gramasDe(2, colher), 50);
  assert.equal(gramasDe(1.5, colher), 37.5);
  assert.equal(qtdEm(50, colher), 2);
  assert.equal(qtdEm(30, colher), 1.2);
});

test("texto: singular até menos de 2, plural a partir de 2", () => {
  assert.equal(textoDaMedida(1, colher), "1 colher de sopa");
  assert.equal(textoDaMedida(1.5, colher), "1,5 colher de sopa");
  assert.equal(textoDaMedida(2, colher), "2 colheres de sopa");
  assert.equal(textoDaMedida(3, { name: "pote", plural: null }), "3 pote");
});

test("quantidade para mostrar: com e sem medida caseira", () => {
  assert.deepEqual(quantidadeParaMostrar(100), { principal: "100 g", gramas: null });
  assert.deepEqual(quantidadeParaMostrar(100, { unit_name: null, unit_plural: null, unit_grams: null, unit_qty: null }), { principal: "100 g", gramas: null });
  const u = { unit_name: "colher de sopa", unit_plural: "colheres de sopa", unit_grams: 25, unit_qty: 4 };
  assert.deepEqual(quantidadeParaMostrar(100, u), { principal: "4 colheres de sopa", gramas: "100 g" });
  assert.equal(quantidadeEmTexto(100, u), "4 colheres de sopa (100 g)");
  // se as gramas mudaram depois (ex.: reescala), a unidade acompanha
  assert.equal(quantidadeEmTexto(50, u), "2 colheres de sopa (50 g)");
});

test("ler quantidade digitada", () => {
  assert.equal(lerQuantidade("2,5"), 2.5);
  assert.equal(lerQuantidade(" 3 "), 3);
  for (const ruim of ["", "0", "-1", "abc", "1e9"]) assert.equal(lerQuantidade(ruim), null, ruim);
});

test("validar medida nova", () => {
  assert.deepEqual(validarMedida("  colher  de sopa ", "colheres de sopa", "25,5"), { medida: { name: "colher de sopa", plural: "colheres de sopa", grams: 25.5 } });
  assert.deepEqual(validarMedida("fatia", "", "30"), { medida: { name: "fatia", plural: null, grams: 30 } });
  assert.ok("erro" in validarMedida("a", "", "30"));
  assert.ok("erro" in validarMedida("fatia", "", "0"));
});
