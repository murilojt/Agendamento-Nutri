-- 17 · Nutricionista oficial da clínica
-- Faz do usuário com o e-mail abaixo a ÚNICA nutricionista do sistema: passa para ela todos os pacientes,
-- dietas, mensagens, refeições favoritas, assinatura e dados do PDF e, no fim, APAGA a(s) outra(s) conta(s) de nutricionista.
--
-- ANTES de rodar:
--   1) No Supabase, vá em Authentication → Users → Add user → Create new user.
--      Informe o e-mail (o mesmo da linha v_email abaixo) e a senha, e MARQUE "Auto Confirm User".
--      (A senha é digitada só lá: não a coloque neste arquivo nem no GitHub.)
--   2) Rode este script no SQL Editor.
-- Depois, entre no site com o e-mail e a senha novos e troque a senha por uma só sua.
--
-- Para só transferir e NÃO apagar a conta antiga, troque v_apagar_antigo por false.
-- Pode rodar mais de uma vez: se já estiver tudo no usuário oficial, não muda nada.
do $$
declare
  v_email text := 'clinica.ayllus@gmail.com';   -- e-mail oficial da nutricionista
  v_apagar_antigo boolean := true;
  v_novo uuid;
  v_antigo record;
begin
  select id into v_novo from public.profiles where lower(email) = lower(v_email);
  if v_novo is null then
    raise exception 'Não achei o usuário %. Crie primeiro em Authentication → Users → Add user (com "Auto Confirm User") e rode de novo.', v_email;
  end if;

  -- o usuário oficial vira nutricionista
  update public.profiles set role = 'nutritionist' where id = v_novo;

  for v_antigo in select id from public.profiles where role = 'nutritionist' and id <> v_novo loop
    -- pacientes, dietas e mensagens
    update public.profiles set nutritionist_id = v_novo where nutritionist_id = v_antigo.id;
    update public.diets set created_by = v_novo where created_by = v_antigo.id;
    update public.messages set nutritionist_id = v_novo where nutritionist_id = v_antigo.id;

    -- tabelas dos scripts seguintes (só mexe se existirem)
    if to_regclass('public.favorite_meals') is not null then
      execute 'update public.favorite_meals set nutritionist_id = $1 where nutritionist_id = $2' using v_novo, v_antigo.id;
    end if;
    if to_regclass('public.foods') is not null then
      execute 'update public.foods set created_by = $1 where created_by = $2' using v_novo, v_antigo.id;
    end if;
    if to_regclass('public.patient_measurements') is not null then
      execute 'update public.patient_measurements set created_by = $1 where created_by = $2' using v_novo, v_antigo.id;
    end if;
    if to_regclass('public.nutritionist_settings') is not null then
      -- assinatura e dados do rodapé do PDF: fica com os da nova conta se ela já tiver; senão, herda os da antiga
      if exists (select 1 from public.nutritionist_settings where nutritionist_id = v_novo) then
        execute 'delete from public.nutritionist_settings where nutritionist_id = $1' using v_antigo.id;
      else
        execute 'update public.nutritionist_settings set nutritionist_id = $1 where nutritionist_id = $2' using v_novo, v_antigo.id;
      end if;
    end if;

    if v_apagar_antigo then
      delete from auth.users where id = v_antigo.id;   -- apaga também o perfil dela (cascata)
      raise notice 'Conta antiga de nutricionista % apagada.', v_antigo.id;
    end if;
  end loop;

  -- todos os pacientes ficam ligados à nutricionista oficial
  update public.profiles set nutritionist_id = v_novo where role = 'patient' and nutritionist_id is distinct from v_novo;

  raise notice 'Pronto: % é a nutricionista oficial.', v_email;
end $$;
