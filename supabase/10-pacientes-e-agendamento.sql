-- 10 · Pacientes e agendamento: vínculo automático, pré-cadastro e revisão
-- Rode no SQL Editor do Supabase. Pode rodar mais de uma vez.

-- Pacientes
alter table public.profiles add column if not exists was_seen_before boolean not null default false;
alter table public.profiles add column if not exists registration_source text;
alter table public.profiles add column if not exists consent_at timestamptz;
alter table public.profiles add column if not exists phone_digits text
  generated always as (regexp_replace(coalesce(phone, ''), '\D', '', 'g')) stored;
create index if not exists profiles_phone_digits_idx on public.profiles (phone_digits);

-- Quem já tem dieta montada já foi atendido
update public.profiles p set was_seen_before = true
where p.role = 'patient' and not p.was_seen_before
  and exists (select 1 from public.diets d where d.patient_id = p.id);

-- Consultas
alter table public.appointments drop constraint if exists appointments_status_check;
alter table public.appointments add constraint appointments_status_check
  check (status in ('confirmed', 'cancelled', 'completed', 'no_show'));
alter table public.appointments add column if not exists kind text
  check (kind in ('first', 'return'));
alter table public.appointments add column if not exists guest_birth_date date;
alter table public.appointments add column if not exists needs_review boolean not null default false;
alter table public.appointments add column if not exists review_reason text;
alter table public.appointments add column if not exists suggested_patient_id uuid
  references public.profiles (id) on delete set null;
alter table public.appointments add column if not exists consent_at timestamptz;
create index if not exists appointments_needs_review_idx on public.appointments (starts_at)
  where needs_review;
