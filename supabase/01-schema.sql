-- ============================================
-- SCHEMA INICIAL - NUTRI APP
-- Rode este script no SQL Editor do Supabase
-- ============================================

-- Tabela de perfis (estende auth.users do Supabase)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  role text not null default 'patient' check (role in ('patient', 'nutritionist')),
  created_at timestamptz default now()
);

-- Tabela de dietas (uma dieta pertence a um paciente, criada por uma nutricionista)
create table public.diets (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.profiles(id) on delete cascade not null,
  created_by uuid references public.profiles(id) not null,
  title text not null default 'Plano alimentar',
  active boolean not null default true,
  created_at timestamptz default now()
);

-- Tabela de refeições dentro de uma dieta
create table public.meals (
  id uuid primary key default gen_random_uuid(),
  diet_id uuid references public.diets(id) on delete cascade not null,
  meal_name text not null,       -- ex: "Café da manhã"
  meal_time time,                -- ex: 07:30
  description text not null,     -- ex: "2 ovos mexidos + 1 fatia de pão integral"
  created_at timestamptz default now()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- Garante que cada paciente só veja os próprios dados
-- ============================================

alter table public.profiles enable row level security;
alter table public.diets enable row level security;
alter table public.meals enable row level security;

-- Paciente pode ver e editar o próprio perfil
create policy "Usuário vê o próprio perfil"
  on public.profiles for select
  using (auth.uid() = id);

-- Paciente só vê as próprias dietas
create policy "Paciente vê apenas suas dietas"
  on public.diets for select
  using (auth.uid() = patient_id);

-- Paciente só vê refeições de dietas que são dele
create policy "Paciente vê apenas refeições de suas dietas"
  on public.meals for select
  using (
    exists (
      select 1 from public.diets
      where diets.id = meals.diet_id
      and diets.patient_id = auth.uid()
    )
  );

-- Função para criar o profile automaticamente quando um usuário se cadastra
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'patient');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- OBS: A nutricionista (role = 'nutritionist') precisa de policies
-- adicionais de INSERT/UPDATE para cadastrar pacientes e dietas.
-- Isso normalmente é feito a partir do painel web dela, com um
-- usuário que tenha role = 'nutritionist' e policies próprias, ex:
--
-- create policy "Nutricionista cria dietas"
--   on public.diets for insert
--   with check (
--     exists (select 1 from public.profiles where id = auth.uid() and role = 'nutritionist')
--   );
-- ============================================
