import { createClient } from "@supabase/supabase-js";

/**
 * Cliente do Supabase para o navegador (usa só a chave pública "anon"; quem protege os dados é o RLS do banco).
 * Sem as variáveis de ambiente o site continua funcionando: só a área de contas fica indisponível.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigurado = Boolean(url && chave);

export const supabase = createClient(url || "https://nao-configurado.supabase.co", chave || "nao-configurado");

export const MSG_NAO_CONFIGURADO =
  "A área de contas ainda não foi configurada. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.";

/** Para onde cada tipo de conta vai depois de entrar. */
export const destinoDoPerfil = (role: string | null | undefined) => (role === "nutritionist" ? "/admin" : "/paciente");
