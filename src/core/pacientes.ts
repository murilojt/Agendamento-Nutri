// Regras puras para ligar quem agenda a um paciente já cadastrado (sem acesso a banco).

export type Candidato = {
  id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  nascimento: string | null; // AAAA-MM-DD
};

export type DadosFormulario = {
  nome: string;
  sobrenome: string;
  email: string;
  celular: string;
  nascimento: string;
};

export type MotivoRevisao = "email_igual_dados_diferentes" | "telefone_igual" | "varios_pacientes";

export type Vinculo =
  | { tipo: "vinculado"; pacienteId: string }
  | { tipo: "novo" }
  | { tipo: "revisar"; motivo: MotivoRevisao; sugeridoId: string | null };

export const MOTIVOS_REVISAO: Record<MotivoRevisao, string> = {
  email_igual_dados_diferentes: "O e-mail é de um paciente cadastrado, mas nome ou nascimento não conferem.",
  telefone_igual: "O celular é de um paciente cadastrado, mas o e-mail ou o nascimento não conferem.",
  varios_pacientes: "Os dados batem com mais de um paciente cadastrado.",
};

/** Só os dígitos do telefone, sem o código do país (55). */
export function normalizaTelefone(valor: string | null | undefined): string {
  let d = (valor ?? "").replace(/\D/g, "");
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  return d;
}

/** Dois telefones são o mesmo se os últimos 10 dígitos (DDD + número sem o 9 extra) coincidem. */
export function mesmoTelefone(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = normalizaTelefone(a);
  const y = normalizaTelefone(b);
  if (x.length < 10 || y.length < 10) return false;
  return x.slice(-8) === y.slice(-8) && x.slice(0, 2) === y.slice(0, 2);
}

export function semAcento(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function primeiroNome(s: string | null | undefined): string {
  return semAcento(s ?? "").split(/\s+/)[0] ?? "";
}

/** Primeiros nomes iguais (ignora acento e caixa). Sem nome cadastrado, não dá para contradizer. */
export function nomeCompativel(cadastrado: string | null | undefined, informado: string): boolean {
  const a = primeiroNome(cadastrado);
  if (!a) return true;
  return a === primeiroNome(informado);
}

function nascimentoCompativel(cadastrado: string | null, informado: string): boolean {
  return !cadastrado || cadastrado === informado;
}

/**
 * Decide o que fazer com quem está agendando.
 * Só liga automaticamente quando os dados batem; qualquer dúvida vira "revisar", nunca liga sozinho.
 */
export function decidirVinculo(dados: DadosFormulario, candidatos: Candidato[]): Vinculo {
  const email = dados.email.trim().toLowerCase();
  const nomeCompleto = `${dados.nome} ${dados.sobrenome}`;

  const porEmail = candidatos.filter((c) => (c.email ?? "").trim().toLowerCase() === email);
  if (porEmail.length === 1) {
    const c = porEmail[0];
    if (nomeCompativel(c.nome, nomeCompleto) && nascimentoCompativel(c.nascimento, dados.nascimento)) {
      return { tipo: "vinculado", pacienteId: c.id };
    }
    return { tipo: "revisar", motivo: "email_igual_dados_diferentes", sugeridoId: c.id };
  }
  if (porEmail.length > 1) return { tipo: "revisar", motivo: "varios_pacientes", sugeridoId: porEmail[0].id };

  const porTelefone = candidatos.filter((c) => mesmoTelefone(c.telefone, dados.celular));
  if (porTelefone.length === 0) return { tipo: "novo" };

  const confirmados = porTelefone.filter((c) => c.nascimento && c.nascimento === dados.nascimento && nomeCompativel(c.nome, nomeCompleto));
  if (confirmados.length === 1 && porTelefone.length === 1) {
    return { tipo: "vinculado", pacienteId: confirmados[0].id };
  }
  if (porTelefone.length > 1) return { tipo: "revisar", motivo: "varios_pacientes", sugeridoId: porTelefone[0].id };
  return { tipo: "revisar", motivo: "telefone_igual", sugeridoId: porTelefone[0].id };
}

/** "Retorno" se já foi atendido antes ou tem consulta anterior realizada; senão, "1ª consulta". */
export function tipoDaConsulta(opts: { jaAtendido: boolean; consultasRealizadasAntes: number }): "first" | "return" {
  return opts.jaAtendido || opts.consultasRealizadasAntes > 0 ? "return" : "first";
}

export function rotuloTipo(kind: string | null | undefined): string | null {
  if (kind === "first") return "1ª consulta";
  if (kind === "return") return "Retorno";
  return null;
}

/** Título do evento no Google Agenda. Sem tag quando ainda não dá para saber (revisão). */
export function tituloDoEvento(nome: string, sobrenome: string, kind: "first" | "return" | null): string {
  const tag = kind === "first" ? "[1ª consulta] " : kind === "return" ? "[Retorno] " : "";
  return `${tag}${nome} ${sobrenome}`;
}
