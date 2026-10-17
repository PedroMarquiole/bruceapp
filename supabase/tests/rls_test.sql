-- Teste de isolamento (RLS) entre duas contas.
-- Roda inteiro dentro de um bloco que termina com uma exceção proposital: nada fica gravado.
-- Sucesso = erro com a mensagem "RLS_OK". Qualquer outra mensagem começa com "FALHA".

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  habit_a uuid;
  plan_a uuid;
  ex_global uuid;
  n int;
begin
  -- Preparação (como superusuário) ---------------------------------------------------------------
  insert into app_private.allowed_emails (email) values ('a@teste.invalid'), ('b@teste.invalid');
  insert into auth.users (id, email, aud, role) values
    (a, 'a@teste.invalid', 'authenticated', 'authenticated'),
    (b, 'b@teste.invalid', 'authenticated', 'authenticated');

  -- Conta única: e-mail fora da lista é recusado.
  begin
    insert into auth.users (id, email, aud, role)
      values (gen_random_uuid(), 'intruso@teste.invalid', 'authenticated', 'authenticated');
    raise exception 'FALHA: e-mail não autorizado conseguiu criar conta';
  exception when insufficient_privilege then null;
  end;

  select count(*) into n from public.profiles where id in (a, b);
  if n <> 2 then raise exception 'FALHA: perfis não criados automaticamente (%)', n; end if;

  insert into public.exercises (user_id, name) values (null, 'Agachamento livre')
    returning id into ex_global;

  -- Conta A cria seus dados -----------------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  insert into public.habits (name) values ('Beber água') returning id into habit_a;
  insert into public.habit_logs (habit_id, day) values (habit_a, current_date);
  insert into public.workout_plans (name) values ('Plano A') returning id into plan_a;
  insert into public.workout_plan_days (plan_id, name) values (plan_a, 'Treino A');

  select count(*) into n from public.habits;
  if n <> 1 then raise exception 'FALHA: dono não vê o próprio hábito (%)', n; end if;

  update public.profiles set display_name = 'A' where id = a;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FALHA: dono não atualiza o próprio perfil'; end if;

  -- Conta B tenta acessar os dados de A ----------------------------------------------------------
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.habits;
  if n <> 0 then raise exception 'FALHA: B vê hábitos de A'; end if;
  select count(*) into n from public.habit_logs;
  if n <> 0 then raise exception 'FALHA: B vê registros de hábito de A'; end if;
  select count(*) into n from public.workout_plans;
  if n <> 0 then raise exception 'FALHA: B vê planos de A'; end if;
  select count(*) into n from public.profiles;
  if n <> 1 then raise exception 'FALHA: B vê perfis além do próprio (%)', n; end if;

  update public.habits set name = 'invadido' where id = habit_a;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHA: B alterou hábito de A'; end if;

  delete from public.workout_plans where id = plan_a;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHA: B apagou plano de A'; end if;

  update public.profiles set display_name = 'invadido' where id = a;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHA: B alterou perfil de A'; end if;

  -- B não consegue gravar em nome de A.
  begin
    insert into public.habits (user_id, name) values (a, 'falso');
    raise exception 'FALHA: B inseriu hábito com user_id de A';
  exception when insufficient_privilege then null;
  end;

  -- B não consegue pendurar um registro seu no hábito de A (chave composta).
  begin
    insert into public.habit_logs (habit_id, day) values (habit_a, current_date - 1);
    raise exception 'FALHA: B registrou no hábito de A';
  exception when foreign_key_violation then null;
  end;

  -- Catálogo: B lê o exercício global, mas não altera nem apaga.
  select count(*) into n from public.exercises where id = ex_global;
  if n <> 1 then raise exception 'FALHA: catálogo global invisível'; end if;
  update public.exercises set name = 'invadido' where id = ex_global;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHA: B alterou o catálogo global'; end if;
  delete from public.exercises where id = ex_global;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHA: B apagou do catálogo global'; end if;

  -- Visitante sem login não vê nada --------------------------------------------------------------
  execute 'reset role';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
  select count(*) into n from public.habits;
  if n <> 0 then raise exception 'FALHA: anônimo vê hábitos'; end if;
  select count(*) into n from public.profiles;
  if n <> 0 then raise exception 'FALHA: anônimo vê perfis'; end if;
  select count(*) into n from public.exercises;
  if n <> 0 then raise exception 'FALHA: anônimo vê o catálogo'; end if;

  execute 'reset role';
  raise exception 'RLS_OK';
end;
$$;
