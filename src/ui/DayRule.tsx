import { clockTime, dayProgress } from '../lib/date'

const TICKS = [
  { at: 0.25, label: '06' },
  { at: 0.5, label: '12' },
  { at: 0.75, label: '18' },
]

/** Régua do dia: quanto do dia já passou, com a hora atual marcada em amarelo. */
export function DayRule({ now }: { now: Date }) {
  const progress = dayProgress(now)
  const pct = `${(progress * 100).toFixed(2)}%`
  const time = clockTime(now)
  const clampedLeft = `clamp(1.5rem, ${pct}, calc(100% - 1.5rem))`

  return (
    <div
      role="img"
      aria-label={`Agora são ${time}; ${Math.round(progress * 100)}% do dia já passou`}
      className="relative pt-7 pb-6"
    >
      <span
        className="absolute top-0 -translate-x-1/2 text-small font-semibold text-ink tabular-nums"
        style={{ left: clampedLeft }}
      >
        {time}
      </span>
      <div className="relative h-0.5 rounded-full bg-line">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-steel/70"
          style={{ width: pct }}
        />
        {TICKS.map((t) => (
          <span
            key={t.label}
            aria-hidden
            className="absolute top-1/2 h-2 w-px -translate-y-1/2 bg-ink-muted/60"
            style={{ left: `${t.at * 100}%` }}
          />
        ))}
        <span
          aria-hidden
          className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal ring-4 ring-obsidian"
          style={{ left: pct }}
        />
      </div>
      {TICKS.map((t) => (
        <span
          key={t.label}
          aria-hidden
          className="absolute bottom-0 -translate-x-1/2 text-micro text-ink-muted tabular-nums"
          style={{ left: `${t.at * 100}%` }}
        >
          {t.label}
        </span>
      ))}
    </div>
  )
}
