import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/servidor/supabaseAdmin";
import { usuarioDoToken } from "@/lib/servidor/serverAuth";
import { getClientIp, rateLimit } from "@/lib/servidor/rateLimit";

const schema = z.object({
  consultaId: z.string().uuid(),
  acao: z.enum(["pedir", "cancelar"]),
  nota: z.string().trim().max(500, "Mensagem muito longa (máx. 500 caracteres).").optional(),
});

// POST /api/consultas/pedido: o paciente pede (ou cancela o pedido de) remarcação de uma consulta dele
export async function POST(req: NextRequest) {
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "O servidor ainda não está ligado ao Supabase." }, { status: 503 });
  if (!rateLimit(`pedido-remarcacao:${getClientIp(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: "Muitas tentativas. Tente novamente em instantes." }, { status: 429 });
  }

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  const usuario = await usuarioDoToken(token);
  if (!usuario) return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  const { consultaId, acao, nota } = parsed.data;

  // A consulta precisa ser do próprio paciente
  const { data: c } = await admin.from("appointments").select("id, patient_id, status, starts_at").eq("id", consultaId).maybeSingle();
  if (!c || c.patient_id !== usuario.id) return NextResponse.json({ error: "Consulta não encontrada." }, { status: 404 });

  if (acao === "cancelar") {
    const { error } = await admin.from("reschedule_requests").update({ status: "cancelled", resolved_at: new Date().toISOString() }).eq("appointment_id", consultaId).eq("patient_id", usuario.id).eq("status", "pending");
    if (error) return NextResponse.json({ error: "Não foi possível cancelar o pedido." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (c.status !== "confirmed" || new Date(c.starts_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Só dá para pedir remarcação de uma consulta confirmada que ainda não aconteceu." }, { status: 409 });
  }
  const { error } = await admin.from("reschedule_requests").insert({ appointment_id: consultaId, patient_id: usuario.id, note: nota || null });
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Você já tem um pedido de remarcação em aberto para esta consulta." }, { status: 409 });
    console.error("Pedido de remarcação:", error.message);
    return NextResponse.json({ error: "Não foi possível enviar o pedido. Confirme que o patch SQL 16 foi aplicado no Supabase." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
