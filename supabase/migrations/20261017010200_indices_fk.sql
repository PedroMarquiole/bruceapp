-- Índices cobrindo as chaves estrangeiras compostas (pai_id, user_id) e user_id restantes,
-- apontados pelo advisor de performance do Supabase.
create index exercise_sets_parent_owner_idx on public.exercise_sets (session_exercise_id, user_id);
create index exercise_sets_user_idx on public.exercise_sets (user_id);
create index habit_logs_parent_owner_idx on public.habit_logs (habit_id, user_id);
create index personal_records_exercise_idx on public.personal_records (exercise_id);
create index session_exercises_parent_owner_idx on public.session_exercises (session_id, user_id);
create index session_exercises_user_idx on public.session_exercises (user_id);
create index workout_plan_days_parent_owner_idx on public.workout_plan_days (plan_id, user_id);
create index workout_plan_days_user_idx on public.workout_plan_days (user_id);
create index workout_plan_exercises_parent_owner_idx on public.workout_plan_exercises (plan_day_id, user_id);
create index workout_plan_exercises_user_idx on public.workout_plan_exercises (user_id);
create index workout_plans_user_idx on public.workout_plans (user_id);
create index workout_sessions_plan_day_owner_idx on public.workout_sessions (plan_day_id, user_id);
