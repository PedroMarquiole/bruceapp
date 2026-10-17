import { describe, expect, it } from 'vitest'
import {
  clockTime,
  consistencyGrid,
  currentWeek,
  dayAndMonth,
  dayProgress,
  localDayKey,
  recentMondays,
  shortDate,
  startOfWeek,
  weekdayTitle,
} from './date'

describe('weekdayTitle', () => {
  it('remove o sufixo "-feira" e capitaliza', () => {
    expect(weekdayTitle(new Date(2026, 9, 16))).toBe('Sexta')
    expect(weekdayTitle(new Date(2026, 9, 12))).toBe('Segunda')
  })

  it('mantém sábado e domingo com acento', () => {
    expect(weekdayTitle(new Date(2026, 9, 17))).toBe('Sábado')
    expect(weekdayTitle(new Date(2026, 9, 18))).toBe('Domingo')
  })
})

describe('dayAndMonth', () => {
  it('escreve dia e mês por extenso', () => {
    expect(dayAndMonth(new Date(2026, 9, 16))).toBe('16 de outubro')
    expect(dayAndMonth(new Date(2026, 0, 1))).toBe('1 de janeiro')
  })
})

describe('localDayKey', () => {
  it('usa a data local, com zeros à esquerda', () => {
    expect(localDayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
    expect(localDayKey(new Date(2026, 11, 31, 0, 0))).toBe('2026-12-31')
  })
})

describe('relógio e progresso do dia', () => {
  it('formata hora em 24h', () => {
    expect(clockTime(new Date(2026, 9, 16, 7, 5))).toBe('07:05')
    expect(clockTime(new Date(2026, 9, 16, 23, 31))).toBe('23:31')
  })

  it('calcula a fração do dia', () => {
    expect(dayProgress(new Date(2026, 9, 16, 0, 0))).toBe(0)
    expect(dayProgress(new Date(2026, 9, 16, 12, 0))).toBe(0.5)
    expect(dayProgress(new Date(2026, 9, 16, 18, 0))).toBe(0.75)
  })
})

describe('semana', () => {
  it('começa na segunda, inclusive quando hoje é domingo', () => {
    expect(localDayKey(startOfWeek(new Date(2026, 9, 16)))).toBe('2026-10-12')
    expect(localDayKey(startOfWeek(new Date(2026, 9, 18)))).toBe('2026-10-12')
    expect(localDayKey(startOfWeek(new Date(2026, 9, 19)))).toBe('2026-10-19')
  })

  it('lista sete dias com hoje marcado', () => {
    const week = currentWeek(new Date(2026, 9, 16, 15))
    expect(week.map((d) => d.day)).toEqual([12, 13, 14, 15, 16, 17, 18])
    expect(week.map((d) => d.short)).toEqual(['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'])
    expect(week.filter((d) => d.isToday).map((d) => d.key)).toEqual(['2026-10-16'])
  })

  it('atravessa a virada de mês', () => {
    const week = currentWeek(new Date(2026, 9, 1))
    expect(week[0]?.key).toBe('2026-09-28')
    expect(week[6]?.key).toBe('2026-10-04')
  })
})

describe('consistencyGrid', () => {
  it('termina na semana atual e marca hoje e os dias futuros', () => {
    const grid = consistencyGrid(new Date(2026, 9, 16, 10), 12)
    expect(grid).toHaveLength(12)
    const last = grid.at(-1) ?? []
    expect(last.map((d) => d.key)).toEqual([
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-18',
    ])
    expect(last.filter((d) => d.isToday).map((d) => d.key)).toEqual(['2026-10-16'])
    expect(last.filter((d) => d.isFuture).map((d) => d.key)).toEqual(['2026-10-17', '2026-10-18'])
    expect(grid[0]?.[0]?.key).toBe('2026-07-27')
  })
})

describe('eixos', () => {
  it('gera rótulos curtos e as segundas das últimas semanas', () => {
    expect(shortDate(new Date(2026, 8, 21))).toBe('21 set')
    const mondays = recentMondays(new Date(2026, 9, 16), 4).map(localDayKey)
    expect(mondays).toEqual(['2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12'])
  })
})
