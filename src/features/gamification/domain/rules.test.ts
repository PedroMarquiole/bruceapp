import { describe, expect, it } from 'vitest'
import { achievements, dailyMissions, levelFor, weeklyMissions } from './rules'

describe('levelFor', () => {
  it('começa no nível 1 e cresce com limiares crescentes', () => {
    expect(levelFor(0)).toMatchObject({ level: 1, start: 0, next: 50, toNext: 50 })
    expect(levelFor(49).level).toBe(1)
    expect(levelFor(50)).toMatchObject({ level: 2, start: 50, next: 200 })
    expect(levelFor(200).level).toBe(3)
    expect(levelFor(125).progress).toBeCloseTo(0.5)
  })
  it('nunca fica negativo', () => {
    expect(levelFor(-30).level).toBe(1)
  })
})

describe('dailyMissions', () => {
  it('sem treino planejado não cria missão de treino (descanso não é falha)', () => {
    const m = dailyMissions({
      habitsScheduled: 0,
      habitsDone: 0,
      diaryEntries: 0,
      workoutPlanned: false,
      trainedToday: false,
    })
    expect(m.map((x) => x.id)).toEqual(['diario-dia'])
  })
  it('acompanha progresso dos hábitos e do treino', () => {
    const m = dailyMissions({
      habitsScheduled: 4,
      habitsDone: 3,
      diaryEntries: 2,
      workoutPlanned: true,
      trainedToday: true,
    })
    expect(m).toEqual([
      { id: 'treino-dia', title: 'Fazer o treino do dia', progress: 1, target: 1, done: true },
      {
        id: 'habitos-dia',
        title: 'Cumprir os hábitos de hoje',
        progress: 3,
        target: 4,
        done: false,
      },
      { id: 'diario-dia', title: 'Registrar o que comeu hoje', progress: 1, target: 1, done: true },
    ])
  })
})

describe('weeklyMissions', () => {
  it('usa os dias do plano como meta, ou 3 sem plano; hábitos pedem 80%', () => {
    const m = weeklyMissions({
      sessionsThisWeek: 2,
      plannedDaysPerWeek: 4,
      diaryDaysThisWeek: 5,
      habitsScheduledWeek: 10,
      habitsDoneWeek: 8,
    })
    expect(m.find((x) => x.id === 'treinos-semana')).toMatchObject({
      target: 4,
      progress: 2,
      done: false,
    })
    expect(m.find((x) => x.id === 'diario-semana')?.done).toBe(true)
    expect(m.find((x) => x.id === 'habitos-semana')).toMatchObject({ target: 8, done: true })
    const sem = weeklyMissions({
      sessionsThisWeek: 0,
      plannedDaysPerWeek: 0,
      diaryDaysThisWeek: 0,
      habitsScheduledWeek: 0,
      habitsDoneWeek: 0,
    })
    expect(sem.find((x) => x.id === 'treinos-semana')?.target).toBe(3)
    expect(sem.some((x) => x.id === 'habitos-semana')).toBe(false)
  })
  it('progresso não passa da meta', () => {
    const m = weeklyMissions({
      sessionsThisWeek: 9,
      plannedDaysPerWeek: 3,
      diaryDaysThisWeek: 7,
      habitsScheduledWeek: 0,
      habitsDoneWeek: 0,
    })
    expect(m[0]?.progress).toBe(3)
  })
})

describe('achievements', () => {
  it('desbloqueia pelos números reais', () => {
    const a = achievements({
      sessions: 10,
      records: 0,
      bestStreak: 7,
      diaryDays: 1,
      measurements: 0,
      points: 999,
    })
    const on = a.filter((x) => x.unlocked).map((x) => x.id)
    expect(on).toEqual(['treino-1', 'treino-10', 'sequencia-7', 'diario-1'])
    expect(a.find((x) => x.id === 'pontos-1000')).toMatchObject({ progress: 999, unlocked: false })
  })
})
