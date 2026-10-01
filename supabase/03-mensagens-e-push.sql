-- ============================================
-- PATCH: RECUPERAÇÃO DE SENHA + NOTIFICAÇÕES PUSH
-- Rode no SQL Editor do Supabase (incremental, não apaga nada)
-- ============================================

-- 1. Coluna pra guardar o token de push (Expo) de cada usuário
alter table public.profiles
  add column if not exists push_token text;

-- 2. Paciente precisa poder atualizar o próprio perfil (pra salvar o push_token)
create policy "Paciente atualiza o próprio perfil"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 3. Tabela de mensagens da nutricionista pro paciente
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.profiles(id) on delete cascade not null,
  nutritionist_id uuid references public.profiles(id) not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz default now()
);

alter table public.messages enable row level security;

-- Reaproveita a função is_nutritionist já criada no patch do painel.
-- Se você ainda não rodou aquele patch, rode-o também (supabase-patch.sql
-- do projeto nutri-painel) — a função abaixo depende dela.
create or replace function public.is_nutritionist(uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = uid and role = 'nutritionist'
  );
$$;

-- Paciente vê apenas as próprias mensagens
create policy "Paciente vê suas mensagens"
  on public.messages for select
  using (auth.uid() = patient_id);

-- Paciente pode marcar como lida (update restrito a linhas próprias)
create policy "Paciente marca mensagem como lida"
  on public.messages for update
  using (auth.uid() = patient_id)
  with check (auth.uid() = patient_id);

-- Nutricionista pode enviar mensagens pros próprios pacientes
create policy "Nutricionista envia mensagens"
  on public.messages for insert
  with check (
    public.is_nutritionist(auth.uid())
    and nutritionist_id = auth.uid()
  );

-- Nutricionista vê as mensagens que enviou
create policy "Nutricionista vê mensagens que enviou"
  on public.messages for select
  using (
    public.is_nutritionist(auth.uid())
    and nutritionist_id = auth.uid()
  );
