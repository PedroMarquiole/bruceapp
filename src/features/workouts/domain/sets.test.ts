import { describe, expect, it } from 'vitest'
import { estimatedOneRepMax, formatDuration, formatSet, formatTarget, volume } from './sets'

const done = '2026-10-16T10:00:00Z'

describe('volume', () => {
  it('soma só séries concluídas com carga e repetições', () => {
    expect(
      volume([
        { weight_kg: 80, reps: 8, completed_at: done },
        { weight_kg: 80, reps: 6, completed_at: done },
        { weight_kg: 80, reps: 8, completed_at: null },
        { weight_kg: null, reps: 10, completed_at: done },
      ]),
    ).toBe(1120)
  })
})

describe('estimatedOneRepMax', () => {
  it('segue Epley e o mesmo recorte do banco', () => {
    expect(estimatedOneRepMax(100, 1)).toBe(100)
    expect(estimatedOneRepMax(100, 5)).toBe(116.7)
    expect(estimatedOneRepMax(80, 10)).toBe(106.7)
    expect(estimatedOneRepMax(100, 13)).toBeNull()
    expect(estimatedOneRepMax(0, 5)).toBeNull()
  })
})

describe('formatação', () => {
  it('formata série, meta e duração', () => {
    expect(formatSet({ weight_kg: 82.5, reps: 8 })).toBe('82,5 kg × 8')
    expect(formatTarget(3, 8, 12)).toBe('3 × 8–12')
    expect(formatTarget(4, 10, 10)).toBe('4 × 10')
    expect(formatTarget(3, null, null)).toBe('3 séries')
    expect(formatDuration('2026-10-16T10:00:00Z', '2026-10-16T10:48:00Z')).toBe('48 min')
    expect(formatDuration('2026-10-16T10:00:00Z', '2026-10-16T11:05:00Z')).toBe('1 h 05 min')
  })
})
