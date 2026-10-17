-- Correções da revisão de segurança da Fase 6.

-- 1) Recordes só nascem de finish_workout_session (que passa a rodar como definer, conferindo
--    o dono pela sessão e marcando a transação). Um gatilho recusa qualquer outra inserção ou
--    alteração: ninguém gera pontos de recorde inserindo linhas à mão. Apagar continua liberado.
create or replace function public.finish_workout_session(p_session uuid)
returns setof public.personal_records
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '42501';
  end if;
  update public.workout_sessions
     set status = 'finalizada', finished_at = now()
   where id = p_session and user_id = v_uid and status in ('ativa', 'pausada');
  if not found then
    raise exception 'Sessão não encontrada ou já encerrada' using errcode = 'P0002';
  end if;
  perform set_config('bruceapp.gravando_recordes', 'sim', true);

  return query
  with sets as (
    select es.id as set_id, es.weight_kg as w, es.reps, se.exercise_id, se.exercise_name
      from public.exercise_sets es
      join public.session_exercises se on se.id = es.session_exercise_id
     where se.session_id = p_session
       and es.completed_at is not null
       and es.weight_kg > 0
       and es.reps > 0
  ),
  candidates as (
    select s.set_id, s.exercise_id, s.exercise_name, c.criterion,
           case
             when c.criterion = 'e1rm' and s.reps = 1 then s.w
             when c.criterion = 'e1rm' and s.reps between 2 and 12 then round(s.w * (1 + s.reps / 30.0), 1)
             when c.criterion = 'e1rm' then null
             when s.reps >= c.min_reps then s.w
           end as value
      from sets s
     cross join (values ('carga_1', 1), ('carga_3', 3), ('carga_5', 5), ('carga_10', 10), ('e1rm', 0))
           as c (criterion, min_reps)
  ),
  best as (
    select distinct on (coalesce(exercise_id::text, exercise_name), criterion)
           set_id, exercise_id, exercise_name, criterion, value
      from candidates
     where value is not null
     order by coalesce(exercise_id::text, exercise_name), criterion, value desc, set_id
  )
  insert into public.personal_records (user_id, exercise_id, exercise_name, criterion, value, set_id, achieved_on)
  select v_uid, b.exercise_id, b.exercise_name, b.criterion, b.value, b.set_id, current_date
    from best b
   where b.value > coalesce((
           select max(p.value) from public.personal_records p
            where p.user_id = v_uid
              and p.criterion = b.criterion
              and (p.exercise_id = b.exercise_id
                   or (b.exercise_id is null and p.exercise_id is null and p.exercise_name = b.exercise_name))
         ), 0)
  returning *;
end;
$$;

revoke execute on function public.finish_workout_session(uuid) from public, anon;
grant execute on function public.finish_workout_session(uuid) to authenticated;

create or replace function app_private.guard_personal_records()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Exclusões em cascata (exercício ou série apagados) só zeram as referências: permitido.
  if tg_op = 'UPDATE'
     and (new.user_id, new.exercise_name, new.criterion, new.value, new.achieved_on)
         is not distinct from (old.user_id, old.exercise_name, old.criterion, old.value, old.achieved_on)
     and (new.exercise_id is null or new.exercise_id = old.exercise_id)
     and (new.set_id is null or new.set_id = old.set_id) then
    return new;
  end if;
  if coalesce(current_setting('bruceapp.gravando_recordes', true), '') <> 'sim' then
    raise exception 'Recordes são calculados ao finalizar a sessão' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger guard_personal_records before insert or update on public.personal_records
  for each row execute function app_private.guard_personal_records();

-- 2) Sessão nasce em andamento; "finalizada" só por finish_workout_session.
create or replace function app_private.guard_session_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status not in ('ativa', 'pausada') then
    raise exception 'Sessão nova precisa começar em andamento' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger guard_session_insert before insert on public.workout_sessions
  for each row execute function app_private.guard_session_insert();

-- 3) Hábito: ao mudar o dia ou o hábito de um registro, os pontos do registro antigo saem.
create or replace function app_private.points_habit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_target int;
begin
  if tg_op = 'UPDATE' and (old.day is distinct from new.day or old.habit_id is distinct from new.habit_id) then
    perform app_private.revoke_points(old.user_id, 'habito', 'habito:' || old.habit_id || ':' || old.day);
  end if;
  r := coalesce(new, old);
  select h.target_per_day into v_target from public.habits h where h.id = r.habit_id;
  if tg_op <> 'DELETE' and new.count >= coalesce(v_target, 1) then
    perform app_private.award(new.user_id, 'habito', 'habito:' || new.habit_id || ':' || new.day, 10, new.day);
  else
    perform app_private.revoke_points(r.user_id, 'habito', 'habito:' || r.habit_id || ':' || r.day);
  end if;
  return null;
end;
$$;

-- 4) Sessão finalizada é imutável também para quem tenta mover filhos para fora dela:
--    na atualização, confere a sessão antiga e a nova.
create or replace function app_private.guard_closed_session_children()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_sessions uuid[];
begin
  if tg_table_name = 'session_exercises' then
    v_sessions := array[new.session_id, old.session_id];
  else
    select array_agg(se.session_id) into v_sessions
      from public.session_exercises se
     where se.id in (new.session_exercise_id, old.session_exercise_id);
  end if;

  -- Sem sessão visível = exclusão em cascata da própria sessão: permitido.
  if exists (
    select 1 from public.workout_sessions s
     where s.id = any (v_sessions) and s.status = 'finalizada'
  ) then
    raise exception 'Sessão finalizada não pode ser alterada' using errcode = '23514';
  end if;
  return coalesce(new, old);
end;
$$;

-- 5) Limite diário da IA sem corrida: reserva a linha de uso antes de chamar o modelo, com trava
--    por usuário. Só a Edge Function (service_role) chama.
create or replace function public.reserve_ai_usage(p_user uuid, p_intent text, p_model text, p_limit int)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_start timestamptz := (date_trunc('day', now() at time zone 'America/Sao_Paulo')) at time zone 'America/Sao_Paulo';
  v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('ai_usage:' || p_user::text));
  if (select count(*) from public.ai_usage where user_id = p_user and created_at >= v_start) >= p_limit then
    return null;
  end if;
  insert into public.ai_usage (user_id, intent, model, ok)
  values (p_user, p_intent, p_model, false)
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.reserve_ai_usage(uuid, text, text, int) from public, anon, authenticated;
grant execute on function public.reserve_ai_usage(uuid, text, text, int) to service_role;
