/**
 * Cálculos nutricionais do montador de dietas.
 * Funções puras (sem React e sem Supabase) para poderem ser testadas.
 * Energia: proteína 4 kcal/g, carboidrato 4 kcal/g, lipídio 9 kcal/g.
 */

export type Macros = { kcal: number; protein_g: number; fat_g: number; carb_g: number; fiber_g: number };

export type Alimento = Macros & { id: string; name: string; source: string; category?: string | null; favorite?: boolean }; // valores por 100 g

export type ItemRefeicao = Macros & {
  id: string;
  meal_id: string;
  food_id: string | null;
  name: string;
  quantity_g: number;
  position: number;
};

export const ZERO: Macros = { kcal: 0, protein_g: 0, fat_g: 0, carb_g: 0, fiber_g: 0 };

const CAMPOS = ["kcal", "protein_g", "fat_g", "carb_g", "fiber_g"] as const;

const arredonda = (n: number, casas = 2) => Math.round((n + Number.EPSILON) * 10 ** casas) / 10 ** casas;

/** Valores de uma porção de `gramas` de um alimento (o banco guarda por 100 g). */
export function macrosDaPorcao(alimento: Macros, gramas: number): Macros {
  const f = gramas / 100;
  return {
    kcal: arredonda(alimento.kcal * f),
    protein_g: arredonda(alimento.protein_g * f),
    fat_g: arredonda(alimento.fat_g * f),
    carb_g: arredonda(alimento.carb_g * f),
    fiber_g: arredonda(alimento.fiber_g * f),
  };
}

/** Gramas de um alimento (valores por 100 g) que dão as mesmas calorias que `kcalAlvo`, arredondadas para 5 g. Null se o alimento não tem calorias. */
export function gramasParaMesmasKcal(alimento: Pick<Macros, "kcal">, kcalAlvo: number): number | null {
  if (!(alimento.kcal > 0) || !(kcalAlvo > 0)) return null;
  return Math.max(5, Math.round(((kcalAlvo / alimento.kcal) * 100) / 5) * 5);
}

/** Muda a quantidade de um item já salvo, mantendo a proporção (sem precisar do banco de alimentos). */
export function reescalar(item: Macros & { quantity_g: number }, novaQuantidade: number): Macros {
  if (item.quantity_g <= 0) return { ...ZERO };
  const f = novaQuantidade / item.quantity_g;
  return {
    kcal: arredonda(item.kcal * f),
    protein_g: arredonda(item.protein_g * f),
    fat_g: arredonda(item.fat_g * f),
    carb_g: arredonda(item.carb_g * f),
    fiber_g: arredonda(item.fiber_g * f),
  };
}

export function somar(itens: Macros[]): Macros {
  const t = { ...ZERO };
  for (const i of itens) for (const c of CAMPOS) t[c] += Number(i[c]) || 0;
  for (const c of CAMPOS) t[c] = arredonda(t[c]);
  return t;
}

/** Distribuição calórica dos macronutrientes (Atwater). Percentuais somam ~100. */
export function distribuicao(m: Macros) {
  const p = m.protein_g * 4;
  const c = m.carb_g * 4;
  const l = m.fat_g * 9;
  const total = p + c + l;
  const pct = (x: number) => (total > 0 ? arredonda((x / total) * 100, 1) : 0);
  return {
    proteina: { kcal: arredonda(p, 1), pct: pct(p) },
    carboidrato: { kcal: arredonda(c, 1), pct: pct(c) },
    lipidio: { kcal: arredonda(l, 1), pct: pct(l) },
    totalKcal: arredonda(total, 1),
  };
}

export type Protocolo = {
  target_kcal: number | null;
  target_protein_gkg: number | null;
  target_fat_gkg: number | null;
  target_carb_gkg: number | null;
};

/** Metas ("teórico") em gramas, a partir de g/kg × peso. Nulo quando falta meta ou peso. */
export function metaTeorica(p: Protocolo, pesoKg: number | null) {
  const g = (gkg: number | null) => (gkg != null && pesoKg ? arredonda(gkg * pesoKg, 1) : null);
  const protein_g = g(p.target_protein_gkg);
  const fat_g = g(p.target_fat_gkg);
  const carb_g = g(p.target_carb_gkg);

  // Sem meta calórica explícita, deriva das metas de macros (só se as três existirem)
  const derivada = protein_g != null && fat_g != null && carb_g != null ? arredonda(protein_g * 4 + carb_g * 4 + fat_g * 9, 0) : null;
  return { kcal: p.target_kcal ?? derivada, protein_g, fat_g, carb_g };
}

export type LinhaAnalise = {
  rotulo: string;
  prescrito: number | null;
  teorico: number | null;
  diferenca: number | null;
  unidade: string;
  /** g por kg de peso, quando há peso */
  prescritoPorKg?: number | null;
  teoricoPorKg?: number | null;
};

/** Kcal não proteica por grama de nitrogênio: (kcal − 4·proteína) ÷ (proteína ÷ 6,25). */
export function kcalNaoProteicaPorGN(m: Macros): number | null {
  if (m.protein_g <= 0) return null;
  return arredonda((m.kcal - m.protein_g * 4) / (m.protein_g / 6.25), 1);
}

export function analisar(prescrito: Macros, protocolo: Protocolo, pesoKg: number | null, massaTotalG: number): LinhaAnalise[] {
  const t = metaTeorica(protocolo, pesoKg);
  const porKg = (g: number | null) => (g != null && pesoKg ? arredonda(g / pesoKg, 2) : null);
  const dif = (a: number | null, b: number | null) => (a != null && b != null ? arredonda(a - b, 1) : null);
  const linha = (rotulo: string, p: number | null, te: number | null, unidade: string, kg = false): LinhaAnalise => ({
    rotulo,
    prescrito: p,
    teorico: te,
    diferenca: dif(p, te),
    unidade,
    ...(kg ? { prescritoPorKg: porKg(p), teoricoPorKg: porKg(te) } : {}),
  });

  const carbLivres = arredonda(prescrito.carb_g - prescrito.fiber_g, 1);
  return [
    linha("Proteínas totais", prescrito.protein_g, t.protein_g, "g", true),
    linha("Lipídios totais", prescrito.fat_g, t.fat_g, "g", true),
    linha("Carboidratos totais", prescrito.carb_g, t.carb_g, "g", true),
    linha("Fibras totais", prescrito.fiber_g, null, "g"),
    { ...linha("Carboidratos livres", carbLivres, null, "g", true), teorico: null, diferenca: null },
    linha("Calorias totais", prescrito.kcal, t.kcal, "kcal"),
    { rotulo: "Kcal não proteica / gN", prescrito: kcalNaoProteicaPorGN(prescrito), teorico: null, diferenca: null, unidade: "" },
    {
      rotulo: "Densidade calórica",
      prescrito: massaTotalG > 0 ? arredonda(prescrito.kcal / massaTotalG, 2) : null,
      teorico: null,
      diferenca: null,
      unidade: "kcal/g",
    },
  ];
}

export type LinhaCompra = { nome: string; gramasDia: number; gramasSemana: number };

/** Lista de compras: soma por alimento (ignora maiúsculas) das quantidades diárias; semana = ×7. */
export function listaDeCompras(itens: { name: string; quantity_g: number }[]): LinhaCompra[] {
  const mapa = new Map<string, LinhaCompra>();
  for (const i of itens) {
    const chave = i.name.trim().toLowerCase();
    const atual = mapa.get(chave) ?? { nome: i.name.trim(), gramasDia: 0, gramasSemana: 0 };
    atual.gramasDia = arredonda(atual.gramasDia + Number(i.quantity_g));
    atual.gramasSemana = arredonda(atual.gramasDia * 7);
    mapa.set(chave, atual);
  }
  return [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/**
 * Quanto menor a chave, mais "simples" e provável de ser o alimento procurado. Ordem de importância:
 * 1) o termo é o próprio nome do alimento (primeiro trecho antes da vírgula): "Arroz, ..." antes de "Arroz com cenoura";
 * 2) começa com o termo; 3) já preparado para comer (cozido, grelhado...) antes de cru e de farinhas/misturas;
 * 4) menos detalhes de preparo (c/ óleo, s/ sal...); 5) menos trechos; 6) nome mais curto.
 */
function chaveDeSimplicidade(nome: string, termo: string): string {
  const n = normaliza(nome);
  const t = normaliza(termo).trim();
  const primeiro = n.split(",")[0].trim();
  const nivelNome = primeiro === t ? 0 : n.startsWith(t) ? 1 : 2;
  const preparo = /\b(cozid|grelhad)/.test(n) ? 0 : /\b(cru|crua|crus|cruas)\b/.test(n) ? 1 : 2;
  const detalhes = (n.match(/\b[cs]\//g) ?? []).length;
  const trechos = (n.match(/,/g) ?? []).length;
  return [nivelNome, preparo, Math.min(detalhes, 9), Math.min(trechos, 9), String(n.length).padStart(4, "0")].join("");
}

/** Busca sem acento e sem diferenciar maiúsculas; todas as palavras digitadas precisam aparecer. */
export const normaliza = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function buscarAlimentos<T extends { name: string }>(todos: T[], termo: string, limite = 12, prioridade?: (a: T) => number): T[] {
  const palavras = normaliza(termo).split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return [];
  const achados = todos.filter((a) => {
    const n = normaliza(a.name);
    return palavras.every((p) => n.includes(p));
  });
  // Prioridade externa (favoritos e mais usados) vem antes da regra de texto
  achados.sort((a, b) => (prioridade ? prioridade(b) - prioridade(a) : 0) || chaveDeSimplicidade(a.name, termo).localeCompare(chaveDeSimplicidade(b.name, termo)));
  return achados.slice(0, limite);
}

/** Lê o CSV de alimentos (TACO ou similar): separador `;` ou `,`, decimal com vírgula ou ponto. */
export type AlimentoCsv = { name: string; category?: string } & Macros;

export function lerCsvAlimentos(texto: string): { alimentos: AlimentoCsv[]; erros: string[] } {
  const linhas = texto.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  const erros: string[] = [];
  if (linhas.length < 2) return { alimentos: [], erros: ["O arquivo precisa ter o cabeçalho e ao menos um alimento."] };

  const sep = (linhas[0].match(/;/g)?.length ?? 0) >= (linhas[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const separa = (l: string) => {
    const out: string[] = [];
    let atual = "";
    let aspas = false;
    for (const ch of l) {
      if (ch === '"') aspas = !aspas;
      else if (ch === sep && !aspas) {
        out.push(atual.trim());
        atual = "";
      } else atual += ch;
    }
    out.push(atual.trim());
    return out;
  };

  const cab = separa(linhas[0]).map(normaliza);
  // Procura por prioridade: cada termo é tentado em ordem, e colunas de apoio (número, categoria, kJ) são ignoradas.
  // Na TACO completa, "Número do Alimento" vem antes de "Descrição dos alimentos".
  const IGNORADAS = /numero|categoria|\(kj\)|\bkj\b/;
  const acha = (...nomes: string[]) => {
    for (const n of nomes) {
      const i = cab.findIndex((c) => !IGNORADAS.test(c) && c.includes(n));
      if (i >= 0) return i;
    }
    return -1;
  };
  const col = {
    name: acha("descricao", "nome", "alimento"),
    kcal: acha("kcal", "energia", "caloria"),
    protein_g: acha("proteina"),
    fat_g: acha("lipid", "gordura"),
    carb_g: acha("carboidrato", "carbo"),
    fiber_g: acha("fibra"),
  };
  const colCategoria = cab.findIndex((c) => c.startsWith("categoria") || c === "classe" || c === "grupo");
  const faltando = Object.entries(col).filter(([k, v]) => v < 0 && k !== "fiber_g").map(([k]) => k);
  if (faltando.length) {
    return { alimentos: [], erros: [`Não encontrei as colunas: ${faltando.join(", ")}. Use: Alimento; Energia (kcal); Proteína (g); Lipídeos (g); Carboidrato (g); Fibra (g).`] };
  }

  const num = (v: string | undefined) => {
    if (v == null) return 0;
    const t = v.trim().replace(/\s/g, "");
    if (t === "" || /^(na|tr|\*|-)$/i.test(t)) return 0; // "Tr" (traço) e "NA" da TACO
    const n = Number(t.includes(",") && !t.includes(".") ? t.replace(",", ".") : t.replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  };

  const alimentos: AlimentoCsv[] = [];
  linhas.slice(1).forEach((l, idx) => {
    const c = separa(l);
    const name = c[col.name]?.trim();
    if (!name) return;
    const a: AlimentoCsv = {
      name,
      kcal: num(c[col.kcal]),
      protein_g: num(c[col.protein_g]),
      fat_g: num(c[col.fat_g]),
      carb_g: num(c[col.carb_g]),
      fiber_g: col.fiber_g >= 0 ? num(c[col.fiber_g]) : 0,
      ...(colCategoria >= 0 && c[colCategoria]?.trim() ? { category: c[colCategoria].trim() } : {}),
    };
    if (CAMPOS.some((k) => Number.isNaN(a[k]) || a[k] < 0)) erros.push(`Linha ${idx + 2} (${name}): valor numérico inválido.`);
    else alimentos.push(a);
  });
  // Proteção contra planilha com a coluna errada: se a maioria dos "nomes" for só número, não importa nada.
  if (alimentos.length > 0 && alimentos.filter((a) => /^[\d.,\s]+$/.test(a.name)).length > alimentos.length / 2) {
    return { alimentos: [], erros: ["Os nomes dos alimentos parecem números. Confira se a coluna com o nome (ex.: \"Descrição dos alimentos\") está no arquivo."] };
  }
  return { alimentos, erros };
}

/* ------------------------------------------------------------------ */
/* Importação de alimentos (CSV da TACO, JSON da TBCA)                */
/* ------------------------------------------------------------------ */

export type AlimentoImportado = { name: string; category?: string; code?: string } & Macros;

export type LeituraAlimentos = {
  alimentos: AlimentoImportado[];
  erros: string[];
  avisos: string[];
  /** 'tbca' para JSON (uma linha por alimento ou lista); 'taco' para CSV */
  origem: "tbca" | "taco";
};

/** Nome do alimento sem a vírgula final e sem espaços repetidos (a TBCA termina os nomes com ","). */
export const limparNome = (s: string) => s.replace(/\s+/g, " ").trim().replace(/[,\s]+$/, "");

/** "Tr" (traço), "NA", "*" e vazio viram 0, como na TACO. Texto que não é número devolve NaN. */
function numeroTabela(v: unknown): number {
  if (v == null) return 0;
  const t = String(v).trim().replace(/\s/g, "");
  if (t === "" || /^(na|tr|\*|-|nd)$/i.test(t)) return 0;
  const n = Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
  return Number.isFinite(n) ? n : NaN;
}

type NutrienteJson = { Componente?: string; Unidades?: string; ["Valor por 100g"]?: string };

/**
 * Lê o JSON da TBCA: um objeto por linha ou uma lista inteira.
 * Cada alimento tem { codigo, classe, descricao, nutrientes: [{ Componente, Unidades, "Valor por 100g" }] }.
 * Carboidrato = "Carboidrato total" (mesma convenção da TACO, que inclui a fibra); energia em kcal.
 */
export function lerAlimentosJson(texto: string): LeituraAlimentos {
  const erros: string[] = [];
  const avisos: string[] = [];
  const bruto = texto.replace(/^﻿/, "").trim();
  let registros: unknown[] = [];

  if (bruto.startsWith("[")) {
    try {
      registros = JSON.parse(bruto);
    } catch {
      return { alimentos: [], erros: ["O arquivo JSON está incompleto ou com defeito."], avisos, origem: "tbca" };
    }
  } else {
    bruto.split(/\r?\n/).forEach((linha, i) => {
      if (!linha.trim()) return;
      try {
        registros.push(JSON.parse(linha));
      } catch {
        if (erros.length < 5) erros.push(`Linha ${i + 1}: JSON inválido.`);
      }
    });
  }

  const brutos: { code: string; category: string; name: string; m: Macros }[] = [];
  let ignoradosImpossiveis: string[] = [];
  let semEnergia = 0;

  for (const r of registros as Record<string, unknown>[]) {
    const desc = typeof r?.descricao === "string" ? limparNome(r.descricao) : "";
    const lista = Array.isArray(r?.nutrientes) ? (r.nutrientes as NutrienteJson[]) : null;
    if (!desc || !lista) continue;

    // primeira ocorrência de cada componente (há registros com componentes repetidos)
    const pega = (nome: string, unidade?: string) =>
      lista.find((n) => normaliza(n.Componente ?? "") === nome && (!unidade || normaliza(n.Unidades ?? "") === unidade))?.["Valor por 100g"];

    let kcal = numeroTabela(pega("energia", "kcal"));
    if (pega("energia", "kcal") == null || Number.isNaN(kcal)) {
      const kj = pega("energia", "kj");
      kcal = kj != null ? numeroTabela(kj) / 4.184 : NaN;
    }
    if (!Number.isFinite(kcal)) {
      semEnergia++;
      continue;
    }
    const m: Macros = {
      kcal: arredonda(kcal, 1),
      protein_g: numeroTabela(pega("proteina")),
      fat_g: numeroTabela(pega("lipidios")),
      carb_g: numeroTabela(pega("carboidrato total")),
      fiber_g: numeroTabela(pega("fibra alimentar")),
    };
    if (CAMPOS.some((c) => Number.isNaN(m[c]) || m[c] < 0)) {
      semEnergia++;
      continue;
    }
    // Fisicamente impossível: mais de 100 g de macronutrientes em 100 g de alimento, ou energia acima do óleo puro
    if (m.protein_g + m.fat_g + m.carb_g > 100.5 || m.kcal > 950) {
      ignoradosImpossiveis.push(desc);
      continue;
    }
    brutos.push({ code: String(r.codigo ?? ""), category: typeof r.classe === "string" ? r.classe.trim() : "", name: desc, m });
  }

  // Categorias escritas de dois jeitos ("Frutos do mar" / "frutos do mar") viram uma só (vale a forma mais comum)
  const formas = new Map<string, Map<string, number>>();
  for (const b of brutos) {
    const chave = normaliza(b.category);
    const f = formas.get(chave) ?? new Map();
    f.set(b.category, (f.get(b.category) ?? 0) + 1);
    formas.set(chave, f);
  }
  const canonica = (cat: string) => {
    const f = formas.get(normaliza(cat));
    return f ? [...f.entries()].sort((a, b) => b[1] - a[1])[0][0] : cat;
  };

  // Nome repetido no arquivo: acrescenta o código para o banco aceitar os dois
  const vistos = new Map<string, number>();
  for (const b of brutos) vistos.set(b.name.toLowerCase(), (vistos.get(b.name.toLowerCase()) ?? 0) + 1);
  let desambiguados = 0;
  const alimentos: AlimentoImportado[] = brutos.map((b) => {
    let name = b.name;
    if ((vistos.get(b.name.toLowerCase()) ?? 0) > 1 && b.code) {
      name = `${b.name} [${b.code}]`;
      desambiguados++;
    }
    return { name, code: b.code, ...(b.category ? { category: canonica(b.category) } : {}), ...b.m };
  });

  if (desambiguados) avisos.push(`${desambiguados} alimento(s) tinham nome repetido; o código foi acrescentado ao nome entre colchetes.`);
  if (ignoradosImpossiveis.length) {
    const nomes = [...new Set(ignoradosImpossiveis)].slice(0, 3).map((n) => (n.length > 60 ? `${n.slice(0, 60)}...` : n));
    avisos.push(`${ignoradosImpossiveis.length} alimento(s) ignorados por valores impossíveis (mais de 100 g de nutrientes em 100 g): ${nomes.join("; ")}`);
  }
  if (semEnergia) avisos.push(`${semEnergia} registro(s) ignorado(s) por falta de energia ou valor inválido.`);
  if (alimentos.length === 0 && erros.length === 0) erros.push("Não encontrei alimentos no formato esperado (descricao e nutrientes).");
  return { alimentos, erros, avisos, origem: "tbca" };
}

/** Detecta o formato (JSON da TBCA ou CSV) e lê os alimentos. */
export function lerArquivoAlimentos(texto: string): LeituraAlimentos {
  const inicio = texto.replace(/^﻿/, "").trimStart()[0];
  if (inicio === "{" || inicio === "[") return lerAlimentosJson(texto);
  const csv = lerCsvAlimentos(texto);
  return { alimentos: csv.alimentos, erros: csv.erros, avisos: [], origem: "taco" };
}

/** Quantos alimentos há em cada categoria, da maior para a menor. */
export function resumoPorCategoria(alimentos: { category?: string }[]): { categoria: string; quantidade: number }[] {
  const m = new Map<string, number>();
  for (const a of alimentos) {
    const c = a.category?.trim() || "Sem categoria";
    m.set(c, (m.get(c) ?? 0) + 1);
  }
  return [...m.entries()].map(([categoria, quantidade]) => ({ categoria, quantidade })).sort((a, b) => b.quantidade - a.quantidade || a.categoria.localeCompare(b.categoria, "pt-BR"));
}

/** Categorias de alimentos "do dia a dia" (sem especiais, industrializados e fast food). */
export const CATEGORIAS_BASICAS = ["Cereais e derivados", "Carnes e derivados", "Frutas e derivados", "Leguminosas e derivados", "Leite e derivados", "Ovos e derivados", "Pescados e Frutos do mar", "Vegetais e derivados", "Gorduras e óleos", "Sementes e Oleaginosas"];

/** Favoritos vêm primeiro (1000+), depois os mais usados nas dietas. */
export const prioridadeDoAlimento = (a: { id: string; favorite?: boolean }, uso: Map<string, number>) => (a.favorite ? 1000 : 0) + Math.min(uso.get(a.id) ?? 0, 999);
