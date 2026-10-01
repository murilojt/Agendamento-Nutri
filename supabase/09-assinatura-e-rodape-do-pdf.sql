-- ============================================
-- PATCH 09: ASSINATURA E DADOS DO RODAPÉ DO PDF
-- Rode depois do 06. Incremental: pode rodar mais de uma vez.
-- Guarda, para cada nutricionista, a imagem da assinatura e os dados que saem no rodapé do PDF da dieta
-- (nome, CRN, telefone, e-mail). Só a própria nutricionista lê e altera; o paciente não tem acesso.
-- ============================================

create table if not exists public.nutritionist_settings (
  nutritionist_id uuid primary key references public.profiles(id) on delete cascade,
  clinic_name text,
  display_name text,
  crn text,
  phone text,
  email text,
  -- imagem da assinatura como data URL (PNG/JPEG já reduzida pelo painel, poucas dezenas de KB)
  signature_data text check (signature_data is null or (length(signature_data) <= 400000 and signature_data like 'data:image/%;base64,%')),
  updated_at timestamptz not null default now()
);

alter table public.nutritionist_settings enable row level security;

drop policy if exists "Nutricionista lê as próprias configurações" on public.nutritionist_settings;
create policy "Nutricionista lê as próprias configurações"
  on public.nutritionist_settings for select
  using (public.is_nutritionist(auth.uid()) and nutritionist_id = auth.uid());

drop policy if exists "Nutricionista cria as próprias configurações" on public.nutritionist_settings;
create policy "Nutricionista cria as próprias configurações"
  on public.nutritionist_settings for insert
  with check (public.is_nutritionist(auth.uid()) and nutritionist_id = auth.uid());

drop policy if exists "Nutricionista altera as próprias configurações" on public.nutritionist_settings;
create policy "Nutricionista altera as próprias configurações"
  on public.nutritionist_settings for update
  using (public.is_nutritionist(auth.uid()) and nutritionist_id = auth.uid())
  with check (public.is_nutritionist(auth.uid()) and nutritionist_id = auth.uid());
