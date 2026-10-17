-- Encerra a permissão de gravar recordes logo depois das inserções da finalização.
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
  -- A permissão vale só para as inserções acima, não para o resto da transação.
  perform set_config('bruceapp.gravando_recordes', '', true);
end;
$$;
