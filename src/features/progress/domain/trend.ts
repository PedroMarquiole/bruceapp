import { parseDayKey } from '../../../lib/date'

export type Point = { day: string; value: number }

export type Period = '4s' | '3m' | '1a' | 'tudo'

export const PERIOD_DAYS: Record<Period, number | null> = {
  '4s': 28,
  '3m': 91,
  '1a': 365,
  tudo: null,
}

/** Pontos dentro do período (contado para trás a partir de `today`), em ordem cronológica. */
export function inPeriod(points: readonly Point[], period: Period, today: Date): Point[] {
  const days = PERIOD_DAYS[period]
  const sorted = [...points].sort((a, b) => a.day.localeCompare(b.day))
  if (days === null) return sorted
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1))
  return sorted.filter((p) => parseDayKey(p.day) >= start)
}

/**
 * Média móvel por tempo: para cada ponto, média dos registros dos últimos `windowDays` dias
 * (inclusive). Suaviza a variação diária de peso sem inventar pontos onde não há registro.
 */
export function movingAverage(points: readonly Point[], windowDays = 7): Point[] {
  const sorted = [...points].sort((a, b) => a.day.localeCompare(b.day))
  return sorted.map((p) => {
    const end = parseDayKey(p.day).getTime()
    const start = end - (windowDays - 1) * 86_400_000
    const win = sorted.filter((q) => {
      const t = parseDayKey(q.day).getTime()
      return t >= start && t <= end
    })
    const avg = win.reduce((s, q) => s + q.value, 0) / win.length
    return { day: p.day, value: Math.round(avg * 10) / 10 }
  })
}

/** Variação entre o primeiro e o último valor da série (nulo com menos de dois pontos). */
export function change(points: readonly Point[]): number | null {
  if (points.length < 2) return null
  const first = points[0]
  const last = points.at(-1)
  if (!first || !last) return null
  return Math.round((last.value - first.value) * 10) / 10
}

/** Escala "redonda" para o eixo Y: passos de 0,5 / 1 / 2 / 5... com folga acima e abaixo. */
export function niceScale(
  min: number,
  max: number,
  ticks = 4,
): { lo: number; hi: number; step: number } {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { lo: 0, hi: 1, step: 1 }
  if (min === max) {
    min -= 1
    max += 1
  }
  const raw = (max - min) / (ticks - 1)
  const mag = 10 ** Math.floor(Math.log10(raw))
  const norm = raw / mag
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag
  const lo = Math.floor(min / step) * step
  const hi = Math.ceil(max / step) * step
  return { lo, hi, step }
}
