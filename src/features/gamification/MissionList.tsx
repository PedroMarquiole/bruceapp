import { Check } from 'lucide-react'
import type { Mission } from './domain/rules'

export function MissionList({ missions }: { missions: Mission[] }) {
  return (
    <ul className="mt-2 divide-y divide-line">
      {missions.map((m) => (
        <li key={m.id} className="flex min-h-14 items-center gap-4 py-2">
          <span
            aria-hidden
            className={`grid size-7 shrink-0 place-items-center rounded-full border-2 ${
              m.done ? 'border-signal bg-signal text-obsidian' : 'border-line'
            }`}
          >
            {m.done ? <Check strokeWidth={3} className="size-4" /> : null}
          </span>
          <div className="min-w-0 flex-1">
            <p className={m.done ? 'text-ink-muted' : 'text-ink'}>{m.title}</p>
            <div
              role="progressbar"
              aria-label={m.title}
              aria-valuemin={0}
              aria-valuemax={m.target}
              aria-valuenow={m.progress}
              className="mt-1.5 h-1 overflow-hidden rounded-full bg-line"
            >
              <div
                className="h-full rounded-full bg-steel"
                style={{ width: `${(m.progress / m.target) * 100}%` }}
              />
            </div>
          </div>
          <span className="shrink-0 text-small text-ink-muted tabular-nums">
            {m.progress}/{m.target}
          </span>
        </li>
      ))}
    </ul>
  )
}
