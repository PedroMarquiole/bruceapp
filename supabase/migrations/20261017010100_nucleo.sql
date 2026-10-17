-- Núcleo do app: metas, hábitos, treinos, alimentação, medidas e recordes.
-- Toda tabela tem user_id (padrão: o usuário logado). Tabelas filhas usam chave estrangeira
-- composta (pai_id, user_id) para que um registro nunca aponte para o pai de outra conta.

-- Metas ----------------------------------------------------------------------------------------
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('peso', 'forca', 'habito', 'nutricao', 'outro')),
  title text not null check (char_length(title) between 1 and 120),
  target_value numeric(8, 2),
  unit text check (char_length(unit) <= 12),
  due_on date,
  status text not null default 'ativa' check (status in ('ativa', 'alcancada', 'arquivada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index goals_user_idx on public.goals (user_id, status);

-- Hábitos ---------------------------------------------------------------------------------------
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  -- 1 = segunda ... 7 = domingo
  days_of_week smallint[] not null default '{1,2,3,4,5,6,7}'
    check (cardinality(days_of_week) between 1 and 7 and days_of_week <@ '{1,2,3,4,5,6,7}'::smallint[]),
  target_per_day smallint not null default 1 check (target_per_day between 1 and 20),
  reminder_time time,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);
create index habits_user_idx on public.habits (user_id) where archived_at is null;

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  habit_id uuid not null,
  day date not null,
  count smallint not null default 1 check (count between 0 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (habit_id, user_id) references public.habits (id, user_id) on delete cascade,
  unique (habit_id, day)
);
create index habit_logs_user_day_idx on public.habit_logs (user_id, day);

-- Exercícios (catálogo global com user_id nulo + exercícios próprios) -------------------------
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  primary_muscles text[] not null default '{}',
  secondary_muscles text[] not null default '{}',
  equipment text check (char_length(equipment) <= 40),
  instructions text check (char_length(instructions) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index exercises_user_idx on public.exercises (user_id);

-- Planos de treino -----------------------------------------------------------------------------
create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  notes text check (char_length(notes) <= 2000),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.workout_plan_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plan_id uuid not null,
  name text not null check (char_length(name) between 1 and 60),
  weekday smallint check (weekday between 1 and 7),
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (plan_id, user_id) references public.workout_plans (id, user_id) on delete cascade,
  unique (id, user_id)
);
create index workout_plan_days_plan_idx on public.workout_plan_days (plan_id, position);

create table public.workout_plan_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plan_day_id uuid not null,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  position smallint not null default 0,
  target_sets smallint not null default 3 check (target_sets between 1 and 20),
  target_reps_min smallint check (target_reps_min between 1 and 100),
  target_reps_max smallint check (target_reps_max between 1 and 100),
  rest_seconds smallint check (rest_seconds between 0 and 900),
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (plan_day_id, user_id) references public.workout_plan_days (id, user_id) on delete cascade,
  check (target_reps_max is null or target_reps_min is null or target_reps_max >= target_reps_min)
);
create index workout_plan_exercises_day_idx on public.workout_plan_exercises (plan_day_id, position);

-- Sessões de treino (histórico: guarda cópia dos nomes, não muda se o plano mudar) -----------
create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plan_day_id uuid,
  title text not null check (char_length(title) between 1 and 80),
  status text not null default 'ativa' check (status in ('ativa', 'pausada', 'finalizada', 'cancelada')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (plan_day_id, user_id) references public.workout_plan_days (id, user_id)
    on delete set null (plan_day_id),
  unique (id, user_id),
  check ((status = 'finalizada') = (finished_at is not null))
);
-- No máximo uma sessão em andamento por vez.
create unique index workout_sessions_one_open_idx on public.workout_sessions (user_id)
  where status in ('ativa', 'pausada');
create index workout_sessions_user_started_idx on public.workout_sessions (user_id, started_at desc);

create table public.session_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id uuid not null,
  exercise_id uuid references public.exercises (id) on delete set null,
  exercise_name text not null check (char_length(exercise_name) between 1 and 80),
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (session_id, user_id) references public.workout_sessions (id, user_id) on delete cascade,
  unique (id, user_id)
);
create index session_exercises_session_idx on public.session_exercises (session_id, position);
create index session_exercises_exercise_idx on public.session_exercises (exercise_id);

create table public.exercise_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_exercise_id uuid not null,
  position smallint not null default 0,
  weight_kg numeric(6, 2) check (weight_kg between 0 and 1000),
  reps smallint check (reps between 0 and 200),
  rir smallint check (rir between 0 and 10),
  rest_seconds smallint check (rest_seconds between 0 and 1800),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (session_exercise_id, user_id) references public.session_exercises (id, user_id) on delete cascade
);
create index exercise_sets_session_exercise_idx on public.exercise_sets (session_exercise_id, position);

-- Alimentos (catálogo global com user_id nulo + alimentos próprios) ---------------------------
create table public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users (id) on delete cascade,
  source text not null check (source in ('usuario', 'open_food_facts', 'ia', 'tbca')),
  external_id text check (char_length(external_id) <= 64),
  barcode text check (barcode ~ '^[0-9]{6,14}$'),
  name text not null check (char_length(name) between 1 and 120),
  brand text check (char_length(brand) <= 80),
  kcal_100g numeric(7, 2) check (kcal_100g >= 0),
  protein_100g numeric(6, 2) check (protein_100g >= 0),
  carbs_100g numeric(6, 2) check (carbs_100g >= 0),
  fat_100g numeric(6, 2) check (fat_100g >= 0),
  fiber_100g numeric(6, 2) check (fiber_100g >= 0),
  serving_name text check (char_length(serving_name) <= 40),
  serving_g numeric(7, 2) check (serving_g > 0),
  is_incomplete boolean not null default false,
  attribution text check (char_length(attribution) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index foods_user_idx on public.foods (user_id);
create index foods_barcode_idx on public.foods (barcode) where barcode is not null;

-- Diário alimentar: cada entrada guarda a cópia dos valores para a quantidade consumida.
create table public.food_diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  meal text not null check (meal in ('cafe', 'almoco', 'lanche', 'jantar', 'outro')),
  eaten_at timestamptz,
  food_id uuid references public.foods (id) on delete set null,
  food_name text not null check (char_length(food_name) between 1 and 120),
  brand text check (char_length(brand) <= 80),
  quantity_g numeric(7, 2) not null check (quantity_g > 0 and quantity_g <= 5000),
  kcal numeric(7, 2) check (kcal >= 0),
  protein_g numeric(6, 2) check (protein_g >= 0),
  carbs_g numeric(6, 2) check (carbs_g >= 0),
  fat_g numeric(6, 2) check (fat_g >= 0),
  fiber_g numeric(6, 2) check (fiber_g >= 0),
  is_estimate boolean not null default false,
  source text not null check (source in ('usuario', 'open_food_facts', 'ia', 'tbca', 'manual')),
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index food_diary_user_day_idx on public.food_diary_entries (user_id, day);
create index food_diary_food_idx on public.food_diary_entries (food_id);

-- Metas nutricionais opcionais, com vigência.
create table public.nutrition_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kcal numeric(7, 2) check (kcal > 0),
  protein_g numeric(6, 2) check (protein_g >= 0),
  carbs_g numeric(6, 2) check (carbs_g >= 0),
  fat_g numeric(6, 2) check (fat_g >= 0),
  valid_from date not null default current_date,
  valid_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_to is null or valid_to >= valid_from)
);
create index nutrition_targets_user_idx on public.nutrition_targets (user_id, valid_from desc);

-- Medidas corporais ---------------------------------------------------------------------------
create table public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  measured_on date not null default current_date,
  kind text not null check (kind in ('peso', 'cintura', 'quadril', 'peito', 'braco', 'coxa', 'gordura')),
  value numeric(6, 2) not null check (value > 0),
  unit text not null check (unit in ('kg', 'cm', '%')),
  note text check (char_length(note) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index body_measurements_user_kind_idx on public.body_measurements (user_id, kind, measured_on);

-- Recordes pessoais ---------------------------------------------------------------------------
create table public.personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exercise_id uuid references public.exercises (id) on delete set null,
  exercise_name text not null check (char_length(exercise_name) between 1 and 80),
  criterion text not null check (criterion in ('carga_1', 'carga_3', 'carga_5', 'carga_10', 'e1rm')),
  value numeric(7, 2) not null check (value > 0),
  set_id uuid references public.exercise_sets (id) on delete set null,
  achieved_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index personal_records_user_exercise_idx on public.personal_records (user_id, exercise_id, criterion);
create index personal_records_set_idx on public.personal_records (set_id);
create index workout_plan_exercises_exercise_idx on public.workout_plan_exercises (exercise_id);

-- updated_at, RLS e políticas padrão ----------------------------------------------------------
do $$
declare
  t text;
  owned text[] := array[
    'goals', 'habits', 'habit_logs', 'workout_plans', 'workout_plan_days', 'workout_plan_exercises',
    'workout_sessions', 'session_exercises', 'exercise_sets', 'food_diary_entries',
    'nutrition_targets', 'body_measurements', 'personal_records'
  ];
  catalog text[] := array['exercises', 'foods'];
begin
  foreach t in array owned || catalog loop
    execute format(
      'create trigger %1$s_updated_at before update on public.%1$I
         for each row execute function public.set_updated_at()', t);
    execute format('alter table public.%I enable row level security', t);
  end loop;

  -- Tabelas do usuário: só o dono lê e escreve.
  foreach t in array owned loop
    execute format(
      'create policy "dono lê" on public.%I for select to authenticated
         using ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "dono insere" on public.%I for insert to authenticated
         with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "dono atualiza" on public.%I for update to authenticated
         using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "dono exclui" on public.%I for delete to authenticated
         using ((select auth.uid()) = user_id)', t);
  end loop;

  -- Catálogos: leem-se os itens globais (user_id nulo) e os próprios; escreve-se só nos próprios.
  foreach t in array catalog loop
    execute format(
      'create policy "lê catálogo e próprios" on public.%I for select to authenticated
         using (user_id is null or (select auth.uid()) = user_id)', t);
    execute format(
      'create policy "dono insere" on public.%I for insert to authenticated
         with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "dono atualiza" on public.%I for update to authenticated
         using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "dono exclui" on public.%I for delete to authenticated
         using ((select auth.uid()) = user_id)', t);
  end loop;
end;
$$;
