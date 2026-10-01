import test from "node:test";
import assert from "node:assert/strict";
import {
  prioridadeDoAlimento, lerAlimentosJson, lerArquivoAlimentos, resumoPorCategoria, limparNome, analisar, buscarAlimentos, distribuicao, kcalNaoProteicaPorGN, lerCsvAlimentos, listaDeCompras, macrosDaPorcao, metaTeorica, reescalar, somar,
} from "../src/lib/nutricao.ts";

const arroz = { kcal: 128, protein_g: 2.5, fat_g: 0.2, carb_g: 28.1, fiber_g: 1.6 };

test("porção: 150 g de um alimento com valores por 100 g", () => {
  assert.deepEqual(macrosDaPorcao(arroz, 150), { kcal: 192, protein_g: 3.75, fat_g: 0.3, carb_g: 42.15, fiber_g: 2.4 });
});

test("reescalar mantém a proporção sem consultar o banco", () => {
  const item = { ...macrosDaPorcao(arroz, 100), quantity_g: 100 };
  assert.deepEqual(reescalar(item, 250), macrosDaPorcao(arroz, 250));
  assert.deepEqual(reescalar({ ...item, quantity_g: 0 }, 50), { kcal: 0, protein_g: 0, fat_g: 0, carb_g: 0, fiber_g: 0 });
});

test("somar totais e tolerar números vindos como texto do banco", () => {
  const s = somar([macrosDaPorcao(arroz, 100), { kcal: "10" as unknown as number, protein_g: 1, fat_g: 0, carb_g: 2, fiber_g: 0 }]);
  assert.equal(s.kcal, 138);
  assert.equal(s.protein_g, 3.5);
});

test("distribuição calórica soma ~100% e usa 4/4/9", () => {
  const d = distribuicao({ kcal: 0, protein_g: 105.1, fat_g: 32.2, carb_g: 158, fiber_g: 9.2 });
  assert.equal(d.proteina.kcal, 420.4);
  assert.equal(d.carboidrato.kcal, 632);
  assert.equal(d.lipidio.kcal, 289.8);
  assert.ok(Math.abs(d.proteina.pct + d.carboidrato.pct + d.lipidio.pct - 100) < 0.2);
  assert.equal(distribuicao({ kcal: 0, protein_g: 0, fat_g: 0, carb_g: 0, fiber_g: 0 }).proteina.pct, 0);
});

test("meta teórica: g/kg × peso; sem peso não inventa número", () => {
  const p = { target_kcal: null, target_protein_gkg: 1.6, target_fat_gkg: 0.9, target_carb_gkg: 2.0 };
  assert.deepEqual(metaTeorica(p, 70), { kcal: 1575, protein_g: 112, fat_g: 63, carb_g: 140 }); // 112×4 + 140×4 + 63×9
});

test("kcal não proteica por grama de nitrogênio", () => {
  // 1328 kcal, 105.1 g de proteína -> (1328 - 420.4) / (105.1 / 6.25) = 53.97...
  const v = kcalNaoProteicaPorGN({ kcal: 1328, protein_g: 105.1, fat_g: 0, carb_g: 0, fiber_g: 0 });
  assert.equal(v, 54);
  assert.equal(kcalNaoProteicaPorGN({ kcal: 100, protein_g: 0, fat_g: 0, carb_g: 0, fiber_g: 0 }), null);
});

test("análise: prescrito vs teórico, diferença e g/kg", () => {
  const pres = { kcal: 1328, protein_g: 105.1, fat_g: 32.2, carb_g: 158, fiber_g: 9.2 };
  const linhas = analisar(pres, { target_kcal: 1752, target_protein_gkg: 1.6, target_fat_gkg: null, target_carb_gkg: null }, 88.4, 1400);
  const prot = linhas.find((l) => l.rotulo === "Proteínas totais")!;
  assert.equal(prot.teorico, 141.4);
  assert.equal(prot.diferenca, -36.3);
  assert.equal(prot.prescritoPorKg, 1.19);
  const kcal = linhas.find((l) => l.rotulo === "Calorias totais")!;
  assert.equal(kcal.diferenca, -424);
  assert.equal(linhas.find((l) => l.rotulo === "Carboidratos livres")!.prescrito, 148.8);
  assert.equal(linhas.find((l) => l.rotulo === "Densidade calórica")!.prescrito, 0.95);
  const semPeso = analisar(pres, { target_kcal: null, target_protein_gkg: 1.6, target_fat_gkg: null, target_carb_gkg: null }, null, 0);
  assert.equal(semPeso[0].teorico, null);
  assert.equal(semPeso.at(-1)!.prescrito, null);
});

test("lista de compras soma por alimento e multiplica por 7", () => {
  const l = listaDeCompras([
    { name: "Arroz, cozido", quantity_g: 100 }, { name: "arroz, cozido ", quantity_g: 150 }, { name: "Ovo", quantity_g: 50 },
  ]);
  assert.deepEqual(l, [{ nome: "Arroz, cozido", gramasDia: 250, gramasSemana: 1750 }, { nome: "Ovo", gramasDia: 50, gramasSemana: 350 }]);
});

test("busca ignora acento e exige todas as palavras", () => {
  const base = [{ name: "Feijão, carioca, cozido" }, { name: "Feijão, preto, cozido" }, { name: "Arroz, cozido" }, { name: "Maçã" }];
  assert.equal(buscarAlimentos(base, "feijao cozido").length, 2);
  assert.equal(buscarAlimentos(base, "maca")[0].name, "Maçã");
  assert.equal(buscarAlimentos(base, "  ").length, 0);
  assert.equal(buscarAlimentos(base, "carioca")[0].name, "Feijão, carioca, cozido");
});

test("CSV no formato da TACO (; e vírgula decimal, Tr/NA)", () => {
  const csv = "Alimento;Energia (kcal);Proteína (g);Lipídeos (g);Carboidrato (g);Fibra Alimentar (g)\n" +
    'Arroz, integral, cozido;124;2,6;1,0;25,8;2,7\n"Bolo, simples";"313";"5,4";"7,2";"54,0";"Tr"\nSem número;abc;1;1;1;1\n';
  const r = lerCsvAlimentos(csv);
  assert.equal(r.alimentos.length, 2);
  assert.deepEqual(r.alimentos[0], { name: "Arroz, integral, cozido", kcal: 124, protein_g: 2.6, fat_g: 1, carb_g: 25.8, fiber_g: 2.7 });
  assert.equal(r.alimentos[1].fiber_g, 0);
  assert.equal(r.erros.length, 1);
  assert.match(r.erros[0], /Linha 4/);
});

test("CSV com cabeçalho incompleto devolve erro claro", () => {
  const r = lerCsvAlimentos("Alimento;Energia\nArroz;100");
  assert.equal(r.alimentos.length, 0);
  assert.match(r.erros[0], /colunas/);
});

test("meta teórica sem peso devolve nulos", () => {
  const m = metaTeorica({ target_kcal: null, target_protein_gkg: 1.6, target_fat_gkg: 0.9, target_carb_gkg: 2 }, null);
  assert.deepEqual(m, { kcal: null, protein_g: null, fat_g: null, carb_g: null });
  assert.equal(metaTeorica({ target_kcal: 1800, target_protein_gkg: null, target_fat_gkg: null, target_carb_gkg: null }, null).kcal, 1800);
});

test("CSV da TACO completa: usa a descrição (e não o número) como nome e a energia em kcal (não kJ)", () => {
  const csv = "Número do Alimento;Categoria do alimento;Descrição dos alimentos;Umidade (%);Energia (kcal);Energia (kJ);Proteína (g);Lipídeos (g);Colesterol (mg);Carboidrato (g);Fibra Alimentar (g);Cinzas (g)\n" +
    "1;Cereais e derivados;Arroz, integral, cozido;70,1;124;517;2,6;1;NA;25,8;2,7;0,5\n" +
    "3;Cereais e derivados;Arroz, tipo 1, cozido;69,1;128;537;2,5;0,2;NA;28,1;1,6;0,1\n" +
    "10;Cereais e derivados;Bolo, pronto, chocolate;22,4;410;1715;6,2;18,3;NA;61,0;Tr;1,2\n";
  const r = lerCsvAlimentos(csv);
  assert.equal(r.erros.length, 0);
  assert.deepEqual(r.alimentos.map((a) => a.name), ["Arroz, integral, cozido", "Arroz, tipo 1, cozido", "Bolo, pronto, chocolate"]);
  assert.deepEqual(r.alimentos[0], { name: "Arroz, integral, cozido", category: "Cereais e derivados", kcal: 124, protein_g: 2.6, fat_g: 1, carb_g: 25.8, fiber_g: 2.7 });
  assert.equal(r.alimentos[2].fiber_g, 0);
});

test("CSV simples com coluna chamada só 'Nome' continua funcionando", () => {
  const r = lerCsvAlimentos("Nome;kcal;Proteína;Lipídios;Carboidratos\nPão;250;8;3;50\n");
  assert.deepEqual(r.alimentos, [{ name: "Pão", kcal: 250, protein_g: 8, fat_g: 3, carb_g: 50, fiber_g: 0 }]);
});

test("planilha cujos nomes são só números é recusada com aviso claro", () => {
  const r = lerCsvAlimentos("Nome;kcal;Proteína;Lipídios;Carboidratos\n1;100;1;1;1\n2;120;2;2;2\n");
  assert.equal(r.alimentos.length, 0);
  assert.match(r.erros[0], /parecem números/);
});

/* ---------------- TBCA (JSON) ---------------- */

const reg = (codigo: string, classe: string, descricao: string, kcal: string, p: string, l: string, ct: string, f: string) =>
  JSON.stringify({ codigo, classe, descricao, nutrientes: [
    { Componente: "Energia", Unidades: "kJ", "Valor por 100g": String(Math.round(parseFloat(kcal.replace(",", ".")) * 4.184)) },
    { Componente: "Energia", Unidades: "kcal", "Valor por 100g": kcal },
    { Componente: "Umidade", Unidades: "g", "Valor por 100g": "60,0" },
    { Componente: "Carboidrato total", Unidades: "g", "Valor por 100g": ct },
    { Componente: "Carboidrato disponível", Unidades: "g", "Valor por 100g": "1,0" },
    { Componente: "Proteína", Unidades: "g", "Valor por 100g": p },
    { Componente: "Lipídios", Unidades: "g", "Valor por 100g": l },
    { Componente: "Fibra alimentar", Unidades: "g", "Valor por 100g": f },
  ] });

test("TBCA: lê JSON por linha, usa kcal e carboidrato total, limpa a vírgula final", () => {
  const txt = reg("C0016A", "Cereais e derivados", "Arroz, integral, cozido, s/ sal, s/ óleo, Orysa sativa L.,", "108", "2,44", "0,87", "23,5", "2,12") + "\n" +
    reg("C0906B", "Vegetais e derivados", "Tapioca, sem manteiga, sem recheio,", "289", "0,36", "tr", "71,9", "NA") + "\n";
  const r = lerAlimentosJson(txt);
  assert.equal(r.origem, "tbca");
  assert.equal(r.erros.length, 0);
  assert.deepEqual(r.alimentos[0], { name: "Arroz, integral, cozido, s/ sal, s/ óleo, Orysa sativa L.", code: "C0016A", category: "Cereais e derivados", kcal: 108, protein_g: 2.44, fat_g: 0.87, carb_g: 23.5, fiber_g: 2.12 });
  assert.equal(r.alimentos[1].fat_g, 0); // "tr"
  assert.equal(r.alimentos[1].fiber_g, 0); // "NA"
});

test("TBCA: nome repetido ganha o código; macros impossíveis são ignorados com aviso", () => {
  const txt = [
    reg("C1", "Cereais e derivados", "Bolo, simples,", "300", "5", "10", "50", "1"),
    reg("C2", "Cereais e derivados", "Bolo, simples,", "310", "5", "11", "50", "1"),
    reg("C3", "Cereais e derivados", "Biscoito impossível", "400", "40", "40", "40", "1"),
  ].join("\n");
  const r = lerAlimentosJson(txt);
  assert.deepEqual(r.alimentos.map((a) => a.name), ["Bolo, simples [C1]", "Bolo, simples [C2]"]);
  assert.ok(r.avisos.some((a) => /impossíveis/.test(a)) && r.avisos.some((a) => /repetido/.test(a)));
});

test("TBCA: categorias escritas de dois jeitos viram uma só e há resumo por categoria", () => {
  const txt = [reg("C1", "Pescados e Frutos do mar", "Atum", "100", "20", "1", "0", "0"), reg("C2", "Pescados e Frutos do mar", "Sardinha", "150", "20", "8", "0", "0"), reg("C3", "Pescados e frutos do mar", "Camarão", "90", "18", "1", "0", "0"), reg("C4", "Bebidas", "Suco", "40", "0", "0", "10", "0")].join("\n");
  const r = lerAlimentosJson(txt);
  assert.deepEqual(resumoPorCategoria(r.alimentos), [{ categoria: "Pescados e Frutos do mar", quantidade: 3 }, { categoria: "Bebidas", quantidade: 1 }]);
});

test("TBCA: aceita lista JSON, BOM e linha com defeito sem derrubar o resto", () => {
  const lista = "\uFEFF[" + [reg("C1", "Bebidas", "Suco", "40", "0", "0", "10", "0"), reg("C2", "Bebidas", "Chá", "1", "0", "0", "0,3", "0")].join(",") + "]";
  assert.equal(lerArquivoAlimentos(lista).alimentos.length, 2);
  const mista = reg("C1", "Bebidas", "Suco", "40", "0", "0", "10", "0") + "\n{linha quebrada\n" + reg("C2", "Bebidas", "Chá", "1", "0", "0", "0,3", "0");
  const r = lerArquivoAlimentos(mista);
  assert.equal(r.alimentos.length, 2);
  assert.match(r.erros[0], /Linha 2/);
});

test("lerArquivoAlimentos: CSV continua indo para o leitor de CSV", () => {
  const r = lerArquivoAlimentos("Alimento;Energia (kcal);Proteína (g);Lipídeos (g);Carboidrato (g)\nPão;250;8;3;50\n");
  assert.equal(r.origem, "taco");
  assert.equal(r.alimentos[0].name, "Pão");
});

test("limparNome tira vírgula final e espaços repetidos", () => {
  assert.equal(limparNome("  Arroz,   integral ,, "), "Arroz, integral");
});

test("busca: favoritos e mais usados vêm antes da regra de texto", () => {
  const base = [
    { id: "a", name: "Arroz, farelo, cru" }, { id: "b", name: "Arroz, integral, cozido, s/ sal" }, { id: "c", name: "Arroz, polido, cozido", favorite: true }, { id: "d", name: "Arroz, tipo 2, cozido" },
  ];
  const uso = new Map([["d", 7]]);
  const nomes = buscarAlimentos(base, "arroz", 10, (a) => prioridadeDoAlimento(a, uso)).map((a) => a.id);
  assert.deepEqual(nomes.slice(0, 2), ["c", "d"]); // favorito, depois o mais usado
  const semPrioridade = buscarAlimentos(base, "arroz", 10).map((a) => a.id);
  assert.deepEqual([...semPrioridade.slice(0, 2)].sort(), ["c", "d"]); // regra: cozido simples primeiro
  assert.equal(semPrioridade[2], "b"); // cozido com detalhe de preparo (s/ sal)
  assert.equal(semPrioridade[3], "a"); // cru por último
});
