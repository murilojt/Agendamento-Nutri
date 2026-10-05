import "server-only";
import { randomBytes } from "node:crypto";
import { getSupabaseAdmin } from "./supabaseAdmin";
import { usuarioDoToken } from "./serverAuth";
import { decidirVinculo, normalizaTelefone, tipoDaConsulta, type Candidato, type DadosFormulario, type MotivoRevisao } from "@/core/pacientes";

export type ResultadoVinculo = {
  pacienteId: string | null;
  kind: "first" | "return" | null;
  /** O paciente foi criado agora (pré-cadastro). */
  preCadastro: boolean;
  revisar: { motivo: MotivoRevisao | "sem_cadastro"; sugeridoId: string | null } | null;
};

const SEM_VINCULO: ResultadoVinculo = { pacienteId: null, kind: null, preCadastro: false, revisar: null };

type Linha = { id: string; full_name: string | null; email: string | null; phone: string | null; birth_date: string | null };

const paraCandidato = (l: Linha): Candidato => ({ id: l.id, nome: l.full_name, email: l.email, telefone: l.phone, nascimento: l.birth_date });

/** Quantas consultas já realizadas o paciente tem antes de `antesDe` e se está marcado como "já atendido". */
export async function historicoDoPaciente(pacienteId: string, antesDe: Date, ignorarConsultaId?: string) {
  const admin = getSupabaseAdmin();
  if (!admin) return { jaAtendido: false, consultasRealizadasAntes: 0 };

  let jaAtendido = false;
  const perfil = await admin.from("profiles").select("was_seen_before").eq("id", pacienteId).maybeSingle();
  if (!perfil.error) jaAtendido = perfil.data?.was_seen_before === true;

  let q = admin
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", pacienteId)
    .eq("status", "completed")
    .lt("starts_at", antesDe.toISOString());
  if (ignorarConsultaId) q = q.neq("id", ignorarConsultaId);
  const { count } = await q;
  return { jaAtendido, consultasRealizadasAntes: count ?? 0 };
}

async function nutricionistaPadrao(): Promise<string | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  if (process.env.NUTRICIONISTA_PADRAO_ID) return process.env.NUTRICIONISTA_PADRAO_ID;
  const { data } = await admin.from("profiles").select("id").eq("role", "nutritionist").order("created_at", { ascending: true }).limit(1);
  return data?.[0]?.id ?? null;
}

/** Cria o paciente "sem senha" (pré-cadastro): usuário de autenticação com senha aleatória que ninguém conhece. */
export async function criarPreCadastro(d: DadosFormulario, consentAt: string | null, nutricionistaId?: string): Promise<string | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const email = d.email.trim().toLowerCase();
  const nomeCompleto = `${d.nome} ${d.sobrenome}`.trim();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: randomBytes(24).toString("base64url"),
    email_confirm: true,
    user_metadata: { full_name: nomeCompleto },
  });
  if (error || !data.user) {
    console.error("Não foi possível criar o pré-cadastro:", error?.message);
    return null;
  }
  const id = data.user.id;
  const base = { full_name: nomeCompleto, phone: normalizaTelefone(d.celular), birth_date: d.nascimento, nutritionist_id: nutricionistaId ?? (await nutricionistaPadrao()) };
  const completo = await admin.from("profiles").update({ ...base, registration_source: "agendamento", ...(consentAt ? { consent_at: consentAt } : {}), was_seen_before: false }).eq("id", id);
  if (completo.error) {
    // SQL 10 ainda não aplicado: grava só o básico
    const basico = await admin.from("profiles").update(base).eq("id", id);
    if (basico.error) console.error("Pré-cadastro criado, mas sem os dados do perfil:", basico.error.message);
  }
  return id;
}

/**
 * Decide a quem pertence a consulta:
 * 1) paciente logado → é ele;
 * 2) e-mail/celular/nascimento batem com um paciente → liga;
 * 3) dúvida → não liga, marca para revisão com sugestão;
 * 4) ninguém parecido → cria pré-cadastro.
 * Qualquer falha devolve "sem vínculo": o agendamento nunca deixa de funcionar por causa disso.
 */
export async function identificarPaciente(token: string | null, d: DadosFormulario, inicio: Date, consentAt: string): Promise<ResultadoVinculo> {
  const admin = getSupabaseAdmin();
  if (!admin) return SEM_VINCULO;

  try {
    let pacienteId: string | null = null;
    let preCadastro = false;
    let revisar: ResultadoVinculo["revisar"] = null;

    const usuario = await usuarioDoToken(token);
    if (usuario) {
      const { data } = await admin.from("profiles").select("id, role").eq("id", usuario.id).maybeSingle();
      if (data?.role === "patient") pacienteId = data.id;
    }

    if (!pacienteId) {
      const email = d.email.trim().toLowerCase();
      const digitos = normalizaTelefone(d.celular);
      const cols = "id, full_name, email, phone, birth_date";
      const [porEmail, porFone] = await Promise.all([
        admin.from("profiles").select(cols).eq("role", "patient").eq("email", email).limit(5),
        digitos.length >= 10
          ? admin.from("profiles").select(cols).eq("role", "patient").like("phone_digits", `%${digitos.slice(-8)}`).limit(10)
          : Promise.resolve({ data: [] as Linha[], error: null }),
      ]);
      // Sem a coluna phone_digits (SQL 10 pendente) a busca por celular é ignorada, a de e-mail continua
      const unicos = new Map<string, Candidato>();
      for (const l of [...((porEmail.data as Linha[]) ?? []), ...((porFone.error ? [] : (porFone.data as Linha[])) ?? [])]) unicos.set(l.id, paraCandidato(l));

      const decisao = decidirVinculo(d, [...unicos.values()]);
      if (decisao.tipo === "vinculado") pacienteId = decisao.pacienteId;
      else if (decisao.tipo === "revisar") revisar = { motivo: decisao.motivo, sugeridoId: decisao.sugeridoId };
      else {
        pacienteId = await criarPreCadastro(d, consentAt);
        if (pacienteId) preCadastro = true;
        else revisar = { motivo: "sem_cadastro", sugeridoId: null };
      }
    }

    if (revisar) return { pacienteId: null, kind: null, preCadastro: false, revisar };
    const historico = pacienteId ? await historicoDoPaciente(pacienteId, inicio) : { jaAtendido: false, consultasRealizadasAntes: 0 };
    return { pacienteId, kind: tipoDaConsulta(historico), preCadastro, revisar: null };
  } catch (e) {
    console.error("Não foi possível identificar o paciente da consulta:", e);
    return SEM_VINCULO;
  }
}

export type ConsultaGravada = {
  googleEventId: string;
  vinculo: ResultadoVinculo;
  inicio: Date;
  fim: Date;
  nome: string;
  email: string;
  celular: string;
  nascimento: string;
  consentAt: string;
};

/** Grava a consulta no Supabase (a Google Agenda continua sendo a fonte da disponibilidade). */
export async function gravarConsulta(c: ConsultaGravada): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  const base = {
    google_event_id: c.googleEventId,
    patient_id: c.vinculo.pacienteId,
    starts_at: c.inicio.toISOString(),
    ends_at: c.fim.toISOString(),
    status: "confirmed",
    guest_name: c.nome,
    guest_email: c.email.trim().toLowerCase(),
    guest_phone: c.celular,
  };
  const completo = {
    ...base,
    kind: c.vinculo.kind,
    guest_birth_date: c.nascimento,
    needs_review: c.vinculo.revisar !== null,
    review_reason: c.vinculo.revisar?.motivo ?? null,
    suggested_patient_id: c.vinculo.revisar?.sugeridoId ?? null,
    consent_at: c.consentAt,
  };

  let { error } = await admin.from("appointments").upsert(completo, { onConflict: "google_event_id" });
  if (error) {
    // SQL 10 ainda não aplicado: grava só o básico
    ({ error } = await admin.from("appointments").upsert(base, { onConflict: "google_event_id" }));
  }
  if (error) console.error("Consulta salva na Google Agenda, mas não no Supabase:", error.message);
}

/** Recalcula "1ª consulta"/"Retorno" das consultas confirmadas do paciente, na ordem do calendário. */
export async function recalcularTipos(pacienteId: string): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  const { data, error } = await admin.from("appointments").select("id, starts_at, status, kind").eq("patient_id", pacienteId).order("starts_at", { ascending: true });
  if (error || !data) return;
  const perfil = await admin.from("profiles").select("was_seen_before").eq("id", pacienteId).maybeSingle();
  const jaAtendido = !perfil.error && perfil.data?.was_seen_before === true;
  let realizadas = 0;
  for (const c of data) {
    if (c.status === "confirmed") {
      const kind = tipoDaConsulta({ jaAtendido, consultasRealizadasAntes: realizadas });
      if (kind !== c.kind) await admin.from("appointments").update({ kind }).eq("id", c.id);
    }
    if (c.status === "completed") realizadas++;
  }
}
