-- 12 · Evolução do paciente: peso e medidas ao longo do tempo
-- Rode no SQL Editor do Supabase. Pode rodar mais de uma vez.
create table if not exists public.patient_measurements (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  measured_on date not null default current_date,
  weight_kg numeric(5,1) check (weight_kg is null or (weight_kg >= 20 and weight_kg <= 400)),
  body_fat_pct numeric(4,1) check (body_fat_pct is null or (body_fat_pct >= 2 and body_fat_pct <= 70)),
  waist_cm numeric(5,1) check (waist_cm is null or (waist_cm >= 30 and waist_cm <= 250)),
  hip_cm numeric(5,1) check (hip_cm is null or (hip_cm >= 30 and hip_cm <= 250)),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (weight_kg is not null or body_fat_pct is not null or waist_cm is not null or hip_cm is not null)
);
create index if not exists patient_measurements_idx on public.patient_measurements (patient_id, measured_on);

alter table public.patient_measurements enable row level security;

drop policy if exists "Paciente vê a própria evolução" on public.patient_measurements;
create policy "Paciente vê a própria evolução"
  on public.patient_measurements for select
  using (patient_id = auth.uid());

drop policy if exists "Nutricionista gerencia a evolução dos seus pacientes" on public.patient_measurements;
create policy "Nutricionista gerencia a evolução dos seus pacientes"
  on public.patient_measurements for all
  using (exists (select 1 from public.profiles p where p.id = patient_measurements.patient_id and p.nutritionist_id = auth.uid()))
  with check (exists (select 1 from public.profiles p where p.id = patient_measurements.patient_id and p.nutritionist_id = auth.uid()));
