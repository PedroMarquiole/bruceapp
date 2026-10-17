-- Cópia das metas do plano em cada exercício da sessão (o plano pode mudar depois).
alter table public.session_exercises
  add column target_sets smallint check (target_sets between 1 and 20),
  add column target_reps_min smallint check (target_reps_min between 1 and 100),
  add column target_reps_max smallint check (target_reps_max between 1 and 100),
  add column rest_seconds smallint check (rest_seconds between 0 and 900);
