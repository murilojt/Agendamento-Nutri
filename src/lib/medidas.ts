// Medidas caseiras: a dieta guarda sempre as gramas (para os cálculos) e, opcionalmente, como mostrar ("2 colheres de sopa").

export type Medida = { name: string; plural: string | null; grams: number }; // grams = gramas de UMA unidade

export type UnidadeDoItem = { unit_name: string | null; unit_plural: string | null; unit_grams: number | null; unit_qty: number | null };

/** Sugestões para criar uma medida nova. Gramas em branco = depende do alimento (a nutricionista informa). */
export const MEDIDAS_COMUNS: { name: string; plural: string; grams: number | null }[] = [
  { name: "colher de sopa", plural: "colheres de sopa", grams: 15 },
  { name: "colher de sobremesa", plural: "colheres de sobremesa", grams: 10 },
  { name: "colher de chá", plural: "colheres de chá", grams: 5 },
  { name: "colher de servir", plural: "colheres de servir", grams: null },
  { name: "xícara", plural: "xícaras", grams: null },
  { name: "copo", plural: "copos", grams: 200 },
  { name: "concha", plural: "conchas", grams: null },
  { name: "unidade", plural: "unidades", grams: null },
  { name: "fatia", plural: "fatias", grams: null },
  { name: "pedaço", plural: "pedaços", grams: null },
  { name: "porção", plural: "porções", grams: null },
];

const arredonda = (n: number, casas = 2) => Math.round((n + Number.EPSILON) * 10 ** casas) / 10 ** casas;

/** Gramas de `qtd` unidades da medida. */
export const gramasDe = (qtd: number, medida: Pick<Medida, "grams">) => arredonda(qtd * medida.grams);

/** Quantas unidades da medida cabem em `gramas` (para mostrar ao trocar de unidade). */
export const qtdEm = (gramas: number, medida: Pick<Medida, "grams">) => arredonda(gramas / medida.grams);

/** "1,5 colher de sopa" / "2 colheres de sopa": plural a partir de 2 (1,5 fica no singular, como se fala). */
export function textoDaMedida(qtd: number, medida: Pick<Medida, "name" | "plural">): string {
  const n = qtd.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  const nome = qtd >= 2 && medida.plural ? medida.plural : medida.name;
  return `${n} ${nome}`;
}

const fmtG = (g: number) => `${g.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} g`;

/** O item tem uma medida caseira válida? */
export const temMedida = (u: Partial<UnidadeDoItem> | null | undefined): u is UnidadeDoItem =>
  !!u && !!u.unit_name && Number(u.unit_grams) > 0 && Number(u.unit_qty) > 0;

/** Como mostrar a quantidade de um item: { principal: "2 colheres de sopa", gramas: "30 g" } ou só gramas. */
export function quantidadeParaMostrar(quantity_g: number, u?: Partial<UnidadeDoItem> | null): { principal: string; gramas: string | null } {
  if (!temMedida(u)) return { principal: fmtG(quantity_g), gramas: null };
  const qtd = qtdEm(quantity_g, { grams: Number(u.unit_grams) });
  return { principal: textoDaMedida(qtd, { name: u.unit_name!, plural: u.unit_plural }), gramas: fmtG(quantity_g) };
}

/** Texto numa linha só: "2 colheres de sopa (30 g)" ou "100 g". */
export function quantidadeEmTexto(quantity_g: number, u?: Partial<UnidadeDoItem> | null): string {
  const q = quantidadeParaMostrar(quantity_g, u);
  return q.gramas ? `${q.principal} (${q.gramas})` : q.principal;
}

/** Lê o número digitado (aceita vírgula). Só valores positivos. */
export function lerQuantidade(texto: string): number | null {
  const n = Number(texto.trim().replace(",", "."));
  return Number.isFinite(n) && n > 0 && n <= 100000 ? n : null;
}

/** Valida os campos de uma medida nova. */
export function validarMedida(nome: string, plural: string, gramas: string): { erro: string } | { medida: Medida } {
  const n = nome.trim().replace(/\s+/g, " ");
  if (n.length < 2) return { erro: "Informe o nome da medida (ex.: colher de sopa)." };
  const g = lerQuantidade(gramas);
  if (g == null) return { erro: "Informe quantos gramas tem uma unidade (ex.: 25)." };
  return { medida: { name: n, plural: plural.trim().replace(/\s+/g, " ") || null, grams: arredonda(g) } };
}
