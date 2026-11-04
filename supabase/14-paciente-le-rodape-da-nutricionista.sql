-- 14 · O paciente pode baixar o PDF da própria dieta
-- Rode no SQL Editor do Supabase. Pode rodar mais de uma vez.
-- O PDF leva, no rodapé, os dados e a assinatura da nutricionista. Esta regra deixa o paciente LER (só ler)
-- as configurações da nutricionista dele. Sem ela, o PDF do paciente sai com o rodapé padrão e sem assinatura.
drop policy if exists "Paciente lê as configurações da sua nutricionista" on public.nutritionist_settings;
create policy "Paciente lê as configurações da sua nutricionista"
  on public.nutritionist_settings for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.nutritionist_id = nutritionist_settings.nutritionist_id
  ));
