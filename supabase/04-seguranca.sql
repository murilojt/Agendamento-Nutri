-- ============================================
-- PATCH: ENDURECIMENTO DE SEGURANÇA (RLS)
-- Rode no SQL Editor do Supabase (incremental, não apaga nada)
--
-- Contexto: as policies de UPDATE existentes em "profiles" e
-- "messages" usam auth.uid() = id só pra checar o DONO da linha,
-- mas RLS não restringe QUAIS colunas podem mudar. Isso permitia
-- que, pelo próprio client (anon key), um paciente:
--   1) alterasse o próprio "role" pra 'nutritionist'
--      (supabase.from('profiles').update({ role: 'nutritionist' })...)
--   2) reescrevesse o "body" de uma mensagem da nutricionista
--      (o app só faz update({ read: true }), mas nada no banco impedia
--      um client malicioso de mandar outro payload)
--
-- As triggers abaixo bloqueiam essas duas mudanças quando feitas
-- pelo próprio usuário autenticado (auth.uid()), sem afetar updates
-- feitos via SQL Editor / service role (usados pra promover uma
-- nutricionista manualmente ou por um painel administrativo).
-- ============================================

-- 1. Paciente não pode alterar o próprio "role"
create or replace function public.prevent_self_role_change()
returns trigger as $$
begin
  if NEW.role is distinct from OLD.role and auth.uid() = OLD.id then
    raise exception 'Você não pode alterar seu próprio role.';
  end if;
  return NEW;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_prevent_self_role_change on public.profiles;
create trigger trg_prevent_self_role_change
  before update on public.profiles
  for each row execute procedure public.prevent_self_role_change();

-- 2. Paciente não pode alterar o conteúdo ("body") de uma mensagem,
--    só o "read" (é o único update que o app faz de fato)
create or replace function public.prevent_message_body_change_by_patient()
returns trigger as $$
begin
  if NEW.body is distinct from OLD.body and auth.uid() = OLD.patient_id then
    raise exception 'Paciente não pode alterar o conteúdo da mensagem.';
  end if;
  return NEW;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_prevent_message_body_change on public.messages;
create trigger trg_prevent_message_body_change
  before update on public.messages
  for each row execute procedure public.prevent_message_body_change_by_patient();
