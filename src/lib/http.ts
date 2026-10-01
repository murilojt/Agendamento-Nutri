import { NextResponse } from "next/server";
import type { ZodError } from "zod";
import type { ErroApi } from "@/core/schemas";

export function erro(status: number, mensagem: string, detalhes?: Record<string, string[]>) {
  return NextResponse.json<ErroApi>({ erro: mensagem, detalhes }, { status });
}

export function erroValidacao(e: ZodError) {
  return erro(400, "Confira os campos destacados", e.flatten().fieldErrors as Record<string, string[]>);
}
