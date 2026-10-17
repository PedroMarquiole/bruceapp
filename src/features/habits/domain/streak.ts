import { localDayKey } from '../../../lib/date'

export type HabitLike = { days_of_week: number[]; target_per_day: number; created_at: string }
export type LogLike = { day: string; count: number }

/** 1 = segunda ... 7 = domingo. */
export function isoWeekday(date: Date): number {
  return ((date.getDay() + 6) % 7) + 1
}

export function isScheduled(habit: Pick<HabitLike, 'days_of_week'>, date: Date): boolean {
  return habit.days_of_week.includes(isoWeekday(date))
}

export function isDone(
  habit: Pick<HabitLike, 'target_per_day'>,
  log: LogLike | undefined,
): boolean {
  return (log?.count ?? 0) >= habit.target_per_day
}

/**
 * Sequência atual: dias programados cumpridos em seguida, contando para trás.
 * Dias não programados não contam nem quebram. Se hoje é programado e ainda não foi cumprido,
 * a contagem começa de ontem (o dia ainda não acabou). Não conta antes da criação do hábito.
 */
export function currentStreak(habit: HabitLike, logs: readonly LogLike[], today: Date): number {
  const byDay = new Map(logs.map((l) => [l.day, l]))
  const created = localDayKey(new Date(habit.created_at))
  let streak = 0
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  if (isScheduled(habit, d) && !isDone(habit, byDay.get(localDayKey(d)))) {
    d.setDate(d.getDate() - 1)
  }

  for (let i = 0; i < 400; i++) {
    const key = localDayKey(d)
    if (key < created) break
    if (isScheduled(habit, d)) {
      if (isDone(habit, byDay.get(key))) streak += 1
      else break
    }
    d.setDate(d.getDate() - 1)
  }
  return streak
}

/** Quantos dias programados existem e quantos foram cumpridos num intervalo [de, até]. */
export function adherence(
  habit: HabitLike,
  logs: readonly LogLike[],
  from: Date,
  to: Date,
): { scheduled: number; done: number } {
  const byDay = new Map(logs.map((l) => [l.day, l]))
  const created = localDayKey(new Date(habit.created_at))
  let scheduled = 0
  let done = 0
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const end = localDayKey(to)
  while (localDayKey(d) <= end) {
    const key = localDayKey(d)
    if (key >= created && isScheduled(habit, d)) {
      scheduled += 1
      if (isDone(habit, byDay.get(key))) done += 1
    }
    d.setDate(d.getDate() + 1)
  }
  return { scheduled, done }
}
