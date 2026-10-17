import { useState } from 'react'
import { Check, Trash2 } from 'lucide-react'
import type { ExerciseSet } from '../../lib/db'

const cell =
  'h-11 w-full rounded-[var(--radius-control)] border border-line bg-graphite px-2 text-center text-body tabular-nums outline-none focus:border-signal disabled:border-transparent disabled:bg-transparent'

function parseDecimal(v: string): number | null {
  const n = Number(v.replace(',', '.'))
  return v.trim() === '' || !Number.isFinite(n) ? null : n
}

/** Linha de série: carga, repetições e o botão de concluir. */
export function SetRow({
  set,
  index,
  readOnly,
  onSave,
  onDelete,
}: {
  set: ExerciseSet
  index: number
  readOnly: boolean
  onSave: (patch: { weight_kg: number | null; reps: number | null; completed: boolean }) => void
  onDelete: () => void
}) {
  const [weight, setWeight] = useState(set.weight_kg?.toString().replace('.', ',') ?? '')
  const [reps, setReps] = useState(set.reps?.toString() ?? '')
  const [error, setError] = useState<string | null>(null)
  const done = Boolean(set.completed_at)

  function toggle() {
    const w = parseDecimal(weight)
    const r = parseDecimal(reps)
    if (!done) {
      if (r === null || !Number.isInteger(r) || r < 0 || r > 200)
        return setError('Repetições: 0 a 200.')
      if (w !== null && (w < 0 || w > 1000)) return setError('Carga: 0 a 1000 kg.')
    }
    setError(null)
    onSave({ weight_kg: w, reps: r, completed: !done })
  }

  return (
    <li>
      <div className="grid grid-cols-[2rem_1fr_1fr_2.75rem_2.75rem] items-center gap-2 py-1.5">
        <span className="text-center text-small text-ink-muted tabular-nums">{index + 1}</span>
        <input
          aria-label={`Carga da série ${index + 1} em kg`}
          inputMode="decimal"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          disabled={readOnly || done}
          placeholder="kg"
          className={cell}
        />
        <input
          aria-label={`Repetições da série ${index + 1}`}
          inputMode="numeric"
          value={reps}
          onChange={(e) => setReps(e.target.value.replace(/\D/g, ''))}
          disabled={readOnly || done}
          placeholder="reps"
          className={cell}
        />
        {readOnly ? (
          <span className="grid place-items-center text-ok">
            {done ? <Check aria-label="Concluída" className="size-5" /> : null}
          </span>
        ) : (
          <button
            type="button"
            aria-pressed={done}
            aria-label={done ? `Reabrir série ${index + 1}` : `Concluir série ${index + 1}`}
            onClick={toggle}
            className={`grid size-11 place-items-center rounded-full border-2 ${
              done
                ? 'border-signal bg-signal text-obsidian'
                : 'border-line text-ink-muted hover:border-steel'
            }`}
          >
            <Check aria-hidden strokeWidth={3} className="size-5" />
          </button>
        )}
        {readOnly ? (
          <span />
        ) : (
          <button
            type="button"
            aria-label={`Excluir série ${index + 1}`}
            onClick={onDelete}
            className="grid size-11 place-items-center rounded-full text-ink-muted hover:text-danger"
          >
            <Trash2 aria-hidden className="size-4" />
          </button>
        )}
      </div>
      {error ? <p className="pb-1 pl-10 text-small text-danger">{error}</p> : null}
    </li>
  )
}
