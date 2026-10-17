import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  db,
  unwrap,
  type Exercise,
  type ExerciseSet,
  type PersonalRecord,
  type PlanDay,
  type PlanExercise,
  type SessionExercise,
  type WorkoutPlan,
  type WorkoutSession,
} from '../../lib/db'

export type PlanDayFull = PlanDay & { workout_plan_exercises: PlanExercise[] }
export type PlanFull = WorkoutPlan & { workout_plan_days: PlanDayFull[] }
export type SessionExerciseFull = SessionExercise & { exercise_sets: ExerciseSet[] }
export type SessionFull = WorkoutSession & { session_exercises: SessionExerciseFull[] }

const sortPlan = (p: PlanFull): PlanFull => ({
  ...p,
  workout_plan_days: [...p.workout_plan_days]
    .sort((a, b) => a.position - b.position)
    .map((d) => ({
      ...d,
      workout_plan_exercises: [...d.workout_plan_exercises].sort((a, b) => a.position - b.position),
    })),
})

const sortSession = (s: SessionFull): SessionFull => ({
  ...s,
  session_exercises: [...s.session_exercises]
    .sort((a, b) => a.position - b.position)
    .map((e) => ({
      ...e,
      exercise_sets: [...e.exercise_sets].sort((a, b) => a.position - b.position),
    })),
})

// Exercícios ------------------------------------------------------------------------------------

export function useExercises() {
  return useQuery({
    queryKey: ['exercises'],
    staleTime: 5 * 60_000,
    queryFn: async () => unwrap<Exercise[]>(await db().from('exercises').select('*').order('name')),
  })
}

export function useCreateExercise() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (
      e: Pick<Exercise, 'name' | 'equipment' | 'instructions'> & { primary_muscles: string[] },
    ) => unwrap<Exercise>(await db().from('exercises').insert(e).select('*').single()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercises'] }),
  })
}

// Planos ----------------------------------------------------------------------------------------

const PLAN_SELECT = '*, workout_plan_days(*, workout_plan_exercises(*))'

export function usePlans() {
  return useQuery({
    queryKey: ['plans'],
    queryFn: async () =>
      unwrap<PlanFull[]>(
        await db()
          .from('workout_plans')
          .select(PLAN_SELECT)
          .is('archived_at', null)
          .order('created_at'),
      ).map(sortPlan),
  })
}

export function usePlan(id: string | undefined) {
  return useQuery({
    queryKey: ['plans', id],
    enabled: Boolean(id),
    queryFn: async () =>
      sortPlan(
        unwrap<PlanFull>(
          await db().from('workout_plans').select(PLAN_SELECT).eq('id', id).single(),
        ),
      ),
  })
}

function usePlanMutation<V>(fn: (v: V) => Promise<unknown>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plans'] }),
  })
}

export const useCreatePlan = () =>
  usePlanMutation(async (name: string) =>
    unwrap<WorkoutPlan>(await db().from('workout_plans').insert({ name }).select('*').single()),
  )

export const useUpdatePlan = () =>
  usePlanMutation(async ({ id, ...patch }: { id: string; name?: string; notes?: string | null }) =>
    unwrap(await db().from('workout_plans').update(patch).eq('id', id)),
  )

/** Arquiva: o plano some das listas; sessões já feitas continuam no histórico. */
export const useArchivePlan = () =>
  usePlanMutation(async (id: string) =>
    unwrap(
      await db()
        .from('workout_plans')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', id),
    ),
  )

export const useSaveDay = () =>
  usePlanMutation(
    async ({
      id,
      ...d
    }: {
      id?: string
      plan_id: string
      name: string
      weekday: number | null
      position: number
    }) =>
      id
        ? unwrap(await db().from('workout_plan_days').update(d).eq('id', id))
        : unwrap(await db().from('workout_plan_days').insert(d)),
  )

export const useDeleteDay = () =>
  usePlanMutation(async (id: string) =>
    unwrap(await db().from('workout_plan_days').delete().eq('id', id)),
  )

export type PlanExerciseInput = Omit<PlanExercise, 'id'>

export const useSavePlanExercise = () =>
  usePlanMutation(async ({ id, ...e }: Partial<PlanExerciseInput> & { id?: string }) =>
    id
      ? unwrap(await db().from('workout_plan_exercises').update(e).eq('id', id))
      : unwrap(await db().from('workout_plan_exercises').insert(e)),
  )

export const useDeletePlanExercise = () =>
  usePlanMutation(async (id: string) =>
    unwrap(await db().from('workout_plan_exercises').delete().eq('id', id)),
  )

// Sessões ---------------------------------------------------------------------------------------

const SESSION_SELECT = '*, session_exercises(*, exercise_sets(*))'

export function useActiveSession() {
  return useQuery({
    queryKey: ['sessions', 'active'],
    queryFn: async () =>
      unwrap<WorkoutSession | null>(
        await db()
          .from('workout_sessions')
          .select('*')
          .in('status', ['ativa', 'pausada'])
          .maybeSingle(),
      ),
  })
}

export function useSession(id: string | undefined) {
  return useQuery({
    queryKey: ['sessions', 'detail', id],
    enabled: Boolean(id),
    queryFn: async () =>
      sortSession(
        unwrap<SessionFull>(
          await db().from('workout_sessions').select(SESSION_SELECT).eq('id', id).single(),
        ),
      ),
  })
}

export function useSessionHistory(limit = 30) {
  return useQuery({
    queryKey: ['sessions', 'history', limit],
    queryFn: async () =>
      unwrap<SessionFull[]>(
        await db()
          .from('workout_sessions')
          .select(SESSION_SELECT)
          .eq('status', 'finalizada')
          .order('started_at', { ascending: false })
          .limit(limit),
      ).map(sortSession),
  })
}

/** Últimas séries feitas de cada exercício em sessões finalizadas (para comparar). */
export function usePreviousPerformance(exerciseIds: string[], excludeSession?: string) {
  const ids = [...new Set(exerciseIds)].sort()
  return useQuery({
    queryKey: ['sessions', 'previous', ids, excludeSession],
    enabled: ids.length > 0,
    queryFn: async () => {
      const rows = unwrap<
        Array<SessionExerciseFull & { workout_sessions: { status: string; started_at: string } }>
      >(
        await db()
          .from('session_exercises')
          .select('*, exercise_sets(*), workout_sessions!inner(status, started_at)')
          .in('exercise_id', ids)
          .eq('workout_sessions.status', 'finalizada')
          .neq('session_id', excludeSession ?? '00000000-0000-0000-0000-000000000000')
          .order('created_at', { ascending: false })
          .limit(60),
      )
      const latest = new Map<string, { date: string; sets: ExerciseSet[] }>()
      for (const r of rows) {
        if (!r.exercise_id || latest.has(r.exercise_id)) continue
        const sets = r.exercise_sets
          .filter((s) => s.completed_at)
          .sort((a, b) => a.position - b.position)
        if (sets.length) latest.set(r.exercise_id, { date: r.workout_sessions.started_at, sets })
      }
      return latest
    },
  })
}

function useSessionMutation<V, R = unknown>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  })
}

/** Começa uma sessão copiando os exercícios e metas do dia do plano (ou vazia, treino livre). */
export const useStartSession = () =>
  useSessionMutation(
    async ({ day, exercises }: { day: PlanDayFull | null; exercises: Exercise[] }) => {
      const session = unwrap<WorkoutSession>(
        await db()
          .from('workout_sessions')
          .insert({ plan_day_id: day?.id ?? null, title: day?.name ?? 'Treino livre' })
          .select('*')
          .single(),
      )
      if (day && day.workout_plan_exercises.length) {
        const byId = new Map(exercises.map((e) => [e.id, e]))
        const rows = day.workout_plan_exercises.map((pe, i) => ({
          session_id: session.id,
          exercise_id: pe.exercise_id,
          exercise_name: byId.get(pe.exercise_id)?.name ?? 'Exercício',
          position: i,
          target_sets: pe.target_sets,
          target_reps_min: pe.target_reps_min,
          target_reps_max: pe.target_reps_max,
          rest_seconds: pe.rest_seconds,
        }))
        const { error } = await db().from('session_exercises').insert(rows)
        if (error) {
          // Não deixa sessão vazia presa como "em andamento".
          await db().from('workout_sessions').update({ status: 'cancelada' }).eq('id', session.id)
          throw new Error(error.message)
        }
      }
      return session
    },
  )

export const useAddSessionExercise = () =>
  useSessionMutation(
    async ({
      sessionId,
      exercise,
      position,
    }: {
      sessionId: string
      exercise: Exercise
      position: number
    }) =>
      unwrap(
        await db().from('session_exercises').insert({
          session_id: sessionId,
          exercise_id: exercise.id,
          exercise_name: exercise.name,
          position,
        }),
      ),
  )

export const useRemoveSessionExercise = () =>
  useSessionMutation(async (id: string) =>
    unwrap(await db().from('session_exercises').delete().eq('id', id)),
  )

export const useSaveSet = () =>
  useSessionMutation(
    async ({
      id,
      ...s
    }: Partial<Omit<ExerciseSet, 'id'>> & { id?: string; session_exercise_id: string }) =>
      id
        ? unwrap(await db().from('exercise_sets').update(s).eq('id', id))
        : unwrap(await db().from('exercise_sets').insert(s)),
  )

export const useDeleteSet = () =>
  useSessionMutation(async (id: string) =>
    unwrap(await db().from('exercise_sets').delete().eq('id', id)),
  )

export const useSetSessionStatus = () =>
  useSessionMutation(
    async ({
      id,
      status,
      notes,
    }: {
      id: string
      status?: 'ativa' | 'pausada' | 'cancelada'
      notes?: string | null
    }) =>
      unwrap(
        await db()
          .from('workout_sessions')
          .update({ ...(status ? { status } : {}), ...(notes !== undefined ? { notes } : {}) })
          .eq('id', id),
      ),
  )

export function useFinishSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) =>
      unwrap<PersonalRecord[]>(await db().rpc('finish_workout_session', { p_session: id })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sessions'] })
      void qc.invalidateQueries({ queryKey: ['records'] })
      void qc.invalidateQueries({ queryKey: ['points'] })
    },
  })
}

export function useDeleteSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) =>
      unwrap(await db().from('workout_sessions').delete().eq('id', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  })
}

export function useRecords() {
  return useQuery({
    queryKey: ['records'],
    queryFn: async () =>
      unwrap<PersonalRecord[]>(
        await db().from('personal_records').select('*').order('achieved_on', { ascending: false }),
      ),
  })
}
