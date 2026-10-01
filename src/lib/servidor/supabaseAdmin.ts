import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente com a chave de serviço (SUPABASE_SECRET_KEY): ignora o RLS.
 * Só pode ser importado em código de servidor (rotas em app/api). Nunca em componente "use client".
 */
let instancia: SupabaseClient | null | undefined;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (instancia !== undefined) return instancia;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SECRET_KEY;
  instancia = url && chave ? createClient(url, chave, { auth: { autoRefreshToken: false, persistSession: false } }) : null;
  return instancia;
}

export function exigirSupabaseAdmin(): SupabaseClient {
  const c = getSupabaseAdmin();
  if (!c) throw new Error("Supabase não configurado no servidor (NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY).");
  return c;
}
