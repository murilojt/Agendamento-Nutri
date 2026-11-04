-- 15 · Medidas caseiras (colher de sopa, unidade, fatia...) além de gramas
-- Rode no SQL Editor do Supabase. Pode rodar mais de uma vez.
-- ATENÇÃO: precisa do 06 (tabelas foods e meal_items) rodado antes.

-- 1) Medidas de cada alimento: "1 colher de sopa de arroz = 25 g"
create table if not exists public.food_measures (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references public.foods(id) on delete cascade,
  name text not null,                -- singular: "colher de sopa"
  plural text,                       -- plural: "colheres de sopa" (se vazio, usa o singular)
  grams numeric(8,2) not null check (grams > 0),   -- gramas de UMA unidade
  created_at timestamptz not null default now()
);
create unique index if not exists food_measures_unica on public.food_measures (food_id, lower(name));

alter table public.food_measures enable row level security;
drop policy if exists "Nutricionista gerencia medidas dos alimentos" on public.food_measures;
create policy "Nutricionista gerencia medidas dos alimentos"
  on public.food_measures for all
  using (public.is_nutritionist(auth.uid()))
  with check (public.is_nutritionist(auth.uid()));

-- 2) Como cada alimento da dieta foi prescrito. A quantidade em gramas (quantity_g) continua sendo
--    a fonte dos cálculos; estas colunas guardam só a forma de mostrar ("2 colheres de sopa").
alter table public.meal_items add column if not exists unit_name text;
alter table public.meal_items add column if not exists unit_plural text;
alter table public.meal_items add column if not exists unit_grams numeric(8,2) check (unit_grams is null or unit_grams > 0);
alter table public.meal_items add column if not exists unit_qty numeric(8,2) check (unit_qty is null or unit_qty > 0);
