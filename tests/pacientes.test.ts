import { test } from "node:test";
import assert from "node:assert/strict";
import { decidirVinculo, mesmoTelefone, normalizaTelefone, nomeCompativel, tipoDaConsulta, tituloDoEvento } from "../src/core/pacientes.ts";

const form = { nome: "Ana", sobrenome: "Souza", email: "Ana@x.com", celular: "(11) 91234-5678", nascimento: "1990-05-10" };
const ana = { id: "p1", nome: "Ana Paula Souza", email: "ana@x.com", telefone: "11912345678", nascimento: "1990-05-10" };

test("telefone: normaliza e compara", () => {
  assert.equal(normalizaTelefone("+55 (11) 91234-5678"), "11912345678");
  assert.ok(mesmoTelefone("11912345678", "(11) 91234-5678"));
  assert.ok(!mesmoTelefone("11912345678", "21912345678"));
  assert.ok(!mesmoTelefone("123", "123"));
});

test("nome: ignora acento e caixa", () => {
  assert.ok(nomeCompativel("Ana Paula", "ana souza"));
  assert.ok(nomeCompativel("Ânâ", "Ana"));
  assert.ok(!nomeCompativel("Maria", "Ana Souza"));
  assert.ok(nomeCompativel(null, "Ana"));
});

test("mesmo e-mail e dados compatíveis liga", () => {
  assert.deepEqual(decidirVinculo(form, [ana]), { tipo: "vinculado", pacienteId: "p1" });
});

test("mesmo e-mail com nascimento diferente vai para revisão", () => {
  const r = decidirVinculo({ ...form, nascimento: "1991-01-01" }, [ana]);
  assert.deepEqual(r, { tipo: "revisar", motivo: "email_igual_dados_diferentes", sugeridoId: "p1" });
});

test("mesmo e-mail com nome diferente vai para revisão", () => {
  const r = decidirVinculo({ ...form, nome: "Carla" }, [ana]);
  assert.equal(r.tipo, "revisar");
});

test("e-mail diferente, telefone e nascimento iguais liga", () => {
  assert.deepEqual(decidirVinculo({ ...form, email: "outro@x.com" }, [ana]), { tipo: "vinculado", pacienteId: "p1" });
});

test("telefone igual sem nascimento igual vai para revisão", () => {
  const r = decidirVinculo({ ...form, email: "outro@x.com", nascimento: "1980-01-01" }, [ana]);
  assert.deepEqual(r, { tipo: "revisar", motivo: "telefone_igual", sugeridoId: "p1" });
});

test("vários pacientes com o mesmo telefone vai para revisão", () => {
  const r = decidirVinculo({ ...form, email: "outro@x.com" }, [ana, { ...ana, id: "p2" }]);
  assert.equal(r.tipo, "revisar");
});

test("sem ninguém parecido cria pré-cadastro", () => {
  assert.deepEqual(decidirVinculo(form, []), { tipo: "novo" });
  assert.deepEqual(decidirVinculo(form, [{ ...ana, email: "z@z.com", telefone: "21999990000" }]), { tipo: "novo" });
});

test("tipo da consulta e título do evento", () => {
  assert.equal(tipoDaConsulta({ jaAtendido: false, consultasRealizadasAntes: 0 }), "first");
  assert.equal(tipoDaConsulta({ jaAtendido: true, consultasRealizadasAntes: 0 }), "return");
  assert.equal(tipoDaConsulta({ jaAtendido: false, consultasRealizadasAntes: 2 }), "return");
  assert.equal(tituloDoEvento("Ana", "Souza", "first"), "[1ª consulta] Ana Souza");
  assert.equal(tituloDoEvento("Ana", "Souza", null), "Ana Souza");
});
