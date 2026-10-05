import { NextResponse, type NextRequest } from "next/server";
import { CONFIG_AGENDA } from "@/core/config";
import { dataLocal, horariosDoDia, isoLocal, montarDataHora, somarDias } from "@/core/disponibilidade";
import { novoAgendamentoSchema, type AgendamentoCriado } from "@/core/schemas";
import { getCalendario, HorarioOcupadoError } from "@/lib/calendario";
import { erro, erroValidacao } from "@/lib/http";
import { tituloDoEvento } from "@/core/pacientes";
import { getClientIp, rateLimit } from "@/lib/servidor/rateLimit";
import { identificarPaciente, gravarConsulta } from "@/lib/servidor/vinculoPaciente";

export const dynamic = "force-dynamic";

const OCUPADO = "Esse horário acabou de ser preenchido. Escolha outro.";

// POST /api/agendamentos
export async function POST(req: NextRequest) {
  if (!rateLimit(`agendar:${getClientIp(req)}`, 10, 60_000)) return erro(429, "Muitas tentativas. Tente novamente em instantes.");
  const dados = novoAgendamentoSchema.safeParse(await req.json().catch(() => null));
  if (!dados.success) return erroValidacao(dados.error);

  const { nome, sobrenome, celular, email, nascimento } = dados.data;
  const inicio = new Date(dados.data.inicio);
  const fim = new Date(inicio.getTime() + CONFIG_AGENDA.duracaoMin * 60_000);
  const dia = dataLocal(inicio);

  try {
    const calendario = getCalendario();

    // Confere de novo na agenda, logo antes de salvar
    const ocupados = await calendario.ocupados(
      montarDataHora(dia, "00:00"),
      montarDataHora(somarDias(dia, 1), "00:00"),
    );
    const horario = horariosDoDia({ data: dia, ocupados }).find((h) => h.inicio === isoLocal(inicio));
    if (!horario) return erro(400, "Esse horário não está disponível para agendamento.");
    if (!horario.livre) return erro(409, OCUPADO);

    // Liga ao paciente cadastrado (ou cria o pré-cadastro); na dúvida, marca para revisão da nutricionista
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
    const consentAt = new Date().toISOString();
    const vinculo = await identificarPaciente(token, { nome, sobrenome, email, celular, nascimento }, inicio, consentAt);
    const { pacienteId, kind } = vinculo;

    const googleEventId = await calendario.reservar({
      inicio,
      fim,
      titulo: tituloDoEvento(nome, sobrenome, kind),
      descricao: [
        `Paciente: ${nome} ${sobrenome}`,
        `Celular: ${celular}`,
        `E-mail: ${email}`,
        kind === "first" ? "1ª consulta." : kind === "return" ? "Retorno." : "",
        vinculo.revisar ? "ATENÇÃO: confira o cadastro deste paciente no painel (revisar)." : "",
        "",
        "Agendado pelo site.",
      ].join("\n"),
      dados: { nome, sobrenome, celular, email, ...(pacienteId ? { pacienteId } : {}), ...(kind ? { tipo: kind } : {}) },
    });

    await gravarConsulta({ googleEventId, vinculo, inicio, fim, nome: `${nome} ${sobrenome}`, email, celular, nascimento, consentAt });

    return NextResponse.json<AgendamentoCriado>(
      { inicio: isoLocal(inicio), fim: isoLocal(fim), nome },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof HorarioOcupadoError) return erro(409, OCUPADO);
    console.error(e);
    return erro(502, "Não foi possível salvar na agenda agora. Tente novamente em instantes.");
  }
}
