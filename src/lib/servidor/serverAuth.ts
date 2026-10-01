import "server-only";
import { createClient } from "@supabase/supabase-js";
import { exigirSupabaseAdmin } from "./supabaseAdmin";

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

  const { data: perfil } = await exigirSupabaseAdmin().from("profiles").select("role").eq("id", caller.id).single();
  if (perfil?.role !== "nutritionist") throw new AuthError("Sem permissão.", 403);

  return caller;
}
