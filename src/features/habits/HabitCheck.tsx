import { Check, Flame } from 'lucide-react'
import type { Habit } from '../../lib/db'

/**
 * Marca o hábito do dia. Meta 1: liga/desliga. Meta > 1: cada toque soma um; ao completar,
 * o próximo toque zera (com rótulo explícito).
 */
export function HabitCheck({
  habit,
  count,
  streak,
  onChange,
  busy = false,
}: {
  habit: Habit
  count: number
  streak: number
  onChange: (next: number) => void
  busy?: boolean
}) {
  const target = habit.target_per_day
  const done = count >= target
  const next = done ? 0 : count + 1
  const action = done
    ? `Desmarcar ${habit.name}`
    : target > 1
      ? `Somar 1 em ${habit.name} (${count} de ${target})`
      : `Marcar ${habit.name} como feito`

  return (
    <li className="flex min-h-14 items-center gap-4 py-2">
      <button
        type="button"
        aria-label={action}
        aria-pressed={done}
        disabled={busy}
        onClick={() => onChange(next)}
        className={`relative grid size-11 shrink-0 place-items-center rounded-full border-2 transition-colors disabled:opacity-60 ${
          done
            ? 'border-signal bg-signal text-obsidian'
            : 'border-line text-ink-muted hover:border-steel'
        }`}
      >
        {done ? (
          <Check aria-hidden strokeWidth={3} className="size-5" />
        ) : target > 1 ? (
          <span aria-hidden className="text-small font-bold tabular-nums">
            {count}
          </span>
        ) : null}
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={`truncate ${done ? 'text-ink-muted line-through decoration-line' : 'text-ink'}`}
        >
          {habit.name}
        </p>
        {target > 1 ? (
          <p className="text-small text-ink-muted tabular-nums">
            {count} de {target}
          </p>
        ) : null}
      </div>
      {streak > 0 ? (
        <span
          className="inline-flex items-center gap-1 text-small text-steel tabular-nums"
          aria-label={`Sequência de ${streak} ${streak === 1 ? 'dia' : 'dias'}`}
        >
          <Flame aria-hidden className="size-4" />
          {streak}
        </span>
      ) : null}
    </li>
  )
}
