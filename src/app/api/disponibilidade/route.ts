import { NextResponse, type NextRequest } from "next/server";
import { horariosDoMes, janelaDeMeses, montarDataHora, somarMeses } from "@/core/disponibilidade";
import { mesSchema, type DisponibilidadeMes } from "@/core/schemas";
import { getCalendario } from "@/lib/calendario";
import { erro } from "@/lib/http";

export const dynamic = "force-dynamic";

// GET /api/disponibilidade?mes=2026-10
export async function GET(req: NextRequest) {
  const mes = mesSchema.safeParse(req.nextUrl.searchParams.get("mes"));
  if (!mes.success) return erro(400, "Informe o mês no formato AAAA-MM");

  const { primeiro, ultimo } = janelaDeMeses();
  if (mes.data < primeiro || mes.data > ultimo) {
    return NextResponse.json<DisponibilidadeMes>({ mes: mes.data, dias: {} });
  }

  try {
    const de = montarDataHora(`${mes.data}-01`, "00:00");
    const ate = montarDataHora(`${somarMeses(mes.data, 1)}-01`, "00:00");
    const ocupados = await getCalendario().ocupados(de, ate);
    return NextResponse.json<DisponibilidadeMes>(
      { mes: mes.data, dias: horariosDoMes({ mes: mes.data, ocupados }) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error(e);
    return erro(502, "Não foi possível consultar a agenda agora. Tente novamente em instantes.");
  }
}
