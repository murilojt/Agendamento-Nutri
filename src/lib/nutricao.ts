/**
 * Cálculos nutricionais do montador de dietas.
 * Funções puras (sem React e sem Supabase) para poderem ser testadas.
 * Energia: proteína 4 kcal/g, carboidrato 4 kcal/g, lipídio 9 kcal/g.
 */

export type Macros = { kcal: number; protein_g: number; fat_g: number; carb_g: number; fiber_g: number };

export type Alimento = Macros & { id: string; name: string; source: string }; // valores por 100 g

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

/** Busca sem acento e sem diferenciar maiúsculas; todas as palavras digitadas precisam aparecer. */
export const normaliza = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function buscarAlimentos<T extends { name: string }>(todos: T[], termo: string, limite = 12): T[] {
  const palavras = normaliza(termo).split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return [];
  const achados = todos.filter((a) => {
    const n = normaliza(a.name);
    return palavras.every((p) => n.includes(p));
  });
  // Quem começa com o termo vem primeiro, depois os nomes mais curtos
  const ini = normaliza(termo).trim();
  achados.sort((a, b) => {
    const sa = normaliza(a.name).startsWith(ini) ? 0 : 1;
    const sb = normaliza(b.name).startsWith(ini) ? 0 : 1;
    return sa - sb || a.name.length - b.name.length;
  });
  return achados.slice(0, limite);
}

/** Lê o CSV de alimentos (TACO ou similar): separador `;` ou `,`, decimal com vírgula ou ponto. */
export type AlimentoCsv = { name: string } & Macros;

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
  const acha = (...nomes: string[]) => cab.findIndex((c) => nomes.some((n) => c.includes(n)));
  const col = {
    name: acha("alimento", "nome", "descricao"),
    kcal: acha("kcal", "energia", "caloria"),
    protein_g: acha("proteina"),
    fat_g: acha("lipid", "gordura"),
    carb_g: acha("carboidrato", "carbo"),
    fiber_g: acha("fibra"),
  };
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
    };
    if (CAMPOS.some((k) => Number.isNaN(a[k]) || a[k] < 0)) erros.push(`Linha ${idx + 2} (${name}): valor numérico inválido.`);
    else alimentos.push(a);
  });
  return { alimentos, erros };
}
