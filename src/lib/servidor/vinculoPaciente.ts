import "server-only";
import { getSupabaseAdmin } from "./supabaseAdmin";
import { usuarioDoToken } from "./serverAuth";

/**
 * Descobre de qual paciente é a consulta, para gravar o vínculo no evento do Google e no Supabase:
 * 1) se quem agenda está logado como paciente, é ele;
 * 2) senão, procura um paciente com o mesmo e-mail do formulário.
 * Qualquer falha devolve null: o agendamento nunca deixa de funcionar por causa do vínculo.
 */
export async function acharPaciente(token: string | null, email: string): Promise<string | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  try {
    const usuario = await usuarioDoToken(token);
    if (usuario) {
      const { data } = await admin.from("profiles").select("id, role").eq("id", usuario.id).maybeSingle();
      if (data?.role === "patient") return data.id;
    }

    const { data } = await admin.from("profiles").select("id").eq("role", "patient").eq("email", email.trim().toLowerCase()).limit(1).maybeSingle();
    return data?.id ?? null;
  } catch (e) {
    console.error("Não foi possível localizar o paciente da consulta:", e);
    return null;
  }
}

export type ConsultaGravada = {
  googleEventId: string;
  pacienteId: string | null;
  inicio: Date;
  fim: Date;
  nome: string;
  email: string;
  celular: string;
};

/** Grava a consulta no Supabase (a Google Agenda continua sendo a fonte da disponibilidade). */
export async function gravarConsulta(c: ConsultaGravada): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  const { error } = await admin.from("appointments").upsert(
    {
      google_event_id: c.googleEventId,
      patient_id: c.pacienteId,
      starts_at: c.inicio.toISOString(),
      ends_at: c.fim.toISOString(),
      status: "confirmed",
      guest_name: c.nome,
      guest_email: c.email.trim().toLowerCase(),
      guest_phone: c.celular,
    },
    { onConflict: "google_event_id" },
  );
  if (error) console.error("Consulta salva na Google Agenda, mas não no Supabase:", error.message);
}
