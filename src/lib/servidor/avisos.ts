import "server-only";
import { getSupabaseAdmin } from "./supabaseAdmin";

/** Grava uma mensagem da nutricionista para o paciente (aparece em "Mensagens" na área dele). Falhar não derruba a ação principal. */
export async function avisarPaciente(pacienteId: string | null, nutricionistaId: string, texto: string): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin || !pacienteId) return;
  const { error } = await admin.from("messages").insert({ patient_id: pacienteId, nutritionist_id: nutricionistaId, body: texto });
  if (error) console.error("Não foi possível avisar o paciente:", error.message);
}
