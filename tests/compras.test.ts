import { test } from "node:test";
import assert from "node:assert/strict";
import { chaveDeCompra, formatarQuantidade, guardarMarcados, lerMarcados } from "../src/lib/compras.ts";

test("marcações: ida e volta e tolerância a lixo", () => {
  const m = new Set([chaveDeCompra(" Arroz, cozido "), "banana"]);
  assert.deepEqual([...lerMarcados(guardarMarcados(m))], ["arroz, cozido", "banana"]);
  assert.equal(lerMarcados(null).size, 0);
  assert.equal(lerMarcados("{não é json").size, 0);
  assert.equal(lerMarcados('{"a":1}').size, 0);
  assert.deepEqual([...lerMarcados('["a", 3, "b"]')], ["a", "b"]);
});

test("quantidade legível", () => {
  assert.equal(formatarQuantidade(450), "450 g");
  assert.equal(formatarQuantidade(3150), "3,15 kg");
  assert.equal(formatarQuantidade(1000), "1 kg");
});
