/**
 * Gamificação individual: níveis, missões e conquistas, calculados só a partir de registros reais.
 * Nada pune descanso: dias sem treino planejado não geram missão de treino, e pontos nunca são
 * retirados por um dia perdido (só quando a própria ação é desfeita).
 */

export const POINT_RULES = [
  { rule: 'habito', points: 10, label: 'Hábito cumprido no dia' },
  { rule: 'treino', points: 50, label: 'Treino finalizado' },
  { rule: 'diario', points: 5, label: 'Primeiro registro alimentar do dia' },
  { rule: 'medida', points: 5, label: 'Primeira medida do dia' },
  { rule: 'recorde', points: 20, label: 'Recorde pessoal' },
] as const

/** Nível n começa em 50·(n−1)² pontos: 0, 50, 200, 450, 800… (cada nível pede um pouco mais). */
export function levelFor(points: number) {
  const p = Math.max(0, Math.floor(points))
  const level = Math.floor(Math.sqrt(p / 50)) + 1
  const start = 50 * (level - 1) ** 2
  const next = 50 * level ** 2
  return { level, start, next, progress: (p - start) / (next - start), toNext: next - p }
}

export type Mission = { id: string; title: string; progress: number; target: number; done: boolean }

const mission = (id: string, title: string, progress: number, target: number): Mission => ({
  id,
  title,
  progress: Math.min(progress, target),
  target,
  done: progress >= target,
})

export function dailyMissions(s: {
  habitsScheduled: number
  habitsDone: number
  diaryEntries: number
  workoutPlanned: boolean
  trainedToday: boolean
}): Mission[] {
  const out: Mission[] = []
  if (s.workoutPlanned || s.trainedToday)
    out.push(mission('treino-dia', 'Fazer o treino do dia', s.trainedToday ? 1 : 0, 1))
  if (s.habitsScheduled > 0)
    out.push(mission('habitos-dia', 'Cumprir os hábitos de hoje', s.habitsDone, s.habitsScheduled))
  out.push(mission('diario-dia', 'Registrar o que comeu hoje', s.diaryEntries > 0 ? 1 : 0, 1))
  return out
}

export function weeklyMissions(s: {
  sessionsThisWeek: number
  plannedDaysPerWeek: number
  diaryDaysThisWeek: number
  habitsScheduledWeek: number
  habitsDoneWeek: number
}): Mission[] {
  const out: Mission[] = []
  const target = s.plannedDaysPerWeek > 0 ? Math.min(s.plannedDaysPerWeek, 6) : 3
  out.push(
    mission(
      'treinos-semana',
      `Treinar ${target} ${target === 1 ? 'vez' : 'vezes'} na semana`,
      s.sessionsThisWeek,
      target,
    ),
  )
  out.push(mission('diario-semana', 'Registrar a alimentação em 5 dias', s.diaryDaysThisWeek, 5))
  if (s.habitsScheduledWeek > 0) {
    // 80% dos hábitos programados: consistência sem exigir perfeição.
    out.push(
      mission(
        'habitos-semana',
        'Cumprir 80% dos hábitos da semana',
        s.habitsDoneWeek,
        Math.ceil(s.habitsScheduledWeek * 0.8),
      ),
    )
  }
  return out
}

export type Stats = {
  sessions: number
  records: number
  bestStreak: number
  diaryDays: number
  measurements: number
  points: number
}

export type Achievement = {
  id: string
  title: string
  description: string
  unlocked: boolean
  progress: number
  target: number
}

const ach = (
  id: string,
  title: string,
  description: string,
  value: number,
  target: number,
): Achievement => ({
  id,
  title,
  description,
  unlocked: value >= target,
  progress: Math.min(value, target),
  target,
})

export function achievements(s: Stats): Achievement[] {
  return [
    ach('treino-1', 'Primeiro treino', 'Finalize a primeira sessão.', s.sessions, 1),
    ach('treino-10', 'Dez sessões', 'Finalize 10 treinos.', s.sessions, 10),
    ach('treino-50', 'Rotina de ferro', 'Finalize 50 treinos.', s.sessions, 50),
    ach('treino-100', 'Centenário', 'Finalize 100 treinos.', s.sessions, 100),
    ach('recorde-1', 'Primeiro recorde', 'Bata um recorde pessoal.', s.records, 1),
    ach('recorde-10', 'Dez recordes', 'Bata 10 recordes pessoais.', s.records, 10),
    ach(
      'sequencia-7',
      'Uma semana firme',
      'Mantenha um hábito por 7 dias programados seguidos.',
      s.bestStreak,
      7,
    ),
    ach(
      'sequencia-30',
      'Um mês firme',
      'Mantenha um hábito por 30 dias programados seguidos.',
      s.bestStreak,
      30,
    ),
    ach('diario-1', 'Primeiro registro', 'Registre a primeira refeição.', s.diaryDays, 1),
    ach(
      'diario-30',
      'Trinta dias à mesa',
      'Registre a alimentação em 30 dias diferentes.',
      s.diaryDays,
      30,
    ),
    ach('medida-1', 'Ponto de partida', 'Registre a primeira medida corporal.', s.measurements, 1),
    ach('pontos-1000', 'Mil pontos', 'Some 1.000 pontos de consistência.', s.points, 1000),
  ]
}
