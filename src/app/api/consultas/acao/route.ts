import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin, exigirSupabaseAdmin } from "@/lib/servidor/supabaseAdmin";
import { AuthError, requireNutritionist } from "@/lib/servidor/serverAuth";
import { getClientIp, rateLimit } from "@/lib/servidor/rateLimit";
import { criarPreCadastro, recalcularTipos } from "@/lib/servidor/vinculoPaciente";

const schema = z.object({
  consultaId: z.string().uuid().optional(),
  acao: z.enum(["realizada", "faltou", "reabrir", "vincular", "cadastrar", "dispensar", "recalcular"]),
  pacienteId: z.string().uuid().optional(),
  nutritionistAccessToken: z.string().min(1, "Não autenticado."),
});

const STATUS = { realizada: "completed", faltou: "no_show", reabrir: "confirmed" } as const;

// POST /api/consultas/acao: ações da nutricionista sobre uma consulta marcada pelo site
export async function POST(req: NextRequest) {
  if (!getSupabaseAdmin()) return NextResponse.json({ error: "O servidor ainda não está ligado ao Supabase." }, { status: 503 });
  if (!rateLimit(`consultas-acao:${getClientIp(req)}`, 60, 60_000)) {
    return NextResponse.json({ error: "Muitas tentativas. Tente novamente em instantes." }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  const { consultaId, acao, pacienteId, nutritionistAccessToken } = parsed.data;

  try {
    const caller = await requireNutritionist(nutritionistAccessToken);
    const admin = exigirSupabaseAdmin();

    if (acao === "recalcular") {
      if (!pacienteId) return NextResponse.json({ error: "Escolha o paciente." }, { status: 400 });
      await recalcularTipos(pacienteId);
      return NextResponse.json({ ok: true });
    }
    if (!consultaId) return NextResponse.json({ error: "Consulta não informada." }, { status: 400 });

    const { data: c } = await admin.from("appointments").select("id, patient_id, guest_name, guest_email, guest_phone, guest_birth_date, starts_at").eq("id", consultaId).maybeSingle();
    if (!c) return NextResponse.json({ error: "Consulta não encontrada." }, { status: 404 });

    if (acao === "realizada" || acao === "faltou" || acao === "reabrir") {
      const { error } = await admin.from("appointments").update({ status: STATUS[acao] }).eq("id", consultaId);
      if (error) return NextResponse.json({ error: "Não foi possível atualizar a consulta." }, { status: 500 });
      if (c.patient_id) await recalcularTipos(c.patient_id);
      return NextResponse.json({ ok: true });
    }

    if (acao === "dispensar") {
      const { error } = await admin.from("appointments").update({ needs_review: false, suggested_patient_id: null }).eq("id", consultaId);
      if (error) return NextResponse.json({ error: "Não foi possível atualizar a consulta." }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    // vincular / cadastrar
    let alvo: string | null = null;
    if (acao === "vincular") {
      if (!pacienteId) return NextResponse.json({ error: "Escolha o paciente." }, { status: 400 });
      const { data: p } = await admin.from("profiles").select("id, role, nutritionist_id").eq("id", pacienteId).maybeSingle();
      if (!p || p.role !== "patient" || (p.nutritionist_id && p.nutritionist_id !== caller.id)) {
        return NextResponse.json({ error: "Paciente não encontrado." }, { status: 404 });
      }
      alvo = p.id;
    } else {
      if (c.patient_id) return NextResponse.json({ error: "Esta consulta já tem paciente." }, { status: 409 });
      const [nome, ...resto] = (c.guest_name ?? "").trim().split(/\s+/);
      alvo = await criarPreCadastro(
        { nome: nome ?? "", sobrenome: resto.join(" "), email: c.guest_email, celular: c.guest_phone ?? "", nascimento: c.guest_birth_date ?? "" },
        null,
        caller.id,
      );
      if (!alvo) return NextResponse.json({ error: "Não foi possível cadastrar. O e-mail pode já estar em uso por outro cadastro." }, { status: 409 });
    }

    // Liga esta e as outras consultas sem paciente do mesmo e-mail
    const limpar = { patient_id: alvo, needs_review: false, review_reason: null, suggested_patient_id: null };
    let r = await admin.from("appointments").update(limpar).eq("id", consultaId);
    if (r.error) r = await admin.from("appointments").update({ patient_id: alvo }).eq("id", consultaId);
    if (r.error) return NextResponse.json({ error: "Não foi possível atualizar a consulta." }, { status: 500 });
    if (c.guest_email) {
      const outras = await admin.from("appointments").update(limpar).is("patient_id", null).eq("guest_email", c.guest_email);
      if (outras.error) await admin.from("appointments").update({ patient_id: alvo }).is("patient_id", null).eq("guest_email", c.guest_email);
    }
    if (!alvo) return NextResponse.json({ error: "Paciente não encontrado." }, { status: 404 });
    await recalcularTipos(alvo);
    return NextResponse.json({ ok: true, pacienteId: alvo });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
