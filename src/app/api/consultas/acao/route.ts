import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin, exigirSupabaseAdmin } from "@/lib/servidor/supabaseAdmin";
import { AuthError, requireNutritionist } from "@/lib/servidor/serverAuth";
import { getClientIp, rateLimit } from "@/lib/servidor/rateLimit";
import { CONFIG_AGENDA } from "@/core/config";
import { dataLocal, horariosDoDia, isoLocal, montarDataHora, somarDias } from "@/core/disponibilidade";
import { getCalendario, HorarioOcupadoError } from "@/lib/calendario";
import { tituloDoEvento } from "@/core/pacientes";
import { avisarPaciente } from "@/lib/servidor/avisos";
import { dataHoraCompleta } from "@/lib/formatar";
import { criarPreCadastro, recalcularTipos } from "@/lib/servidor/vinculoPaciente";

const schema = z.object({
  consultaId: z.string().uuid().optional(),
  acao: z.enum(["realizada", "faltou", "reabrir", "vincular", "cadastrar", "dispensar", "recalcular", "remarcar", "manter"]),
  novoInicio: z.string().datetime({ offset: true }).optional(),
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
  const { consultaId, acao, pacienteId, novoInicio, nutritionistAccessToken } = parsed.data;

  try {
    const caller = await requireNutritionist(nutritionistAccessToken);
    const admin = exigirSupabaseAdmin();

    if (acao === "recalcular") {
      if (!pacienteId) return NextResponse.json({ error: "Escolha o paciente." }, { status: 400 });
      await recalcularTipos(pacienteId);
      return NextResponse.json({ ok: true });
    }
    if (!consultaId) return NextResponse.json({ error: "Consulta não informada." }, { status: 400 });

    // Sem o patch SQL 10 as colunas guest_birth_date e kind não existem: lê de novo só com as básicas
    const BASE = "id, patient_id, google_event_id, status, guest_name, guest_email, guest_phone, starts_at, ends_at";
    let lido = await admin.from("appointments").select(`${BASE}, guest_birth_date, kind, modality`).eq("id", consultaId).maybeSingle();
    if (lido.error) lido = await admin.from("appointments").select(`${BASE}, guest_birth_date, kind`).eq("id", consultaId).maybeSingle();
    if (lido.error) lido = await admin.from("appointments").select(BASE).eq("id", consultaId).maybeSingle();
    const c = lido.data as unknown as { id: string; patient_id: string | null; google_event_id: string | null; status: string; guest_name: string; guest_email: string; guest_phone: string; starts_at: string; ends_at: string; guest_birth_date?: string | null; kind?: "first" | "return" | null; modality?: string | null } | null;
    if (!c) return NextResponse.json({ error: "Consulta não encontrada." }, { status: 404 });

    if (acao === "remarcar") {
      if (!novoInicio) return NextResponse.json({ error: "Escolha o novo dia e horário." }, { status: 400 });
      if (c.status !== "confirmed") return NextResponse.json({ error: "Só dá para remarcar consultas confirmadas." }, { status: 409 });

      const inicio = new Date(novoInicio);
      const fim = new Date(inicio.getTime() + CONFIG_AGENDA.duracaoMin * 60_000);
      if (inicio.getTime() === new Date(c.starts_at).getTime()) return NextResponse.json({ error: "A consulta já está nesse horário." }, { status: 400 });

      const calendario = getCalendario();
      // Só horários que a agenda oferece e que estão livres (mesma regra de quem agenda pelo site)
      const dia = dataLocal(inicio);
      const ocupados = await calendario.ocupados(montarDataHora(dia, "00:00"), montarDataHora(somarDias(dia, 1), "00:00"));
      const horario = horariosDoDia({ data: dia, ocupados }).find((h) => h.inicio === isoLocal(inicio));
      if (!horario) return NextResponse.json({ error: "Esse horário não está disponível na agenda." }, { status: 400 });
      if (!horario.livre) return NextResponse.json({ error: "Esse horário já está ocupado. Escolha outro." }, { status: 409 });

      const [nome, ...resto] = (c.guest_name ?? "").trim().split(/\s+/);
      const reserva = {
        inicio, fim,
        titulo: tituloDoEvento(nome ?? "", resto.join(" "), c.kind ?? null, c.modality === "online" ? "online" : c.modality === "in_person" ? "presencial" : null),
        descricao: [`Paciente: ${c.guest_name}`, `Celular: ${c.guest_phone}`, `E-mail: ${c.guest_email}`, "", "Remarcado pela nutricionista."].join("\n"),
        dados: { nome: nome ?? "", sobrenome: resto.join(" "), celular: c.guest_phone ?? "", email: c.guest_email ?? "", ...(c.patient_id ? { pacienteId: c.patient_id } : {}) },
      };

      let novoId: string;
      try {
        novoId = c.google_event_id ? await calendario.mover(c.google_event_id, inicio, fim, reserva) : await calendario.reservar(reserva);
      } catch (e) {
        if (e instanceof HorarioOcupadoError) return NextResponse.json({ error: "Esse horário já está ocupado. Escolha outro." }, { status: 409 });
        console.error(e);
        return NextResponse.json({ error: "Não foi possível alterar a Google Agenda agora. Nada foi remarcado; tente de novo." }, { status: 502 });
      }

      const { error: upErro } = await admin.from("appointments").update({ starts_at: inicio.toISOString(), ends_at: fim.toISOString(), google_event_id: novoId }).eq("id", consultaId);
      if (upErro) {
        console.error("Consulta movida na agenda, mas não no banco:", upErro.message);
        // desfaz na agenda para não ficar diferente do banco
        if (c.google_event_id) await calendario.mover(novoId, new Date(c.starts_at), new Date(c.ends_at), reserva).catch(() => null);
        return NextResponse.json({ error: "Não foi possível salvar a remarcação. Tente de novo." }, { status: 500 });
      }
      if (c.patient_id) await recalcularTipos(c.patient_id);
      // Fecha o pedido de remarcação em aberto (se houver) e avisa o paciente na área dele
      await admin.from("reschedule_requests").update({ status: "done", resolved_at: new Date().toISOString() }).eq("appointment_id", consultaId).eq("status", "pending");
      await avisarPaciente(c.patient_id, caller.id, `Sua consulta foi remarcada para ${dataHoraCompleta(inicio.toISOString())}. Qualquer dúvida, é só me avisar por aqui.`);
      return NextResponse.json({ ok: true, inicio: isoLocal(inicio) });
    }

    if (acao === "realizada" || acao === "faltou" || acao === "reabrir") {
      const { error } = await admin.from("appointments").update({ status: STATUS[acao] }).eq("id", consultaId);
      if (error) return NextResponse.json({ error: "Não foi possível atualizar a consulta." }, { status: 500 });
      if (c.patient_id) await recalcularTipos(c.patient_id);
      return NextResponse.json({ ok: true });
    }

    if (acao === "manter") {
      // A nutricionista mantém o horário: encerra o pedido e avisa o paciente
      const { error } = await admin.from("reschedule_requests").update({ status: "declined", resolved_at: new Date().toISOString() }).eq("appointment_id", consultaId).eq("status", "pending");
      if (error) return NextResponse.json({ error: "Não foi possível atualizar o pedido." }, { status: 500 });
      await avisarPaciente(c.patient_id, caller.id, `Sobre o seu pedido de remarcação: não consegui outro horário e a consulta continua em ${dataHoraCompleta(c.starts_at)}. Se não puder comparecer, me avise por aqui.`);
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
