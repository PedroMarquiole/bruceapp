import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { db, unwrap, type Habit, type HabitLog } from '../../lib/db'

export function useHabits() {
  return useQuery({
    queryKey: ['habits'],
    queryFn: async () =>
      unwrap<Habit[]>(
        await db().from('habits').select('*').is('archived_at', null).order('created_at'),
      ),
  })
}

/** Registros de hábito entre duas datas (AAAA-MM-DD, inclusivas). */
export function useHabitLogs(from: string, to: string) {
  return useQuery({
    queryKey: ['habit_logs', from, to],
    queryFn: async () =>
      unwrap<HabitLog[]>(
        await db()
          .from('habit_logs')
          .select('id, habit_id, day, count')
          .gte('day', from)
          .lte('day', to),
      ),
  })
}

export type HabitInput = Pick<Habit, 'name' | 'days_of_week' | 'target_per_day'> & {
  reminder_time: string | null
}

export function useSaveHabit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: HabitInput & { id?: string }) => {
      const q = id
        ? db().from('habits').update(input).eq('id', id)
        : db().from('habits').insert(input)
      return unwrap<Habit>(await q.select('*').single())
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  })
}

/** Arquiva (some das listas, histórico preservado). */
export function useArchiveHabit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) =>
      unwrap(
        await db().from('habits').update({ archived_at: new Date().toISOString() }).eq('id', id),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  })
}

/** Define a contagem do dia. Zero remove o registro (e os pontos ligados a ele). */
export function useSetHabitCount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      habitId,
      day,
      count,
    }: {
      habitId: string
      day: string
      count: number
    }) => {
      if (count <= 0) {
        return unwrap(await db().from('habit_logs').delete().eq('habit_id', habitId).eq('day', day))
      }
      return unwrap(
        await db()
          .from('habit_logs')
          .upsert({ habit_id: habitId, day, count }, { onConflict: 'habit_id,day' }),
      )
    },
    onMutate: async ({ habitId, day, count }) => {
      // Atualização otimista: a marcação responde ao toque na hora.
      await qc.cancelQueries({ queryKey: ['habit_logs'] })
      const snapshots = qc.getQueriesData<HabitLog[]>({ queryKey: ['habit_logs'] })
      for (const [key, logs] of snapshots) {
        if (!logs) continue
        const rest = logs.filter((l) => !(l.habit_id === habitId && l.day === day))
        qc.setQueryData(
          key,
          count > 0
            ? [...rest, { id: `tmp-${habitId}-${day}`, habit_id: habitId, day, count }]
            : rest,
        )
      }
      return { snapshots }
    },
    onError: (_e, _v, ctx) => {
      for (const [key, logs] of ctx?.snapshots ?? []) qc.setQueryData(key, logs)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['habit_logs'] })
      void qc.invalidateQueries({ queryKey: ['points'] })
    },
  })
}
