import { NextRequest, NextResponse } from "next/server";
import { exigirSupabaseAdmin, getSupabaseAdmin } from "@/lib/servidor/supabaseAdmin";
import { requireNutritionist, AuthError } from "@/lib/servidor/serverAuth";
import { getClientIp, rateLimit } from "@/lib/servidor/rateLimit";
import { createPatientSchema } from "@/lib/servidor/schemas";

export async function POST(req: NextRequest) {
  if (!getSupabaseAdmin()) {
    return NextResponse.json({ error: "O servidor ainda não está ligado ao Supabase." }, { status: 503 });
  }

  const ip = getClientIp(req);
  if (!rateLimit(`patients:${ip}`, 5, 60_000)) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente em instantes." },
      { status: 429 }
    );
  }

  const parsed = createPatientSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }
  const { fullName, email, password, nutritionistAccessToken } = parsed.data;

  let caller;
  try {
    caller = await requireNutritionist(nutritionistAccessToken);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  // Cria o usuário de autenticação do paciente
  const { data: created, error: createError } =
    await exigirSupabaseAdmin().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

  if (createError || !created.user) {
    return NextResponse.json(
      { error: createError?.message ?? "Erro ao criar paciente." },
      { status: 400 }
    );
  }

  // O trigger do banco já criou o profile com role='patient'.
  // Agora associamos o paciente a essa nutricionista.
  const { error: updateError } = await exigirSupabaseAdmin()
    .from("profiles")
    .update({ nutritionist_id: caller.id, full_name: fullName })
    .eq("id", created.user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ id: created.user.id });
}
