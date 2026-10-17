import { useMemo } from 'react'
import { currentWeek, localDayKey } from '../../lib/date'
import { useHabitLogs, useHabits } from '../habits/queries'
import { currentStreak, isDone, isScheduled, isoWeekday } from '../habits/domain/streak'
import { usePlans, useRecords, useSessionHistory } from '../workouts/queries'
import { useMeasurements } from '../progress/queries'
import { useDiaryDays, usePoints } from './queries'
import { achievements, dailyMissions, levelFor, weeklyMissions } from './domain/rules'

/** Junta os registros e calcula nível, missões e conquistas. */
export function useProgress(now: Date) {
  const today = localDayKey(now)
  const from = localDayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 120))
  const points = usePoints()
  const habits = useHabits()
  const logs = useHabitLogs(from, today)
  const plans = usePlans()
  const sessions = useSessionHistory(500)
  const records = useRecords()
  const measurements = useMeasurements()
  const diaryDays = useDiaryDays()

  return useMemo(() => {
    const hs = habits.data ?? []
    const ls = logs.data ?? []
    const week = currentWeek(now)
    const weekKeys = new Set(week.map((d) => d.key))
    const planDays = (plans.data ?? []).flatMap((p) => p.workout_plan_days)
    const sessionDays = (sessions.data ?? []).map((s) => localDayKey(new Date(s.started_at)))

    const logOf = (habitId: string, day: string) =>
      ls.find((l) => l.habit_id === habitId && l.day === day)
    const scheduledToday = hs.filter((h) => isScheduled(h, now))
    const doneToday = scheduledToday.filter((h) => isDone(h, logOf(h.id, today))).length

    let schedWeek = 0
    let doneWeek = 0
    for (const d of week) {
      if (d.key > today) continue
      const [y = 0, m = 1, dd = 1] = d.key.split('-').map(Number)
      const date = new Date(y, m - 1, dd)
      for (const h of hs) {
        if (d.key < localDayKey(new Date(h.created_at)) || !isScheduled(h, date)) continue
        schedWeek += 1
        if (isDone(h, logOf(h.id, d.key))) doneWeek += 1
      }
    }

    const total = points.data?.total ?? 0
    const daily = dailyMissions({
      habitsScheduled: scheduledToday.length,
      habitsDone: doneToday,
      diaryEntries: (diaryDays.data ?? []).includes(today) ? 1 : 0,
      workoutPlanned: planDays.some((d) => d.weekday === isoWeekday(now)),
      trainedToday: sessionDays.includes(today),
    })
    const weekly = weeklyMissions({
      sessionsThisWeek: sessionDays.filter((d) => weekKeys.has(d)).length,
      plannedDaysPerWeek: new Set(planDays.filter((d) => d.weekday).map((d) => d.weekday)).size,
      diaryDaysThisWeek: (diaryDays.data ?? []).filter((d) => weekKeys.has(d)).length,
      habitsScheduledWeek: schedWeek,
      habitsDoneWeek: doneWeek,
    })
    const bestStreak = Math.max(
      0,
      ...hs.map((h) =>
        currentStreak(
          h,
          ls.filter((l) => l.habit_id === h.id),
          now,
        ),
      ),
    )
    const list = achievements({
      sessions: sessions.data?.length ?? 0,
      records: records.data?.length ?? 0,
      bestStreak,
      diaryDays: diaryDays.data?.length ?? 0,
      measurements: measurements.data?.length ?? 0,
      points: total,
    })
    return {
      ready: points.isSuccess && habits.isSuccess && sessions.isSuccess,
      error: points.isError,
      refetch: () => void points.refetch(),
      points: total,
      ledger: points.data?.rows ?? [],
      level: levelFor(total),
      daily,
      weekly,
      achievements: list,
    }
  }, [
    now,
    today,
    points,
    habits.data,
    habits.isSuccess,
    logs.data,
    plans.data,
    sessions.data,
    sessions.isSuccess,
    records.data,
    measurements.data,
    diaryDays.data,
  ])
}
