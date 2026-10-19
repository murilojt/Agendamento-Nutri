-- 13 · Forçar a troca de senha do paciente
-- Rode no SQL Editor do Supabase. Pode rodar mais de uma vez.
-- Quando a nutricionista define uma senha provisória para o paciente, esta marca obriga a troca no próximo acesso.
alter table public.profiles add column if not exists must_change_password boolean not null default false;
