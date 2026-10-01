import { supabase } from "./supabase";
import { comPadrao, type ConfigRodape } from "./rodapePdf.ts";

/** Lê as configurações da nutricionista logada (com o padrão aplicado). Sem o patch SQL 09, devolve só o padrão. */
export async function carregarConfigRodape(): Promise<{ config: ConfigRodape; tabelaExiste: boolean }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { config: comPadrao(null), tabelaExiste: true };
  const { data, error } = await supabase.from("nutritionist_settings").select("clinic_name, display_name, crn, phone, email, signature_data").eq("nutritionist_id", user.id).maybeSingle();
  if (error) return { config: comPadrao(null), tabelaExiste: false };
  return { config: comPadrao(data), tabelaExiste: true };
}

export async function salvarConfigRodape(c: ConfigRodape): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Sessão expirada. Entre novamente.";
  const { error } = await supabase.from("nutritionist_settings").upsert({ nutritionist_id: user.id, ...c, updated_at: new Date().toISOString() }, { onConflict: "nutritionist_id" });
  return error ? "Não foi possível salvar. Confirme que o patch SQL 09 foi aplicado no Supabase." : null;
}
