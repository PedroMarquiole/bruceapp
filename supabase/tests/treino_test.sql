-- Teste das regras de sessão e do cálculo de recordes. Nada fica gravado (termina em exceção).
-- Sucesso = erro com a mensagem "TREINO_OK".
do $$
declare
  u uuid := gen_random_uuid();
  ex uuid;
  s1 uuid;
  s2 uuid;
  se uuid;
  n int;
  v numeric;
begin
  insert into app_private.allowed_emails (email) values ('treino@teste.invalid');
  insert into auth.users (id, email, aud, role) values (u, 'treino@teste.invalid', 'authenticated', 'authenticated');
  select id into ex from public.exercises where user_id is null and name = 'Supino reto com barra';
  if ex is null then raise exception 'FALHA: catálogo sem Supino reto com barra'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  -- Sessão 1: 100 kg × 5 e 90 kg × 10 concluídas; 120 kg × 3 NÃO concluída (não conta).
  insert into public.workout_sessions (title) values ('Treino A') returning id into s1;
  begin
    insert into public.workout_sessions (title) values ('Outra');
    raise exception 'FALHA: permitiu duas sessões em andamento';
  exception when unique_violation then null;
  end;
  insert into public.session_exercises (session_id, exercise_id, exercise_name) values (s1, ex, 'Supino reto com barra') returning id into se;
  insert into public.exercise_sets (session_exercise_id, position, weight_kg, reps, completed_at) values
    (se, 0, 100, 5, now()), (se, 1, 90, 10, now()), (se, 2, 120, 3, null);

  select count(*) into n from public.finish_workout_session(s1);
  -- carga_1 = 100, carga_3 = 100, carga_5 = 100, carga_10 = 90, e1rm = max(116.7, 120) = 120
  if n <> 5 then raise exception 'FALHA: esperava 5 recordes na primeira sessão, veio %', n; end if;
  select value into v from public.personal_records where criterion = 'e1rm';
  if v <> 120 then raise exception 'FALHA: 1RM estimado esperado 120, veio %', v; end if;
  select value into v from public.personal_records where criterion = 'carga_10';
  if v <> 90 then raise exception 'FALHA: carga para 10 esperada 90, veio %', v; end if;

  -- Histórico imutável.
  begin
    update public.exercise_sets set weight_kg = 200 where session_exercise_id = se;
    raise exception 'FALHA: alterou série de sessão finalizada';
  exception when check_violation then null;
  end;
  begin
    update public.workout_sessions set status = 'ativa' where id = s1;
    raise exception 'FALHA: reabriu sessão finalizada';
  exception when check_violation then null;
  end;
  begin
    perform public.finish_workout_session(s1);
    raise exception 'FALHA: finalizou duas vezes';
  exception when no_data_found then null;
  end;

  -- Sessão 2: 100 kg × 5 de novo não é recorde; 102,5 × 5 é (carga_1, 3, 5 e e1rm).
  insert into public.workout_sessions (title) values ('Treino A') returning id into s2;
  insert into public.session_exercises (session_id, exercise_id, exercise_name) values (s2, ex, 'Supino reto com barra') returning id into se;
  insert into public.exercise_sets (session_exercise_id, position, weight_kg, reps, completed_at) values
    (se, 0, 100, 5, now()), (se, 1, 102.5, 5, now());
  select count(*) into n from public.finish_workout_session(s2);
  -- e1rm de 102,5 × 5 = 119,6 < 120: não é recorde. carga_1/3/5 = 102,5: são.
  if n <> 3 then raise exception 'FALHA: esperava 3 recordes na segunda sessão, veio %', n; end if;

  execute 'reset role';
  raise exception 'TREINO_OK';
end;
$$;
