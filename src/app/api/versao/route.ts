import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/versao: mostra qual versão do código está no ar (útil para conferir se um deploy novo foi publicado)
export function GET() {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA ?? null;
  return NextResponse.json(
    {
      commit: commit ? commit.slice(0, 7) : "desconhecido",
      mensagem: process.env.VERCEL_GIT_COMMIT_MESSAGE?.split("\n")[0] ?? null,
      ramo: process.env.VERCEL_GIT_COMMIT_REF ?? null,
      ambiente: process.env.VERCEL_ENV ?? "local",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
