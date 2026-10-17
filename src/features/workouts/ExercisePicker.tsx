import { useMemo, useState, type FormEvent } from 'react'
import { Plus, Search } from 'lucide-react'
import { Button } from '../../ui/Button'
import { inputClass, TextField } from '../../ui/Form'
import { LoadingRows, ErrorState } from '../../ui/States'
import type { Exercise } from '../../lib/db'
import { useCreateExercise, useExercises } from './queries'
import { filterExercises } from './domain/exercises'

export function ExercisePicker({ onPick }: { onPick: (e: Exercise) => void }) {
  const exercises = useExercises()
  const create = useCreateExercise()
  const [term, setTerm] = useState('')
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [muscle, setMuscle] = useState('')
  const [error, setError] = useState<string | null>(null)

  const filtered = useMemo(
    () => filterExercises(exercises.data ?? [], term),
    [exercises.data, term],
  )

  function submitNew(e: FormEvent) {
    e.preventDefault()
    const n = name.trim()
    if (!n) return setError('Dê um nome ao exercício.')
    create.mutate(
      {
        name: n.slice(0, 80),
        primary_muscles: muscle.trim() ? [muscle.trim().toLowerCase()] : [],
        equipment: null,
        instructions: null,
      },
      {
        onSuccess: (ex) => {
          setCreating(false)
          setName('')
          setMuscle('')
          onPick(ex)
        },
        onError: () => setError('Não foi possível criar o exercício agora.'),
      },
    )
  }

  if (creating) {
    return (
      <form noValidate onSubmit={submitNew} className="space-y-4">
        <TextField
          label="Nome do exercício"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          error={error}
        />
        <TextField
          label="Músculo principal (opcional)"
          value={muscle}
          onChange={(e) => setMuscle(e.target.value)}
          placeholder="Ex.: peitoral"
        />
        <div className="flex gap-3">
          <Button type="submit" busy={create.isPending}>
            Criar e adicionar
          </Button>
          <Button variant="quiet" onClick={() => setCreating(false)}>
            Voltar à lista
          </Button>
        </div>
      </form>
    )
  }

  return (
    <div>
      <label className="relative block">
        <span className="sr-only">Buscar exercício</span>
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-muted"
        />
        <input
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Nome, músculo ou equipamento"
          className={`${inputClass} h-12 pl-11`}
        />
      </label>
      {exercises.isPending ? <LoadingRows label="Carregando exercícios" /> : null}
      {exercises.isError ? (
        <ErrorState
          title="Não foi possível carregar os exercícios"
          onRetry={() => void exercises.refetch()}
        >
          Confira a internet e tente de novo.
        </ErrorState>
      ) : null}
      <ul className="mt-3 max-h-[50dvh] divide-y divide-line overflow-y-auto">
        {filtered.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => onPick(e)}
              className="flex min-h-14 w-full flex-col items-start justify-center rounded-[var(--radius-control)] px-1 py-2 text-left hover:bg-graphite"
            >
              <span className="text-ink">{e.name}</span>
              <span className="text-small text-ink-muted">
                {[e.primary_muscles.join(', '), e.equipment].filter(Boolean).join(' — ')}
                {e.user_id ? ' (seu)' : ''}
              </span>
            </button>
          </li>
        ))}
        {exercises.isSuccess && filtered.length === 0 ? (
          <li className="py-4 text-ink-muted">Nenhum exercício com esse nome.</li>
        ) : null}
      </ul>
      <Button
        variant="secondary"
        className="mt-4"
        icon={<Plus aria-hidden className="size-4" />}
        onClick={() => setCreating(true)}
      >
        Criar exercício
      </Button>
    </div>
  )
}
