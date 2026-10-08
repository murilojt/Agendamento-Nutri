-- 11 · Substitutos dos alimentos da dieta
-- Rode no SQL Editor do Supabase. Pode rodar mais de uma vez.
-- Guarda, para cada alimento da dieta (meal_items), as opções que o paciente pode comer no lugar.
create table if not exists public.meal_item_substitutes (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.meal_items(id) on delete cascade,
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
create index if not exists meal_item_substitutes_item_idx on public.meal_item_substitutes (item_id, position);

alter table public.meal_item_substitutes enable row level security;

drop policy if exists "Paciente vê substitutos da sua dieta" on public.meal_item_substitutes;
create policy "Paciente vê substitutos da sua dieta"
  on public.meal_item_substitutes for select
  using (exists (
    select 1 from public.meal_items i
    join public.meals m on m.id = i.meal_id
    join public.diets d on d.id = m.diet_id
    where i.id = meal_item_substitutes.item_id and d.patient_id = auth.uid()
  ));

drop policy if exists "Nutricionista gerencia substitutos" on public.meal_item_substitutes;
create policy "Nutricionista gerencia substitutos"
  on public.meal_item_substitutes for all
  using (exists (
    select 1 from public.meal_items i
    join public.meals m on m.id = i.meal_id
    join public.diets d on d.id = m.diet_id
    where i.id = meal_item_substitutes.item_id and d.created_by = auth.uid()
  ))
  with check (exists (
    select 1 from public.meal_items i
    join public.meals m on m.id = i.meal_id
    join public.diets d on d.id = m.diet_id
    where i.id = meal_item_substitutes.item_id and d.created_by = auth.uid()
  ));
