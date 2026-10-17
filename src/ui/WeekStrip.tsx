import { currentWeek } from '../lib/date'

/** A semana atual, de segunda a domingo. Dias sem treino têm contorno tracejado. */
export function WeekStrip({ today }: { today: Date }) {
  const week = currentWeek(today)
  return (
    <ol aria-label="Semana atual" className="mt-4 grid grid-cols-7 gap-1.5">
      {week.map((d) => (
        <li
          key={d.key}
          aria-current={d.isToday ? 'date' : undefined}
          aria-label={`${d.short} ${d.day}${d.isToday ? ', hoje' : ''}, sem treino planejado`}
          className={`flex h-[4.5rem] flex-col items-center justify-center gap-1 rounded-[var(--radius-control)] ${
            d.isToday
              ? 'bg-signal text-obsidian'
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
        </li>
      ))}
    </ol>
  )
}
