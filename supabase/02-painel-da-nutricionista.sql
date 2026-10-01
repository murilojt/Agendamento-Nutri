-- ============================================
-- PATCH: SUPORTE AO PAINEL DA NUTRICIONISTA
-- Rode no SQL Editor do Supabase (projeto já existente)
-- ============================================

-- 1. Liga cada paciente à nutricionista responsável
alter table public.profiles
  add column if not exists nutritionist_id uuid references public.profiles(id);

-- 2. Função auxiliar para checar se o usuário logado é nutricionista,
--    sem causar recursão nas policies de RLS (security definer "pula" o RLS)
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

-- 3. Nutricionista pode ver o próprio perfil e os perfis dos pacientes dela
create policy "Nutricionista vê seus pacientes"
  on public.profiles for select
  using (
    public.is_nutritionist(auth.uid())
    and nutritionist_id = auth.uid()
  );

-- 4. Nutricionista pode criar e ver dietas que ela mesma criou
create policy "Nutricionista cria dietas"
  on public.diets for insert
  with check (
    public.is_nutritionist(auth.uid())
    and created_by = auth.uid()
  );

create policy "Nutricionista vê dietas que criou"
  on public.diets for select
  using (
    public.is_nutritionist(auth.uid())
    and created_by = auth.uid()
  );

create policy "Nutricionista atualiza dietas que criou"
  on public.diets for update
  using (
    public.is_nutritionist(auth.uid())
    and created_by = auth.uid()
  );

-- 5. Nutricionista pode criar, ver, editar e apagar refeições
--    das dietas que ela criou
create policy "Nutricionista cria refeições"
  on public.meals for insert
  with check (
    exists (
      select 1 from public.diets
      where diets.id = meals.diet_id
      and diets.created_by = auth.uid()
    )
  );

create policy "Nutricionista vê refeições de suas dietas"
  on public.meals for select
  using (
    exists (
      select 1 from public.diets
      where diets.id = meals.diet_id
      and diets.created_by = auth.uid()
    )
  );

create policy "Nutricionista atualiza refeições de suas dietas"
  on public.meals for update
  using (
    exists (
      select 1 from public.diets
      where diets.id = meals.diet_id
      and diets.created_by = auth.uid()
    )
  );

create policy "Nutricionista apaga refeições de suas dietas"
  on public.meals for delete
  using (
    exists (
      select 1 from public.diets
      where diets.id = meals.diet_id
      and diets.created_by = auth.uid()
    )
  );

-- 6. RLS da tabela de mensagens (assume que a tabela `public.messages` já
--    existe, criada pelo patch supabase-patch-notifications.sql do nutri-app).
--    Sem isso, a nutricionista não consegue nem ler o histórico de mensagens
--    que ela mesma abre em app/dashboard/patients/[id]/page.tsx, pois a
--    consulta ali usa o client anônimo (sujeito a RLS), não o service role.
alter table public.messages enable row level security;

drop policy if exists "Nutricionista vê mensagens que enviou" on public.messages;
create policy "Nutricionista vê mensagens que enviou"
  on public.messages for select
  using (
    public.is_nutritionist(auth.uid())
    and nutritionist_id = auth.uid()
  );

drop policy if exists "Paciente vê suas próprias mensagens" on public.messages;
create policy "Paciente vê suas próprias mensagens"
  on public.messages for select
  using (patient_id = auth.uid());

-- ============================================
-- 7. PROMOVA SEU PRÓPRIO USUÁRIO A NUTRICIONISTA
-- Faça login uma vez pelo painel (ele vai criar seu profile como
-- 'patient' por padrão), depois rode o comando abaixo trocando
-- o e-mail pelo da sua conta de nutricionista:
-- ============================================
-- update public.profiles
-- set role = 'nutritionist'
-- where id = (select id from auth.users where email = 'seuemail@exemplo.com');
