import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/servidor/supabaseAdmin";
import { usuarioDoToken } from "@/lib/servidor/serverAuth";
import { getClientIp, rateLimit } from "@/lib/servidor/rateLimit";

// POST /api/conta/senha-trocada: o paciente avisa que já trocou a senha provisória (limpa a obrigatoriedade)
export async function POST(req: NextRequest) {
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "O servidor ainda não está ligado ao Supabase." }, { status: 503 });
  if (!rateLimit(`senha-trocada:${getClientIp(req)}`, 20, 60_000)) {
    return NextResponse.json({ error: "Muitas tentativas. Tente novamente em instantes." }, { status: 429 });
  }

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  const usuario = await usuarioDoToken(token);
  if (!usuario) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { error } = await admin.from("profiles").update({ must_change_password: false }).eq("id", usuario.id);
  if (error) console.error("senha-trocada:", error.message);
  return NextResponse.json({ ok: true });
}
