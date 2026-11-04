// Calculadora de marmitas: quanto preparar para durar N porções de uma ou mais refeições da dieta.

export type ItemMarmita = { name: string; quantity_g: number; kcal: number; meal_id: string };
export type RefeicaoMarmita = { id: string; meal_name: string };

export type LinhaMarmita = { nome: string; gramasPorPorcao: number; gramasTotal: number };
export type ResultadoMarmita = {
  porcoes: number;
  porRefeicao: { id: string; nome: string; kcalPorPorcao: number; linhas: LinhaMarmita[] }[];
  /** Soma de tudo, agrupando o mesmo alimento que aparece em mais de uma refeição escolhida */
  total: LinhaMarmita[];
  kcalPorDia: number;
};

export const MAX_PORCOES = 90;

/** Aceita só inteiros de 1 a MAX_PORCOES; qualquer outra coisa vira null. */
export function lerPorcoes(texto: string): number | null {
  const t = texto.trim();
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  return n >= 1 && n <= MAX_PORCOES ? n : null;
}

const arredonda = (n: number) => Math.round((n + Number.EPSILON) * 10) / 10;
const chave = (nome: string) => nome.trim().toLowerCase();

/**
 * Para cada refeição escolhida, multiplica a quantidade de cada alimento pelo número de porções.
 * Ex.: 7 porções de um almoço com 100 g de arroz = 700 g de arroz.
 */
export function calcularMarmitas(refeicoes: RefeicaoMarmita[], itens: ItemMarmita[], escolhidas: string[], porcoes: number): ResultadoMarmita {
  const selecionadas = refeicoes.filter((r) => escolhidas.includes(r.id));
  const porRefeicao = selecionadas.map((r) => {
    const doDia = itens.filter((i) => i.meal_id === r.id);
    return {
      id: r.id,
      nome: r.meal_name,
      kcalPorPorcao: Math.round(doDia.reduce((s, i) => s + Number(i.kcal), 0)),
      linhas: doDia.map((i) => ({ nome: i.name.trim(), gramasPorPorcao: arredonda(Number(i.quantity_g)), gramasTotal: arredonda(Number(i.quantity_g) * porcoes) })),
    };
  });

  const mapa = new Map<string, LinhaMarmita>();
  for (const r of porRefeicao) {
    for (const l of r.linhas) {
      const atual = mapa.get(chave(l.nome)) ?? { nome: l.nome, gramasPorPorcao: 0, gramasTotal: 0 };
      atual.gramasPorPorcao = arredonda(atual.gramasPorPorcao + l.gramasPorPorcao);
      atual.gramasTotal = arredonda(atual.gramasTotal + l.gramasTotal);
      mapa.set(chave(l.nome), atual);
    }
  }
  return {
    porcoes,
    porRefeicao,
    total: [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    kcalPorDia: porRefeicao.reduce((s, r) => s + r.kcalPorPorcao, 0),
  };
}

/** Escolha inicial: almoço e jantar, se existirem; senão, todas as refeições. */
export function refeicoesIniciais(refeicoes: RefeicaoMarmita[]): string[] {
  const principais = refeicoes.filter((r) => /almo[cç]o|jantar/i.test(r.meal_name)).map((r) => r.id);
  return principais.length > 0 ? principais : refeicoes.map((r) => r.id);
}
