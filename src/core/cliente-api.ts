import type { AgendamentoCriado, DisponibilidadeMes, ErroApi, NovoAgendamento } from "./schemas";

/**
 * Cliente tipado da API de agendamentos.
 * Usa apenas fetch: funciona no navegador, no Next.js e no React Native/Expo.
 * No app: const api = criarClienteAgenda("https://endereco-do-site.com")
 */
export class ErroAgenda extends Error {
  constructor(public status: number, mensagem: string, public detalhes?: Record<string, string[]>) {
    super(mensagem);
  }
}

export function criarClienteAgenda(baseUrl = "") {
  async function chamar<T>(caminho: string, init?: RequestInit): Promise<T> {
    const r = await fetch(`${baseUrl}${caminho}`, {
      ...init,
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
    const corpo = await r.json().catch(() => ({}));
    if (!r.ok) {
      const e = corpo as ErroApi;
      throw new ErroAgenda(r.status, e.erro ?? "Erro inesperado", e.detalhes);
    }
    return corpo as T;
  }

  return {
    disponibilidadeDoMes: (mes: string) =>
      chamar<DisponibilidadeMes>(`/api/disponibilidade?mes=${mes}`),
    /** `token`: access token do Supabase, quando quem agenda é um paciente logado (vincula a consulta a ele). */
    agendar: (dados: NovoAgendamento, token?: string) =>
      chamar<AgendamentoCriado>("/api/agendamentos", {
        method: "POST",
        body: JSON.stringify(dados),
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }),
  };
}
