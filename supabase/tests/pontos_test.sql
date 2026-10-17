-- Pontos: sem duplicação e com estorno ao desfazer. Sucesso = "PONTOS_OK". Nada fica gravado.
do $$
declare
  u uuid := gen_random_uuid();
  h uuid;
  s uuid;
  total int;
  n int;
begin
  insert into app_private.allowed_emails (email) values ('pontos@teste.invalid');
  insert into auth.users (id, email, aud, role) values (u, 'pontos@teste.invalid', 'authenticated', 'authenticated');
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  insert into public.habits (name, target_per_day) values ('Água', 3) returning id into h;
  insert into public.habit_logs (habit_id, day, count) values (h, current_date, 1);
  select coalesce(sum(points), 0) into total from public.points_ledger;
  if total <> 0 then raise exception 'FALHA: pontuou hábito incompleto (%)', total; end if;

  update public.habit_logs set count = 3 where habit_id = h;
  update public.habit_logs set count = 4 where habit_id = h;
  select coalesce(sum(points), 0), count(*) into total, n from public.points_ledger;
  if total <> 10 or n <> 1 then raise exception 'FALHA: hábito cumprido deveria dar 10 uma vez (%/%)', total, n; end if;

  update public.habit_logs set count = 1 where habit_id = h;
  select coalesce(sum(points), 0) into total from public.points_ledger;
  if total <> 0 then raise exception 'FALHA: desfazer o hábito não estornou (%)', total; end if;

  insert into public.food_diary_entries (day, meal, food_name, quantity_g, source) values
    (current_date, 'almoco', 'Arroz', 100, 'manual'),
    (current_date, 'jantar', 'Feijão', 100, 'manual');
  select coalesce(sum(points), 0) into total from public.points_ledger where rule = 'diario';
  if total <> 5 then raise exception 'FALHA: diário deveria dar 5 por dia (%)', total; end if;

  insert into public.workout_sessions (title) values ('A') returning id into s;
  perform public.finish_workout_session(s);
  select coalesce(sum(points), 0) into total from public.points_ledger where rule = 'treino';
  if total <> 50 then raise exception 'FALHA: treino finalizado deveria dar 50 (%)', total; end if;

  -- O app não grava pontos diretamente.
  begin
    insert into public.points_ledger (user_id, rule, source_key, points) values (u, 'treino', 'falso', 100);
    raise exception 'FALHA: usuário gravou pontos direto';
  exception when insufficient_privilege then null;
  end;

  execute 'reset role';
  raise exception 'PONTOS_OK';
end;
$$;
