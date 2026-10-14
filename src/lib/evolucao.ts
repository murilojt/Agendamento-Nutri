// Evolução do paciente (peso e medidas). Funções puras, testáveis sem navegador.

export type Registro = {
  id: string;
  measured_on: string; // AAAA-MM-DD
  weight_kg: number | null;
  body_fat_pct: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  notes: string | null;
};

export type Campo = "weight_kg" | "body_fat_pct" | "waist_cm" | "hip_cm";

export const CAMPOS: { chave: Campo; rotulo: string; unidade: string; min: number; max: number }[] = [
  { chave: "weight_kg", rotulo: "Peso", unidade: "kg", min: 20, max: 400 },
  { chave: "body_fat_pct", rotulo: "Gordura corporal", unidade: "%", min: 2, max: 70 },
  { chave: "waist_cm", rotulo: "Cintura", unidade: "cm", min: 30, max: 250 },
  { chave: "hip_cm", rotulo: "Quadril", unidade: "cm", min: 30, max: 250 },
];

export const num = (v: unknown): number | null => (v == null || v === "" ? null : Number(v));

/** Registros do mais antigo para o mais recente. */
export const emOrdem = <T extends { measured_on: string }>(r: T[]): T[] => [...r].sort((a, b) => a.measured_on.localeCompare(b.measured_on));

/** Pontos de uma medida, com a data, do mais antigo para o mais recente (ignora registros sem esse valor). */
export function serie(registros: Registro[], campo: Campo): { data: string; valor: number }[] {
  return emOrdem(registros).flatMap((r) => (r[campo] == null ? [] : [{ data: r.measured_on, valor: r[campo] as number }]));
}

/** Primeiro valor, último valor e a variação entre eles. Null se não houver nenhum valor. */
export function resumo(registros: Registro[], campo: Campo) {
  const s = serie(registros, campo);
  if (s.length === 0) return null;
  const primeiro = s[0].valor;
  const ultimo = s[s.length - 1].valor;
  return { primeiro, ultimo, variacao: Math.round((ultimo - primeiro) * 10) / 10, quantidade: s.length };
}

export function imc(pesoKg: number | null, alturaCm: number | null): number | null {
  if (!pesoKg || !alturaCm || alturaCm < 50) return null;
  const m = alturaCm / 100;
  return Math.round((pesoKg / (m * m)) * 10) / 10;
}

export type EntradaRegistro = { data: string } & Record<Campo, string>;

/** Lê o formulário (aceita vírgula decimal). Devolve os valores ou a mensagem de erro. */
export function lerRegistro(e: EntradaRegistro, hoje: string): { erro: string } | { dados: Record<Campo, number | null> & { measured_on: string } } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.data) || Number.isNaN(Date.parse(e.data))) return { erro: "Informe a data da medição." };
  if (e.data > hoje) return { erro: "A data não pode ser no futuro." };
  if (e.data < "1900-01-01") return { erro: "Data inválida." };
  const dados = { measured_on: e.data } as Record<Campo, number | null> & { measured_on: string };
  let algum = false;
  for (const c of CAMPOS) {
    const bruto = (e[c.chave] ?? "").trim().replace(",", ".");
    if (bruto === "") {
      dados[c.chave] = null;
      continue;
    }
    const n = Number(bruto);
    if (!Number.isFinite(n) || n < c.min || n > c.max) return { erro: `${c.rotulo}: informe um valor entre ${c.min} e ${c.max} ${c.unidade}.` };
    dados[c.chave] = Math.round(n * 10) / 10;
    algum = true;
  }
  if (!algum) return { erro: "Preencha pelo menos uma medida." };
  return { dados };
}

export const formatarNumero = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
export const formatarData = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR");
