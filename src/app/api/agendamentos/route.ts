import { NextResponse, type NextRequest } from "next/server";
import { CONFIG_AGENDA } from "@/core/config";
import { dataLocal, horariosDoDia, isoLocal, montarDataHora, somarDias } from "@/core/disponibilidade";
import { novoAgendamentoSchema, type AgendamentoCriado } from "@/core/schemas";
import { getCalendario, HorarioOcupadoError } from "@/lib/calendario";
import { erro, erroValidacao } from "@/lib/http";

export const dynamic = "force-dynamic";

const OCUPADO = "Esse horário acabou de ser preenchido. Escolha outro.";

// POST /api/agendamentos
export async function POST(req: NextRequest) {
  const dados = novoAgendamentoSchema.safeParse(await req.json().catch(() => null));
  if (!dados.success) return erroValidacao(dados.error);

  const { nome, sobrenome, celular, email } = dados.data;
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

    await calendario.reservar({
      inicio,
      fim,
      titulo: `Consulta: ${nome} ${sobrenome}`,
      descricao: [`Paciente: ${nome} ${sobrenome}`, `Celular: ${celular}`, `E-mail: ${email}`, "", "Agendado pelo site."].join("\n"),
      dados: { nome, sobrenome, celular, email },
    });

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
