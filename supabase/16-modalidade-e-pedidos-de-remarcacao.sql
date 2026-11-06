-- 16 · Modalidade da consulta (presencial/online) e pedidos de remarcação feitos pelo paciente
-- Rode no SQL Editor do Supabase. Pode rodar mais de uma vez.
-- Precisa do 05 (tabela appointments) rodado antes.

-- 1) Modalidade de cada consulta
alter table public.appointments add column if not exists modality text;
alter table public.appointments drop constraint if exists appointments_modality_check;
alter table public.appointments add constraint appointments_modality_check
  check (modality is null or modality in ('in_person', 'online'));

-- 2) Pedidos de remarcação: o paciente pede, a nutricionista resolve (quem grava é a API do site)
create table if not exists public.reschedule_requests (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  patient_id uuid not null references public.profiles (id) on delete cascade,
  note text,                                                   -- ex.: "prefiro terças ou quintas à tarde"
  status text not null default 'pending' check (status in ('pending', 'done', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
-- só um pedido em aberto por consulta
create unique index if not exists reschedule_requests_pending_uk on public.reschedule_requests (appointment_id) where status = 'pending';
create index if not exists reschedule_requests_patient_idx on public.reschedule_requests (patient_id, created_at desc);

alter table public.reschedule_requests enable row level security;

drop policy if exists "Paciente vê os próprios pedidos de remarcação" on public.reschedule_requests;
create policy "Paciente vê os próprios pedidos de remarcação"
  on public.reschedule_requests for select
  using (patient_id = auth.uid());

drop policy if exists "Nutricionista vê os pedidos de remarcação" on public.reschedule_requests;
create policy "Nutricionista vê os pedidos de remarcação"
  on public.reschedule_requests for select
  using (public.is_nutritionist(auth.uid()));
-- Não há policy de INSERT/UPDATE: quem grava é a API do site, com a chave de serviço.
