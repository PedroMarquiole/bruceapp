import { describe, expect, it } from 'vitest'
import { adherence, currentStreak, isScheduled, isoWeekday } from './streak'

const todos = {
  days_of_week: [1, 2, 3, 4, 5, 6, 7],
  target_per_day: 1,
  created_at: '2026-01-01T12:00:00Z',
}
const log = (day: string, count = 1) => ({ day, count })
const sexta = new Date(2026, 9, 16, 20)

describe('isoWeekday / isScheduled', () => {
  it('segunda = 1, domingo = 7', () => {
    expect(isoWeekday(new Date(2026, 9, 12))).toBe(1)
    expect(isoWeekday(new Date(2026, 9, 18))).toBe(7)
  })
  it('respeita os dias programados', () => {
    expect(isScheduled({ days_of_week: [1, 3, 5] }, sexta)).toBe(true)
    expect(isScheduled({ days_of_week: [1, 3] }, sexta)).toBe(false)
  })
})

describe('currentStreak', () => {
  it('conta dias seguidos até hoje', () => {
    expect(
      currentStreak(todos, [log('2026-10-14'), log('2026-10-15'), log('2026-10-16')], sexta),
    ).toBe(3)
  })

  it('hoje ainda não feito não quebra a sequência', () => {
    expect(currentStreak(todos, [log('2026-10-14'), log('2026-10-15')], sexta)).toBe(2)
  })

  it('um dia programado perdido quebra', () => {
    expect(
      currentStreak(todos, [log('2026-10-13'), log('2026-10-15'), log('2026-10-16')], sexta),
    ).toBe(2)
  })

  it('dias não programados (descanso) não quebram', () => {
    const segQuaSex = { ...todos, days_of_week: [1, 3, 5] }
    expect(
      currentStreak(segQuaSex, [log('2026-10-12'), log('2026-10-14'), log('2026-10-16')], sexta),
    ).toBe(3)
  })

  it('meta diária maior que 1 exige a contagem completa', () => {
    const agua = { ...todos, target_per_day: 3 }
    expect(currentStreak(agua, [log('2026-10-15', 3), log('2026-10-16', 2)], sexta)).toBe(1)
  })

  it('não conta antes da criação do hábito', () => {
    const novo = { ...todos, created_at: '2026-10-15T10:00:00' }
    expect(
      currentStreak(novo, [log('2026-10-14'), log('2026-10-15'), log('2026-10-16')], sexta),
    ).toBe(2)
  })
})

describe('adherence', () => {
  it('conta programados e cumpridos no período', () => {
    const segQuaSex = { ...todos, days_of_week: [1, 3, 5] }
    const r = adherence(
      segQuaSex,
      [log('2026-10-12'), log('2026-10-16')],
      new Date(2026, 9, 12),
      sexta,
    )
    expect(r).toEqual({ scheduled: 3, done: 2 })
  })
})
