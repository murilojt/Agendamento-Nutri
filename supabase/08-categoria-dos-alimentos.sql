-- ============================================
-- PATCH 08: CATEGORIA E FAVORITOS DOS ALIMENTOS
-- Rode depois do 06. Incremental: pode rodar mais de uma vez.
-- Guarda a categoria (ex.: "Cereais e derivados") dos alimentos importados da TBCA/TACO,
-- para filtrar a lista no painel.
-- ============================================
alter table public.foods add column if not exists category text;
create index if not exists foods_category_idx on public.foods (category);
alter table public.foods add column if not exists favorite boolean not null default false;
-- Favoritos (estrela) aparecem primeiro na busca do montador de dietas.
-- A origem ('taco', 'tbca', 'referencia', 'custom') já cabe na coluna "source" criada no patch 06.
