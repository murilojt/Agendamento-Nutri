import { test } from "node:test";
import assert from "node:assert/strict";
import { gerarSenhaProvisoria, validarSenhaNova } from "../src/lib/senha.ts";

test("senha provisória: tamanho, alfabeto sem caracteres ambíguos e variação", () => {
  const vistas = new Set<string>();
  for (let i = 0; i < 200; i++) {
    const s = gerarSenhaProvisoria();
    assert.equal(s.length, 10);
    assert.match(s, /^[a-km-np-zA-HJ-NP-Z2-9]+$/);
    vistas.add(s);
  }
  assert.ok(vistas.size > 190);
  assert.equal(gerarSenhaProvisoria(14).length, 14);
});

test("senha provisória: valores enviesados do sorteio são descartados", () => {
  // 255 é descartado (acima do limite); 0 vira a primeira letra do alfabeto
  assert.equal(gerarSenhaProvisoria(2, () => [255, 0, 255, 1]), "ab");
});

test("validação da senha nova", () => {
  assert.match(validarSenhaNova("curta", "curta") ?? "", /pelo menos 8/);
  assert.match(validarSenhaNova("senhaboa123", "outra12345") ?? "", /não coincidem/);
  assert.match(validarSenhaNova("provisoria1", "provisoria1", "provisoria1") ?? "", /diferente/);
  assert.equal(validarSenhaNova("senhaboa123", "senhaboa123", "provisoria1"), null);
});
