// Marcações da lista de compras do paciente (guardadas só no aparelho dele).

/** Chave estável de um alimento na lista (mesma regra de agrupamento da lista de compras). */
export const chaveDeCompra = (nome: string) => nome.trim().toLowerCase();

export const chaveDeArmazenamento = (dietaId: string) => `compras:${dietaId}`;

/** Lê o que foi marcado. Aceita lixo/ausência de armazenamento sem quebrar. */
export function lerMarcados(texto: string | null): Set<string> {
  try {
    const v = JSON.parse(texto ?? "[]");
    return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

export const guardarMarcados = (m: Set<string>) => JSON.stringify([...m]);

/** Quantidade legível: acima de 1000 g vira kg. */
export const formatarQuantidade = (g: number) =>
  g >= 1000 ? `${(g / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg` : `${g.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} g`;
