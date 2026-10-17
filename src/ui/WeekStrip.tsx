import { Check } from 'lucide-react'
import { currentWeek } from '../lib/date'

export type DayMark = 'feito' | 'planejado'

/**
 * A semana atual, de segunda a domingo. Hoje em amarelo; dia com treino feito ganha um visto;
 * dia planejado tem contorno contínuo; dia livre, tracejado.
 */
export function WeekStrip({
  today,
  marks = {},
  labels = {},
}: {
  today: Date
  marks?: Record<string, DayMark>
  labels?: Record<string, string>
}) {
  const week = currentWeek(today)
  return (
    <ol aria-label="Semana atual" className="mt-4 grid grid-cols-7 gap-1.5">
      {week.map((d) => {
        const mark = marks[d.key]
        const label = labels[d.key]
        const desc =
          mark === 'feito'
            ? 'treino feito'
            : mark === 'planejado'
              ? `planejado: ${label ?? 'treino'}`
              : 'livre'
        return (
          <li
            key={d.key}
            aria-current={d.isToday ? 'date' : undefined}
            aria-label={`${d.short} ${d.day}${d.isToday ? ', hoje' : ''}, ${desc}`}
            className={`relative flex h-[4.5rem] flex-col items-center justify-center gap-1 rounded-[var(--radius-control)] ${
              d.isToday
                ? 'bg-signal text-obsidian'
                : mark
                  ? 'border border-steel/50 text-ink'
                  : 'border border-dashed border-line text-ink-muted'
            }`}
          >
            <span aria-hidden className="text-micro font-medium">
              {d.short}
            </span>
            <span
              aria-hidden
              className="text-[1.5rem] leading-none font-extrabold tabular-nums [font-stretch:70%]"
            >
              {d.day}
            </span>
            {mark === 'feito' ? (
              <Check
                aria-hidden
                strokeWidth={3}
                className={`absolute top-1 right-1 size-3 ${d.isToday ? 'text-obsidian' : 'text-ok'}`}
              />
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
