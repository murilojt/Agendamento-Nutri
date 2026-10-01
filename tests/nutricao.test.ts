import test from "node:test";
import assert from "node:assert/strict";
import {
  analisar, buscarAlimentos, distribuicao, kcalNaoProteicaPorGN, lerCsvAlimentos, listaDeCompras, macrosDaPorcao, metaTeorica, reescalar, somar,
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
  assert.deepEqual(r.alimentos[0], { name: "Arroz, integral, cozido", kcal: 124, protein_g: 2.6, fat_g: 1, carb_g: 25.8, fiber_g: 2.7 });
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
