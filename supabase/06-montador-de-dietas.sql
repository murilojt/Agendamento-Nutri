-- ============================================
-- PATCH 06: MONTADOR DE DIETAS (painel da nutricionista)
-- Rode depois dos patches 01 a 05. Incremental: pode rodar mais de uma vez.
-- ============================================

-- 1. Dados do paciente usados na ficha e nos cálculos (g/kg)
alter table public.profiles
  add column if not exists phone text,
  add column if not exists birth_date date,
  add column if not exists weight_kg numeric(5,2),
  add column if not exists height_cm numeric(5,1);

-- A nutricionista edita os dados dos próprios pacientes
drop policy if exists "Nutricionista atualiza seus pacientes" on public.profiles;
create policy "Nutricionista atualiza seus pacientes"
  on public.profiles for update
  using (public.is_nutritionist(auth.uid()) and nutritionist_id = auth.uid())
  with check (public.is_nutritionist(auth.uid()) and nutritionist_id = auth.uid());

-- Ninguém muda o "role" de um perfil pelo navegador (nem o próprio, nem de paciente).
-- Promoções continuam possíveis pelo SQL Editor e pelo servidor (chave de serviço), onde auth.uid() é nulo.
create or replace function public.prevent_self_role_change()
returns trigger as $$
begin
  if NEW.role is distinct from OLD.role and auth.uid() is not null then
    raise exception 'O perfil de acesso não pode ser alterado por aqui.';
  end if;
  return NEW;
end;
$$ language plpgsql security definer set search_path = public;

-- 2. Protocolo e textos da dieta
alter table public.diets
  add column if not exists objective text,
  add column if not exists target_kcal numeric(7,1),
  add column if not exists target_protein_gkg numeric(5,2),
  add column if not exists target_fat_gkg numeric(5,2),
  add column if not exists target_carb_gkg numeric(5,2),
  add column if not exists supplements text,
  add column if not exists recipes text,
  add column if not exists notes text;

-- 3. Refeições: ordem e observações; a descrição passa a ser opcional (os alimentos ficam em meal_items)
alter table public.meals alter column description set default '';
alter table public.meals
  add column if not exists position int not null default 0,
  add column if not exists notes text;

-- 4. Banco de alimentos (valores por 100 g), compartilhado entre nutricionistas
create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source text not null default 'custom',   -- 'taco' | 'referencia' | 'custom'
  kcal numeric(7,2) not null default 0,
  protein_g numeric(7,2) not null default 0,
  fat_g numeric(7,2) not null default 0,
  carb_g numeric(7,2) not null default 0,
  fiber_g numeric(7,2) not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists foods_name_idx on public.foods (lower(name));

alter table public.foods enable row level security;
drop policy if exists "Nutricionista gerencia alimentos" on public.foods;
create policy "Nutricionista gerencia alimentos"
  on public.foods for all
  using (public.is_nutritionist(auth.uid()))
  with check (public.is_nutritionist(auth.uid()));

-- 5. Alimentos de cada refeição. Guarda os totais da porção (um "retrato" do momento),
--    assim o paciente enxerga a dieta sem precisar de acesso ao banco de alimentos.
create table if not exists public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals(id) on delete cascade,
  food_id uuid references public.foods(id) on delete set null,
  name text not null,
  quantity_g numeric(8,2) not null check (quantity_g > 0),
  kcal numeric(8,2) not null default 0,
  protein_g numeric(8,2) not null default 0,
  fat_g numeric(8,2) not null default 0,
  carb_g numeric(8,2) not null default 0,
  fiber_g numeric(8,2) not null default 0,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists meal_items_meal_idx on public.meal_items (meal_id, position);

alter table public.meal_items enable row level security;

drop policy if exists "Paciente vê alimentos de suas refeições" on public.meal_items;
create policy "Paciente vê alimentos de suas refeições"
  on public.meal_items for select
  using (exists (
    select 1 from public.meals m join public.diets d on d.id = m.diet_id
    where m.id = meal_items.meal_id and d.patient_id = auth.uid()
  ));

drop policy if exists "Nutricionista gerencia alimentos das refeições" on public.meal_items;
create policy "Nutricionista gerencia alimentos das refeições"
  on public.meal_items for all
  using (exists (
    select 1 from public.meals m join public.diets d on d.id = m.diet_id
    where m.id = meal_items.meal_id and d.created_by = auth.uid()
  ))
  with check (exists (
    select 1 from public.meals m join public.diets d on d.id = m.diet_id
    where m.id = meal_items.meal_id and d.created_by = auth.uid()
  ));

-- 6. Refeições favoritas (modelos reaproveitáveis de cada nutricionista)
create table if not exists public.favorite_meals (
  id uuid primary key default gen_random_uuid(),
  nutritionist_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  meal_time time,
  items jsonb not null default '[]',        -- [{ food_id, name, quantity_g, kcal, protein_g, fat_g, carb_g, fiber_g }]
  created_at timestamptz not null default now()
);

alter table public.favorite_meals enable row level security;
drop policy if exists "Nutricionista gerencia suas favoritas" on public.favorite_meals;
create policy "Nutricionista gerencia suas favoritas"
  on public.favorite_meals for all
  using (public.is_nutritionist(auth.uid()) and nutritionist_id = auth.uid())
  with check (public.is_nutritionist(auth.uid()) and nutritionist_id = auth.uid());

-- 7. Anamnese (uma por paciente)
create table if not exists public.anamneses (
  patient_id uuid primary key references public.profiles(id) on delete cascade,
  main_complaint text,
  health_history text,
  medications text,
  allergies text,
  habits text,
  goals text,
  updated_at timestamptz not null default now()
);

alter table public.anamneses enable row level security;
drop policy if exists "Nutricionista gerencia anamnese dos seus pacientes" on public.anamneses;
create policy "Nutricionista gerencia anamnese dos seus pacientes"
  on public.anamneses for all
  using (public.is_nutritionist(auth.uid()) and exists (
    select 1 from public.profiles p where p.id = anamneses.patient_id and p.nutritionist_id = auth.uid()))
  with check (public.is_nutritionist(auth.uid()) and exists (
    select 1 from public.profiles p where p.id = anamneses.patient_id and p.nutritionist_id = auth.uid()));
-- O paciente NÃO tem acesso à anamnese (é anotação clínica da nutricionista).
