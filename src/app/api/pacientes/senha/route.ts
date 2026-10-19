import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { exigirSupabaseAdmin, getSupabaseAdmin } from "@/lib/servidor/supabaseAdmin";
import { AuthError, requireNutritionist } from "@/lib/servidor/serverAuth";
import { getClientIp, rateLimit } from "@/lib/servidor/rateLimit";

const schema = z.object({
  patientId: z.string().uuid("Paciente inválido."),
  password: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres.").max(72, "Senha muito longa."),
  forceChange: z.boolean(),
  nutritionistAccessToken: z.string().min(1, "Não autenticado."),
});

// POST /api/pacientes/senha: a nutricionista define uma nova senha para o paciente e, se quiser, obriga a troca no próximo acesso
export async function POST(req: NextRequest) {
  if (!getSupabaseAdmin()) return NextResponse.json({ error: "O servidor ainda não está ligado ao Supabase." }, { status: 503 });
  if (!rateLimit(`senha-paciente:${getClientIp(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: "Muitas tentativas. Tente novamente em instantes." }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  const { patientId, password, forceChange, nutritionistAccessToken } = parsed.data;

  try {
    const caller = await requireNutritionist(nutritionistAccessToken);
    const admin = exigirSupabaseAdmin();

    // Só pacientes desta nutricionista (ou ainda sem nutricionista)
    const { data: p } = await admin.from("profiles").select("id, role, nutritionist_id").eq("id", patientId).maybeSingle();
    if (!p || p.role !== "patient" || (p.nutritionist_id && p.nutritionist_id !== caller.id)) {
      return NextResponse.json({ error: "Paciente não encontrado." }, { status: 404 });
    }

    const { error } = await admin.auth.admin.updateUserById(patientId, { password });
    if (error) return NextResponse.json({ error: "Não foi possível alterar a senha. " + error.message }, { status: 400 });

    // Marca a troca obrigatória. Sem o patch SQL 13 a coluna não existe: a senha já foi alterada, só não dá para exigir a troca.
    const { error: marcaErro } = await admin.from("profiles").update({ must_change_password: forceChange }).eq("id", patientId);
    const exigida = forceChange && !marcaErro;
    if (marcaErro) console.error("must_change_password:", marcaErro.message);

    return NextResponse.json({ ok: true, trocaExigida: exigida, avisoSql: forceChange && !!marcaErro });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
