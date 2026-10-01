-- ============================================
-- PATCH 05: AGENDAMENTOS VINCULADOS AO PACIENTE
-- Rode no SQL Editor do Supabase, depois dos patches 01 a 04.
-- (incremental: pode rodar mais de uma vez)
--
-- A Google Agenda continua sendo a fonte dos horários livres.
-- Aqui ficam o vínculo consulta <-> paciente e o histórico.
-- ============================================

-- 1. E-mail no perfil: é por ele que uma consulta marcada sem login
--    é ligada ao paciente já cadastrado.
alter table public.profiles add column if not exists email text;

update public.profiles p
set email = lower(u.email)
from auth.users u
where u.id = p.id and p.email is null;

create index if not exists profiles_email_idx on public.profiles (lower(email));

-- Novos usuários passam a ter o e-mail copiado para o perfil
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role, email)
  values (new.id, new.raw_user_meta_data->>'full_name', 'patient', lower(new.email));
  return new;
end;
$$ language plpgsql security definer;

-- 2. Consultas marcadas pelo site
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  google_event_id text not null unique,            -- id do evento na Google Agenda
  patient_id uuid references public.profiles(id) on delete set null,  -- null = marcou sem ter cadastro
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  guest_name text not null,
  guest_email text not null,
  guest_phone text not null,
  created_at timestamptz not null default now()
);

create index if not exists appointments_patient_idx on public.appointments (patient_id, starts_at);
create index if not exists appointments_starts_idx on public.appointments (starts_at);

alter table public.appointments enable row level security;

-- Paciente vê só as próprias consultas
drop policy if exists "Paciente vê suas consultas" on public.appointments;
create policy "Paciente vê suas consultas"
  on public.appointments for select
  using (auth.uid() = patient_id);

-- Nutricionista vê todas as consultas da clínica
drop policy if exists "Nutricionista vê as consultas" on public.appointments;
create policy "Nutricionista vê as consultas"
  on public.appointments for select
  using (public.is_nutritionist(auth.uid()));

-- Não há policy de INSERT/UPDATE: quem grava é a API do site, com a chave de serviço.
