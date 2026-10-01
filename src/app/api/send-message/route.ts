import { NextRequest, NextResponse } from "next/server";
import { exigirSupabaseAdmin, getSupabaseAdmin } from "@/lib/servidor/supabaseAdmin";
import { requireNutritionist, AuthError } from "@/lib/servidor/serverAuth";
import { getClientIp, rateLimit } from "@/lib/servidor/rateLimit";
import { sendMessageSchema } from "@/lib/servidor/schemas";

export async function POST(req: NextRequest) {
  if (!getSupabaseAdmin()) {
    return NextResponse.json({ error: "O servidor ainda não está ligado ao Supabase." }, { status: 503 });
  }

  const ip = getClientIp(req);
  if (!rateLimit(`send-message:${ip}`, 20, 60_000)) {
    return NextResponse.json(
      { error: "Muitas mensagens em pouco tempo. Tente novamente em instantes." },
      { status: 429 }
    );
  }

  const parsed = sendMessageSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }
  const { patientId, body, nutritionistAccessToken } = parsed.data;

  let caller;
  try {
    caller = await requireNutritionist(nutritionistAccessToken);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  // Salva a mensagem no histórico
  const { error: insertError } = await exigirSupabaseAdmin().from("messages").insert({
    patient_id: patientId,
    nutritionist_id: caller.id,
    body,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  // Busca o token de push do paciente e dispara a notificação
  const { data: patient } = await exigirSupabaseAdmin()
    .from("profiles")
    .select("push_token")
    .eq("id", patientId)
    .single();

  if (patient?.push_token) {
    try {
      const pushRes = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: patient.push_token,
          title: "Mensagem da sua nutricionista",
          body,
          sound: "default",
        }),
      });

      if (!pushRes.ok) {
        console.error(
          `Falha ao enviar push pro paciente ${patientId}: ${pushRes.status} ${await pushRes.text()}`
        );
      }
    } catch (err) {
      // A mensagem já foi salva no histórico mesmo se o push falhar;
      // o paciente ainda vai vê-la ao abrir o app.
      console.error(`Erro de rede ao enviar push pro paciente ${patientId}:`, err);
    }
  }

  return NextResponse.json({ ok: true });
}
