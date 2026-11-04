-- Dados de TESTE para um paciente (opcional, só para você ver o sistema funcionando).
-- Como usar:
--   1) Crie o paciente em /admin/pacientes/novo (ex.: e-mail paciente.teste@exemplo.com, senha provisória à sua escolha).
--   2) Troque o e-mail na linha "v_email" abaixo e rode este script no SQL Editor do Supabase.
-- Ele cria uma dieta de exemplo (2 refeições, substitutos, suplementos, receitas) e 3 medições de peso para esse paciente.
-- É seguro rodar de novo: se a dieta de teste já existir, não duplica. Para apagar: delete a dieta "Plano de teste" na ficha do paciente.
do $$
declare
  v_email text := 'paciente.teste@exemplo.com';   -- <<< TROQUE PELO E-MAIL DO PACIENTE DE TESTE
  v_paciente uuid;
  v_nutri uuid;
  v_diet uuid;
  v_m1 uuid; v_m2 uuid; v_m3 uuid;
  v_i1 uuid; v_i2 uuid; v_i3 uuid;
begin
  select id, nutritionist_id into v_paciente, v_nutri
  from public.profiles where role = 'patient' and lower(email) = lower(v_email);
  if v_paciente is null then
    raise exception 'Paciente % não encontrado. Crie primeiro em /admin/pacientes/novo e confira o e-mail.', v_email;
  end if;
  if v_nutri is null then
    select id into v_nutri from public.profiles where role = 'nutritionist' order by created_at limit 1;
    update public.profiles set nutritionist_id = v_nutri where id = v_paciente;
  end if;

  if exists (select 1 from public.diets where patient_id = v_paciente and title = 'Plano de teste') then
    raise notice 'A dieta de teste já existe para %. Nada foi alterado.', v_email;
    return;
  end if;

  update public.profiles
     set phone = coalesce(phone, '11999990000'), birth_date = coalesce(birth_date, date '1992-04-15'),
         weight_kg = coalesce(weight_kg, 72.4), height_cm = coalesce(height_cm, 168)
   where id = v_paciente;

  insert into public.diets (patient_id, created_by, title, active, objective, supplements, recipes)
  values (v_paciente, v_nutri, 'Plano de teste', true,
    'Emagrecimento gradual (cerca de 0,5 kg por semana). Beba 2 litros de água por dia e evite pular refeições.',
    E'Whey protein: 1 dose após o treino.\nÔmega 3: 1 cápsula no almoço.',
    E'Panqueca de banana\n1 banana madura, 1 ovo, 2 colheres de aveia. Misture e doure em frigideira antiaderente.')
  returning id into v_diet;

  insert into public.meals (diet_id, meal_name, meal_time, notes, description, position)
  values (v_diet, 'Café da manhã', '07:30', 'Pode trocar o pão por tapioca.', '', 0) returning id into v_m1;
  insert into public.meals (diet_id, meal_name, meal_time, notes, description, position)
  values (v_diet, 'Almoço', '12:30', null, '', 1) returning id into v_m2;
  insert into public.meals (diet_id, meal_name, meal_time, notes, description, position)
  values (v_diet, 'Jantar', '19:30', 'Prefira preparações leves.', '', 2) returning id into v_m3;

  insert into public.meal_items (meal_id, name, quantity_g, kcal, protein_g, fat_g, carb_g, fiber_g, position)
  values (v_m1, 'Pão, de forma, integral', 50, 126, 4.8, 1.8, 22.5, 3.5, 0) returning id into v_i1;
  insert into public.meal_items (meal_id, name, quantity_g, kcal, protein_g, fat_g, carb_g, fiber_g, position)
  values (v_m1, 'Ovo, de galinha, inteiro, cozido', 100, 146, 13.3, 9.5, 0.6, 0, 1) returning id into v_i2;
  insert into public.meal_items (meal_id, name, quantity_g, kcal, protein_g, fat_g, carb_g, fiber_g, position)
  values (v_m1, 'Mamão, papaia, cru', 150, 61, 0.7, 0.2, 15.5, 2.6, 2);
  insert into public.meal_items (meal_id, name, quantity_g, kcal, protein_g, fat_g, carb_g, fiber_g, position)
  values (v_m2, 'Arroz, integral, cozido', 120, 130, 2.9, 1.0, 27.0, 2.1, 0) returning id into v_i3;
  insert into public.meal_items (meal_id, name, quantity_g, kcal, protein_g, fat_g, carb_g, fiber_g, position)
  values (v_m2, 'Feijão, carioca, cozido', 100, 76, 4.8, 0.5, 13.6, 8.5, 1);
  insert into public.meal_items (meal_id, name, quantity_g, kcal, protein_g, fat_g, carb_g, fiber_g, position)
  values (v_m2, 'Frango, peito, sem pele, grelhado', 120, 191, 38.4, 3.0, 0, 0, 2);
  insert into public.meal_items (meal_id, name, quantity_g, kcal, protein_g, fat_g, carb_g, fiber_g, position)
  values (v_m3, 'Ovo, de galinha, inteiro, cozido', 100, 146, 13.3, 9.5, 0.6, 0, 0);
  insert into public.meal_items (meal_id, name, quantity_g, kcal, protein_g, fat_g, carb_g, fiber_g, position)
  values (v_m3, 'Arroz, integral, cozido', 80, 87, 1.9, 0.7, 18.0, 1.4, 1);

  -- Substitutos (só se o script 11 já foi rodado)
  if to_regclass('public.meal_item_substitutes') is not null then
    insert into public.meal_item_substitutes (item_id, name, quantity_g, kcal, protein_g, fat_g, carb_g, fiber_g, position) values
      (v_i1, 'Tapioca, goma', 40, 100, 0, 0, 25, 0, 0),
      (v_i1, 'Cuscuz de milho, cozido', 90, 100, 2.1, 0.7, 21, 1.5, 1),
      (v_i3, 'Batata-doce, cozida', 160, 123, 1.9, 0.2, 28.8, 3.8, 0);
  end if;

  -- Evolução (só se o script 12 já foi rodado)
  if to_regclass('public.patient_measurements') is not null then
    insert into public.patient_measurements (patient_id, measured_on, weight_kg, waist_cm, created_by) values
      (v_paciente, current_date - 60, 75.8, 88, v_nutri),
      (v_paciente, current_date - 30, 74.0, 86, v_nutri),
      (v_paciente, current_date,      72.4, 84, v_nutri);
  end if;

  raise notice 'Pronto! Dieta de teste criada para %.', v_email;
end $$;
