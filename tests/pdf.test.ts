import test from "node:test";
import assert from "node:assert/strict";
import { comPadrao } from "../src/lib/rodapePdf.ts";
import { idadeEm, lerSvgVetorial, montarDadosPdf, nomeDoArquivoPdf, OPCOES_PADRAO, type EntradaPdf } from "../src/lib/pdfDieta.ts";

const item = (id: string, meal_id: string, name: string, g: number, kcal: number, p: number, l: number, c: number, position = 0) => ({
  id, meal_id, food_id: null, name, quantity_g: g, kcal, protein_g: p, fat_g: l, carb_g: c, fiber_g: 1, position,
});

const entrada = (over: Partial<EntradaPdf> = {}): EntradaPdf => ({
  clinica: "Ayllus Nutrição",
  nutricionista: "Dra. Helena",
  paciente: { full_name: "Maria Silva", birth_date: "1996-09-23", weight_kg: 70, height_cm: 165 },
  dieta: { title: "Plano alimentar", objective: "  Emagrecimento gradual  ", supplements: "Whey", recipes: null, target_kcal: 1500, target_protein_gkg: 1.6, target_fat_gkg: null, target_carb_gkg: null },
  refeicoes: [
    { id: "r2", meal_name: "Almoço", meal_time: "12:30:00", notes: null, position: 1 },
    { id: "r1", meal_name: "Café da manhã", meal_time: "07:30:00", notes: " pode trocar o pão ", position: 0 },
  ],
  itens: [
    item("i1", "r1", "Pão, integral", 50, 125, 4.7, 1.9, 25, 1), item("i2", "r1", "Ovo, cozido", 100, 146, 13.3, 9.5, 0.6, 0),
    item("i3", "r2", "Arroz, integral, cozido", 150, 186, 3.9, 1.5, 38.7), item("i9", "r-outra-dieta", "Não deve aparecer", 10, 10, 1, 1, 1),
  ],
  opcoes: { ...OPCOES_PADRAO },
  agora: new Date(2026, 9, 5, 10, 0),
  logos: { isotipo: null, logotipo: null },
  rodape: comPadrao(null),
  ...over,
});

test("refeições saem na ordem da dieta, com horário HH:MM e itens na ordem; itens de outras dietas ficam de fora", () => {
  const d = montarDadosPdf(entrada());
  assert.deepEqual(d.refeicoes.map((r) => [r.nome, r.horario]), [["Café da manhã", "07:30"], ["Almoço", "12:30"]]);
  assert.deepEqual(d.refeicoes[0].itens.map((i) => i.nome), ["Ovo, cozido", "Pão, integral"]);
  assert.equal(d.refeicoes[0].notas, "pode trocar o pão");
  assert.equal(d.total.kcal, 457); // 125 + 146 + 186
  assert.equal(d.refeicoes[0].total.kcal, 271);
});

test("cabeçalho: nome, idade na data do PDF, objetivo sem espaços sobrando", () => {
  const d = montarDadosPdf(entrada());
  assert.equal(d.paciente.nome, "Maria Silva");
  assert.equal(d.paciente.idade, 30); // nasceu 23/09/1996; em 05/10/2026 já fez 30
  assert.equal(d.objetivo, "Emagrecimento gradual");
  assert.equal(montarDadosPdf(entrada({ paciente: { full_name: null, birth_date: null, weight_kg: null, height_cm: null } })).paciente.nome, "Paciente");
});

test("idade: antes e depois do aniversário", () => {
  assert.equal(idadeEm("1996-10-06", new Date(2026, 9, 5)), 29);
  assert.equal(idadeEm("1996-10-05", new Date(2026, 9, 5)), 30);
  assert.equal(idadeEm(null, new Date()), null);
  assert.equal(idadeEm("lixo", new Date()), null);
});

test("opções: análise, compras, suplementos e receitas só entram quando ligadas", () => {
  const padrao = montarDadosPdf(entrada());
  assert.equal(padrao.analise, null);
  assert.equal(padrao.compras, null);
  assert.equal(padrao.suplementos, "Whey");
  assert.equal(padrao.receitas, null); // ligado, mas a dieta não tem receitas
  const completo = montarDadosPdf(entrada({ opcoes: { ...OPCOES_PADRAO, comparacaoComMetas: true, listaDeCompras: true, suplementos: false } }));
  assert.ok(completo.analise && completo.analise.some((l) => l.rotulo === "Calorias totais" && l.teorico === 1500));
  assert.deepEqual(completo.compras?.map((c) => [c.nome, c.gramasSemana]), [["Arroz, integral, cozido", 1050], ["Ovo, cozido", 700], ["Pão, integral", 350]]);
  assert.equal(completo.suplementos, null);
});

test("dieta sem refeições gera dados vazios sem quebrar", () => {
  const d = montarDadosPdf(entrada({ refeicoes: [], itens: [] }));
  assert.equal(d.refeicoes.length, 0);
  assert.equal(d.total.kcal, 0);
  assert.equal(d.distribuicao.totalKcal, 0);
});

test("nome do arquivo: sem acento, com data e sem caracteres perigosos", () => {
  assert.equal(nomeDoArquivoPdf("Maria da Conceição Silva", new Date(2026, 9, 5)), "Plano-alimentar-maria-da-conceicao-silva-2026-10-05.pdf");
  assert.equal(nomeDoArquivoPdf("../../etc/passwd", new Date(2026, 0, 2)), "Plano-alimentar-etc-passwd-2026-01-02.pdf");
  assert.equal(nomeDoArquivoPdf("???", new Date(2026, 0, 2)), "Plano-alimentar-paciente-2026-01-02.pdf");
});

test("SVG vetorial: lê viewBox, paths e polígonos", () => {
  const svg = '<svg viewBox="-20 30 400 200" fill="#A6814A"><path d="M0 0L10 10z"/><polygon points="1,2 3,4 5,6"/><path d="M5 5h2"/></svg>';
  const l = lerSvgVetorial(svg)!;
  assert.deepEqual([l.largura, l.altura, l.formas.length], [400, 200, 3]);
  assert.deepEqual(l.formas[1], { tipo: "polygon", pontos: "1,2 3,4 5,6" });
  assert.equal(lerSvgVetorial("<svg></svg>"), null);
  assert.equal(lerSvgVetorial('<svg viewBox="0 0 10 10"></svg>'), null);
});

test("rodapé do PDF: 4 linhas da clínica à esquerda e, se houver, a assinatura com medidas proporcionais", () => {
  const sem = montarDadosPdf(entrada());
  assert.deepEqual(sem.rodape.linhas, ["Clínica Ayllus | Nutricionista Mariana Fernandes", "CRN3 61672", "Tel.:(11) 91365-7788", "E-mail: nutri.marianafernandes@gmail.com"]);
  assert.equal(sem.rodape.assinatura, null);
  assert.equal(sem.rodape.assinaturaMedidas, null);
  const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFgAAAAwCAYAAAC";
  const com = montarDadosPdf(entrada({ rodape: { ...comPadrao(null), signature_data: PNG } }));
  assert.equal(com.rodape.assinatura, PNG);
  assert.deepEqual(com.rodape.assinaturaMedidas, { largura: 88, altura: 48 }); // PNG 0x58 x 0x30 = 88 x 48
  // imagem inválida (WebP) é ignorada em vez de quebrar o PDF
  assert.equal(montarDadosPdf(entrada({ rodape: { ...comPadrao(null), signature_data: "data:image/webp;base64,AAAA" } })).rodape.assinatura, null);
});

test("PDF: substitutos entram abaixo de cada alimento e podem ser desligados", () => {
  const base = {
    clinica: "Ayllus", nutricionista: null,
    paciente: { full_name: "Ana", birth_date: null, weight_kg: null, height_cm: null },
    dieta: { title: "Plano", objective: null, supplements: null, recipes: null, target_kcal: null, target_protein_gkg: null, target_fat_gkg: null, target_carb_gkg: null },
    refeicoes: [{ id: "r1", meal_name: "Café", meal_time: null, notes: null, position: 0 }],
    itens: [{ id: "i1", meal_id: "r1", food_id: null, name: "Pão", quantity_g: 50, kcal: 130, protein_g: 4, fat_g: 1, carb_g: 25, fiber_g: 1, position: 0 }],
    substitutos: [
      { item_id: "i1", name: "Tapioca", quantity_g: 40, position: 1 },
      { item_id: "i1", name: "Cuscuz", quantity_g: 90, position: 0 },
      { item_id: "outro", name: "Banana", quantity_g: 100, position: 0 },
    ],
    agora: new Date(2026, 9, 5), logos: { isotipo: null, logotipo: null },
    rodape: { nome: "", crn: "", telefone: "", email: "", assinatura: null },
  } as unknown as EntradaPdf;
  const com = montarDadosPdf({ ...base, opcoes: { ...OPCOES_PADRAO, substitutos: true } });
  assert.deepEqual(com.refeicoes[0].itens[0].substitutos, [{ nome: "Cuscuz", gramas: 90 }, { nome: "Tapioca", gramas: 40 }]);
  const sem = montarDadosPdf({ ...base, opcoes: { ...OPCOES_PADRAO, substitutos: false } });
  assert.deepEqual(sem.refeicoes[0].itens[0].substitutos, []);
  const semDados = montarDadosPdf({ ...base, substitutos: undefined, opcoes: OPCOES_PADRAO });
  assert.deepEqual(semDados.refeicoes[0].itens[0].substitutos, []);
});
