import { useState } from 'react'
import { parseDayKey, shortDate } from '../../lib/date'
import { fmt } from '../nutrition/domain/nutrients'
import { movingAverage, niceScale, type Point } from './domain/trend'

const W = 340
const H = 168
const PAD = { top: 12, right: 8, bottom: 22, left: 36 }

/**
 * Série única de peso: registros como pontos (aço) e a média de 7 dias como linha (amarelo).
 * Tocar num ponto mostra o valor. Uma tabela oculta descreve os dados para leitores de tela.
 */
export function WeightChart({ points, unit = 'kg' }: { points: readonly Point[]; unit?: string }) {
  const [sel, setSel] = useState<Point | null>(null)
  if (points.length === 0) return null

  const trend = movingAverage(points)
  const values = points.map((p) => p.value)
  const { lo, hi, step } = niceScale(Math.min(...values), Math.max(...values))
  const t0 = parseDayKey(points[0]?.day ?? '').getTime()
  const t1 = parseDayKey(points.at(-1)?.day ?? '').getTime()
  const span = Math.max(1, t1 - t0)
  const x = (day: string) =>
    points.length === 1
      ? (PAD.left + W - PAD.right) / 2
      : PAD.left + ((parseDayKey(day).getTime() - t0) / span) * (W - PAD.left - PAD.right)
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom)
  const ticks: number[] = []
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 100) / 100)
  const path = trend
    .map((p, i) => `${i ? 'L' : 'M'}${x(p.day).toFixed(1)} ${y(p.value).toFixed(1)}`)
    .join(' ')
  const shown = sel ?? points.at(-1) ?? null

  return (
    <figure className="mt-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-small text-ink-muted tabular-nums" aria-live="polite">
          {shown ? (
            <>
              <span className="text-ink">
                {fmt(shown.value)} {unit}
              </span>{' '}
              em {shortDate(parseDayKey(shown.day))}
              {sel ? '' : ' (último)'}
            </>
          ) : null}
        </p>
        <p className="flex items-center gap-3 text-micro text-ink-muted">
          <span className="inline-flex items-center gap-1">
            <span aria-hidden className="size-2 rounded-full bg-steel" /> Registro
          </span>
          {points.length > 1 ? (
            <span className="inline-flex items-center gap-1">
              <span aria-hidden className="h-0.5 w-3 rounded bg-signal" /> Média de 7 dias
            </span>
          ) : null}
        </p>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-2 w-full"
        role="img"
        aria-label={`Gráfico de ${points.length} registros`}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--color-line)"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 6}
              y={y(t) + 3.5}
              textAnchor="end"
              fontSize="10"
              fill="var(--color-ink-muted)"
            >
              {fmt(t)}
            </text>
          </g>
        ))}
        <text x={PAD.left} y={H - 6} fontSize="10" fill="var(--color-ink-muted)">
          {shortDate(parseDayKey(points[0]?.day ?? ''))}
        </text>
        {points.length > 1 ? (
          <text
            x={W - PAD.right}
            y={H - 6}
            textAnchor="end"
            fontSize="10"
            fill="var(--color-ink-muted)"
          >
            {shortDate(parseDayKey(points.at(-1)?.day ?? ''))}
          </text>
        ) : null}
        {points.length > 1 ? (
          <path
            d={path}
            fill="none"
            stroke="var(--color-signal)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={x(p.day)}
              cy={y(p.value)}
              r={sel === p ? 5 : 3.5}
              fill={sel === p ? 'var(--color-ink)' : 'var(--color-steel)'}
              stroke="var(--color-obsidian)"
              strokeWidth="2"
            />
            {/* Alvo de toque maior que o ponto. */}
            <circle
              cx={x(p.day)}
              cy={y(p.value)}
              r="14"
              fill="transparent"
              onClick={() => setSel(sel === p ? null : p)}
              onMouseEnter={() => setSel(p)}
              style={{ cursor: 'pointer' }}
            />
          </g>
        ))}
      </svg>
      <table className="sr-only">
        <caption>Registros</caption>
        <thead>
          <tr>
            <th>Data</th>
            <th>Valor ({unit})</th>
            <th>Média de 7 dias</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p, i) => (
            <tr key={p.day + i}>
              <td>{p.day}</td>
              <td>{fmt(p.value)}</td>
              <td>{fmt(trend[i]?.value ?? null)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
