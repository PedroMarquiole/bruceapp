import { describe, expect, it } from 'vitest'
import { change, inPeriod, movingAverage, niceScale } from './trend'

const pts = [
  { day: '2026-10-01', value: 80 },
  { day: '2026-10-03', value: 79.6 },
  { day: '2026-10-08', value: 79.2 },
  { day: '2026-10-16', value: 78.8 },
  { day: '2026-07-01', value: 83 },
]

describe('inPeriod', () => {
  it('filtra pelo período e ordena', () => {
    const r = inPeriod(pts, '4s', new Date(2026, 9, 16))
    expect(r.map((p) => p.day)).toEqual(['2026-10-01', '2026-10-03', '2026-10-08', '2026-10-16'])
    expect(inPeriod(pts, 'tudo', new Date(2026, 9, 16))[0]?.day).toBe('2026-07-01')
  })
})

describe('movingAverage', () => {
  it('média dos registros dos últimos 7 dias, sem inventar pontos', () => {
    const r = movingAverage(pts.slice(0, 4))
    expect(r).toEqual([
      { day: '2026-10-01', value: 80 },
      { day: '2026-10-03', value: 79.8 },
      { day: '2026-10-08', value: 79.4 },
      { day: '2026-10-16', value: 78.8 },
    ])
  })
})

describe('change', () => {
  it('diferença entre primeiro e último', () => {
    expect(change(inPeriod(pts, '4s', new Date(2026, 9, 16)))).toBe(-1.2)
    expect(change([{ day: '2026-10-01', value: 80 }])).toBeNull()
  })
})

describe('niceScale', () => {
  it('gera limites redondos que contêm os dados', () => {
    const s = niceScale(78.8, 80)
    expect(s.lo).toBeLessThanOrEqual(78.8)
    expect(s.hi).toBeGreaterThanOrEqual(80)
    expect([0.5, 1, 2, 2.5, 5]).toContain(s.step)
  })
  it('valor único ganha folga', () => {
    const s = niceScale(80, 80)
    expect(s.lo).toBeLessThan(80)
    expect(s.hi).toBeGreaterThan(80)
  })
})
