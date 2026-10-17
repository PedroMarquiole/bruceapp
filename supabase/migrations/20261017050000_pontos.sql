-- Fase 5: pontos por consistência, gravados só por gatilhos (o app não escreve pontos).
-- Cada ação pontua uma vez: a chave única (usuário, regra, origem) impede duplicação, e desfazer a
-- ação remove os pontos dela.
--
-- Regras (documentadas em docs/DATABASE.md):
--   habito      +10  hábito cumprido no dia (contagem >= meta)       origem habito:<id>:<dia>
--   treino      +50  sessão finalizada                               origem treino:<sessão>
--   diario       +5  primeiro registro alimentar do dia              origem diario:<dia>
--   medida       +5  primeira medida corporal do dia                 origem medida:<dia>
--   recorde     +20  recorde pessoal registrado                      origem recorde:<id>

create table public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  rule text not null check (rule in ('habito', 'treino', 'diario', 'medida', 'recorde')),
  source_key text not null check (char_length(source_key) <= 120),
  points integer not null check (points > 0 and points <= 100),
  day date not null default current_date,
  created_at timestamptz not null default now(),
  unique (user_id, rule, source_key)
);
create index points_ledger_user_day_idx on public.points_ledger (user_id, day);

alter table public.points_ledger enable row level security;
create policy "dono lê" on public.points_ledger for select to authenticated using ((select auth.uid()) = user_id);

create or replace function app_private.award(p_user uuid, p_rule text, p_key text, p_points int, p_day date)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.points_ledger (user_id, rule, source_key, points, day)
  values (p_user, p_rule, p_key, p_points, p_day)
  on conflict (user_id, rule, source_key) do nothing;
$$;

create or replace function app_private.revoke_points(p_user uuid, p_rule text, p_key text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.points_ledger where user_id = p_user and rule = p_rule and source_key = p_key;
$$;

revoke all on function app_private.award(uuid, text, text, int, date) from public;
revoke all on function app_private.revoke_points(uuid, text, text) from public;

-- Hábito cumprido / desfeito.
create or replace function app_private.points_habit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target int;
  r record;
begin
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
create trigger points_habit after insert or update or delete on public.habit_logs
  for each row execute function app_private.points_habit();

-- Treino finalizado / sessão apagada.
create or replace function app_private.points_session()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform app_private.revoke_points(old.user_id, 'treino', 'treino:' || old.id);
  elsif new.status = 'finalizada' and (tg_op = 'INSERT' or old.status is distinct from 'finalizada') then
    perform app_private.award(new.user_id, 'treino', 'treino:' || new.id, 50, (new.finished_at at time zone 'America/Sao_Paulo')::date);
  end if;
  return null;
end;
$$;
create trigger points_session after insert or update or delete on public.workout_sessions
  for each row execute function app_private.points_session();

-- Primeiro registro alimentar do dia / último removido.
create or replace function app_private.points_diary()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform app_private.award(new.user_id, 'diario', 'diario:' || new.day, 5, new.day);
  elsif tg_op = 'DELETE' then
    if not exists (select 1 from public.food_diary_entries e where e.user_id = old.user_id and e.day = old.day) then
      perform app_private.revoke_points(old.user_id, 'diario', 'diario:' || old.day);
    end if;
  end if;
  return null;
end;
$$;
create trigger points_diary after insert or delete on public.food_diary_entries
  for each row execute function app_private.points_diary();

-- Primeira medida do dia / última removida.
create or replace function app_private.points_measurement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform app_private.award(new.user_id, 'medida', 'medida:' || new.measured_on, 5, new.measured_on);
  elsif tg_op = 'DELETE' then
    if not exists (select 1 from public.body_measurements m where m.user_id = old.user_id and m.measured_on = old.measured_on) then
      perform app_private.revoke_points(old.user_id, 'medida', 'medida:' || old.measured_on);
    end if;
  end if;
  return null;
end;
$$;
create trigger points_measurement after insert or delete on public.body_measurements
  for each row execute function app_private.points_measurement();

-- Recorde novo.
create or replace function app_private.points_record()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.award(new.user_id, 'recorde', 'recorde:' || new.id, 20, new.achieved_on);
  return null;
end;
$$;
create trigger points_record after insert on public.personal_records
  for each row execute function app_private.points_record();

-- Inscrições de notificação (Web Push).
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null unique check (endpoint like 'https://%' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  user_agent text check (char_length(user_agent) <= 300),
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
create policy "dono lê" on public.push_subscriptions for select to authenticated using ((select auth.uid()) = user_id);
create policy "dono insere" on public.push_subscriptions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "dono exclui" on public.push_subscriptions for delete to authenticated using ((select auth.uid()) = user_id);
