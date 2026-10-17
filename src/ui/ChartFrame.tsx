import { recentMondays, shortDate } from '../lib/date'

/** Moldura de gráfico com as datas reais do período, mostrada enquanto não há pontos. */
export function ChartFrame({ today, emptyText }: { today: Date; emptyText: string }) {
  const mondays = recentMondays(today, 4)
  return (
    <figure className="mt-4">
      <div className="relative h-36">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            aria-hidden
            className="absolute inset-x-0 border-t border-dashed border-line"
            style={{ top: `${i * 50}%` }}
          />
        ))}
        <div aria-hidden className="absolute inset-x-0 bottom-0 border-t border-line" />
        <p className="absolute inset-0 grid place-items-center">
          <span className="bg-obsidian px-3 text-ink-muted">{emptyText}</span>
        </p>
      </div>
      <figcaption className="mt-2 grid grid-cols-4 text-micro text-ink-muted tabular-nums">
        {mondays.map((d) => (
          <span key={d.toISOString()}>{shortDate(d)}</span>
        ))}
      </figcaption>
    </figure>
  )
}
