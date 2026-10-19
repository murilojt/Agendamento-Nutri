import "server-only";
import { createClient } from "@supabase/supabase-js";
import { exigirSupabaseAdmin } from "./supabaseAdmin";

/** Reconhece, sem expor a chave, se o valor configurado parece ser a chave pública (anon/publishable) em vez da secreta. */
export function tipoDaChave(chave: string | undefined): "ausente" | "publica" | "secreta" | "desconhecida" {
  if (!chave) return "ausente";
  if (chave.startsWith("sb_publishable_")) return "publica";
  if (chave.startsWith("sb_secret_")) return "secreta";
  try {
    const role = JSON.parse(Buffer.from(chave.split(".")[1] ?? "", "base64url").toString("utf8")).role;
    if (role === "anon") return "publica";
    if (role === "service_role") return "secreta";
  } catch {
    // não é um JWT
  }
  return "desconhecida";
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Cliente autenticado como o dono do access token (e não como service role), para confirmar quem chama a API. */
function clienteDoUsuario(accessToken: string) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "", {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

/** Devolve o usuário dono do token, ou null se o token for inválido. */
export async function usuarioDoToken(accessToken: string | null | undefined) {
  if (!accessToken) return null;
  const {
    data: { user },
  } = await clienteDoUsuario(accessToken).auth.getUser();
  return user;
}

/** Confirma que o access token pertence a uma nutricionista logada. Lança AuthError (401/403) se não for. */
export async function requireNutritionist(accessToken: string | undefined) {
  if (!accessToken) throw new AuthError("Não autenticado.", 401);

  const caller = await usuarioDoToken(accessToken);
  if (!caller) throw new AuthError("Não autenticado.", 401);

  const { data: perfil, error } = await exigirSupabaseAdmin().from("profiles").select("role").eq("id", caller.id).single();
  // Sem conseguir ler o perfil com a chave de serviço, o problema é de configuração, não de permissão da pessoa
  if (error || !perfil) {
    const dica = tipoDaChave(process.env.SUPABASE_SECRET_KEY);
    console.error("requireNutritionist: não foi possível ler o perfil com a chave de serviço.", error?.message, `(tipo da chave: ${dica})`);
    throw new AuthError(
      dica === "publica"
        ? "A chave SUPABASE_SECRET_KEY configurada no servidor é a chave pública (anon/publishable). Troque pela chave secreta (service_role) na Vercel e faça um novo deploy."
        : "O servidor não conseguiu ler o seu perfil. Confira a SUPABASE_SECRET_KEY na Vercel (deve ser a chave secreta/service_role do mesmo projeto) e faça um novo deploy.",
      500,
    );
  }
  if (perfil.role !== "nutritionist") throw new AuthError("Sem permissão.", 403);

  return caller;
}
