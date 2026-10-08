/**
 * Dados do PDF da dieta. Funções puras (sem React e sem a biblioteca de PDF), para poderem ser testadas.
 * O desenho do documento fica em src/components/dieta/DietaPdf.tsx e só é carregado quando a pessoa exporta.
 */
import { assinaturaValida, dimensoesDaImagem, linhasDoRodape, medidasDaAssinatura, type ConfigRodape } from "./rodapePdf.ts";
import { analisar, distribuicao, listaDeCompras, somar, type ItemRefeicao, type LinhaAnalise, type LinhaCompra, type Macros, type Protocolo } from "./nutricao.ts";

export type OpcoesPdf = {
  /** proteínas, lipídios, carboidratos e kcal de cada refeição */
  macrosPorRefeicao: boolean;
  /** kcal ao lado de cada alimento */
  kcalPorAlimento: boolean;
  /** opções que podem ser comidas no lugar de cada alimento */
  substitutos: boolean;
  /** calorias do dia e distribuição dos macros */
  resumoDoDia: boolean;
  /** tabela prescrito × teórico (visão clínica) */
  comparacaoComMetas: boolean;
  listaDeCompras: boolean;
  suplementos: boolean;
  receitas: boolean;
};

/** Padrão pensado para o paciente: o que ele precisa para seguir a dieta. A parte clínica fica desligada. */
export const OPCOES_PADRAO: OpcoesPdf = {
  macrosPorRefeicao: true,
  kcalPorAlimento: false,
  substitutos: true,
  resumoDoDia: true,
  comparacaoComMetas: false,
  listaDeCompras: false,
  suplementos: true,
  receitas: true,
};

export type CaminhoSvg = { tipo: "path"; d: string } | { tipo: "polygon"; pontos: string };
export type LogoVetorial = { viewBox: string; largura: number; altura: number; formas: CaminhoSvg[] };

export type RefeicaoPdf = {
  nome: string;
  horario: string | null; // "07:30"
  notas: string | null;
  itens: { nome: string; gramas: number; kcal: number; substitutos: { nome: string; gramas: number }[] }[];
  total: Macros;
};

export type DadosPdf = {
  clinica: string;
  nutricionista: string | null;
  paciente: { nome: string; idade: number | null; pesoKg: number | null; alturaCm: number | null };
  titulo: string;
  objetivo: string | null;
  refeicoes: RefeicaoPdf[];
  total: Macros;
  distribuicao: ReturnType<typeof distribuicao>;
  analise: LinhaAnalise[] | null;
  compras: LinhaCompra[] | null;
  suplementos: string | null;
  receitas: string | null;
  opcoes: OpcoesPdf;
  geradoEm: string; // ISO
  logos: { isotipo: LogoVetorial | null; logotipo: LogoVetorial | null };
  /** Rodapé de todas as páginas: texto da clínica à esquerda e assinatura à direita */
  rodape: { linhas: string[]; assinatura: string | null; assinaturaMedidas: { largura: number; altura: number } | null };
};

export type EntradaPdf = {
  clinica: string;
  nutricionista: string | null;
  paciente: { full_name: string | null; birth_date: string | null; weight_kg: number | null; height_cm: number | null };
  dieta: Protocolo & { title: string; objective: string | null; supplements: string | null; recipes: string | null };
  refeicoes: { id: string; meal_name: string; meal_time: string | null; notes: string | null; position: number }[];
  itens: ItemRefeicao[];
  /** Substitutos de cada alimento (item_id = id do alimento da dieta). Opcional: sem eles o PDF sai igual ao de antes. */
  substitutos?: { item_id: string; name: string; quantity_g: number; position: number }[];
  opcoes: OpcoesPdf;
  agora: Date;
  logos: DadosPdf["logos"];
  /** Configurações já com o padrão aplicado (comPadrao) */
  rodape: ConfigRodape;
};

/** Idade em anos completos na data `ref` (nascimento "AAAA-MM-DD"). */
export function idadeEm(nascimento: string | null, ref: Date): number | null {
  if (!nascimento) return null;
  const n = new Date(`${nascimento}T12:00:00`);
  if (Number.isNaN(n.getTime())) return null;
  let anos = ref.getFullYear() - n.getFullYear();
  if (ref < new Date(ref.getFullYear(), n.getMonth(), n.getDate())) anos--;
  return anos >= 0 ? anos : null;
}

export function montarDadosPdf(e: EntradaPdf): DadosPdf {
  const ordenadas = [...e.refeicoes].sort((a, b) => a.position - b.position);
  const refeicoes: RefeicaoPdf[] = ordenadas.map((r) => {
    const itens = e.itens.filter((i) => i.meal_id === r.id).sort((a, b) => a.position - b.position);
    return {
      nome: r.meal_name,
      horario: r.meal_time ? r.meal_time.slice(0, 5) : null,
      notas: r.notes?.trim() || null,
      itens: itens.map((i) => ({
        nome: i.name,
        gramas: i.quantity_g,
        kcal: i.kcal,
        substitutos: e.opcoes.substitutos
          ? (e.substitutos ?? []).filter((s) => s.item_id === i.id).sort((a, b) => a.position - b.position).map((s) => ({ nome: s.name, gramas: s.quantity_g }))
          : [],
      })),
      total: somar(itens),
    };
  });
  const todos = e.itens.filter((i) => ordenadas.some((r) => r.id === i.meal_id));
  const total = somar(todos);
  const massaTotal = todos.reduce((s, i) => s + i.quantity_g, 0);

  return {
    clinica: e.clinica,
    nutricionista: e.nutricionista,
    paciente: { nome: e.paciente.full_name?.trim() || "Paciente", idade: idadeEm(e.paciente.birth_date, e.agora), pesoKg: e.paciente.weight_kg, alturaCm: e.paciente.height_cm },
    titulo: e.dieta.title,
    objetivo: e.dieta.objective?.trim() || null,
    refeicoes,
    total,
    distribuicao: distribuicao(total),
    analise: e.opcoes.comparacaoComMetas ? analisar(total, e.dieta, e.paciente.weight_kg, massaTotal) : null,
    compras: e.opcoes.listaDeCompras ? listaDeCompras(todos) : null,
    suplementos: e.opcoes.suplementos ? e.dieta.supplements?.trim() || null : null,
    receitas: e.opcoes.receitas ? e.dieta.recipes?.trim() || null : null,
    opcoes: e.opcoes,
    geradoEm: e.agora.toISOString(),
    logos: e.logos,
    rodape: {
      linhas: linhasDoRodape(e.rodape),
      assinatura: assinaturaValida(e.rodape.signature_data) ? e.rodape.signature_data : null,
      assinaturaMedidas: (() => {
        if (!assinaturaValida(e.rodape.signature_data)) return null;
        const dim = dimensoesDaImagem(e.rodape.signature_data);
        return dim ? medidasDaAssinatura(dim.largura, dim.altura) : medidasDaAssinatura(0, 0);
      })(),
    },
  };
}

/** Nome do arquivo: "Plano-alimentar-maria-silva-2026-10-05.pdf" (sem acento nem caracteres problemáticos). */
export function nomeDoArquivoPdf(paciente: string, agora: Date): string {
  const slug = paciente.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "paciente";
  const d = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;
  return `Plano-alimentar-${slug}-${d}.pdf`;
}

/**
 * Lê um SVG simples (só <path d> e <polygon points>, como os logos da marca) para desenhar no PDF como vetor.
 * Devolve null se não houver nada para desenhar.
 */
export function lerSvgVetorial(svg: string): LogoVetorial | null {
  const vb = svg.match(/viewBox="([^"]+)"/)?.[1];
  if (!vb) return null;
  const [, , w, h] = vb.split(/\s+/).map(Number);
  if (!(w > 0) || !(h > 0)) return null;
  const formas: CaminhoSvg[] = [];
  for (const m of svg.matchAll(/<(path|polygon)\b[^>]*>/g)) {
    const d = m[0].match(/\bd="([^"]+)"/)?.[1];
    const pts = m[0].match(/\bpoints="([^"]+)"/)?.[1];
    if (m[1] === "path" && d) formas.push({ tipo: "path", d });
    if (m[1] === "polygon" && pts) formas.push({ tipo: "polygon", pontos: pts });
  }
  return formas.length ? { viewBox: vb, largura: w, altura: h, formas } : null;
}
