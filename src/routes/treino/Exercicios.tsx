import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Screen, Section } from '../../ui/Screen'
import { inputClass } from '../../ui/Form'
import { QueryState } from '../../ui/QueryState'
import { useExercises } from '../../features/workouts/queries'
import { filterExercises } from '../../features/workouts/domain/exercises'

export function Exercicios() {
  const exercises = useExercises()
  const [term, setTerm] = useState('')
  const list = useMemo(() => filterExercises(exercises.data ?? [], term), [exercises.data, term])

  return (
    <Screen title="Exercícios" backTo="/treino">
      <label className="relative block pb-6">
        <span className="sr-only">Buscar exercício</span>
        <Search
          aria-hidden
          className="pointer-events-none absolute top-6 left-4 size-4 -translate-y-1/2 text-ink-muted"
        />
        <input
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Nome, músculo ou equipamento"
          className={`${inputClass} h-12 pl-11`}
        />
      </label>
      <Section title={`${list.length} ${list.length === 1 ? 'exercício' : 'exercícios'}`}>
        <QueryState
          query={exercises}
          loadingLabel="Carregando exercícios"
          errorTitle="Não foi possível carregar os exercícios"
        >
          {() => (
            <ul className="mt-2 divide-y divide-line">
              {list.map((e) => (
                <li key={e.id}>
                  <details className="group py-3">
                    <summary className="flex min-h-11 cursor-pointer list-none flex-col justify-center">
                      <span className="text-ink group-open:text-signal">{e.name}</span>
                      <span className="text-small text-ink-muted">
                        {[e.primary_muscles.join(', '), e.equipment].filter(Boolean).join(' — ')}
                        {e.user_id ? ' (seu)' : ''}
                      </span>
                    </summary>
                    <div className="mt-2 space-y-2 text-ink-muted">
                      {e.instructions ? (
                        <p className="max-w-prose">{e.instructions}</p>
                      ) : (
                        <p>Sem instruções cadastradas.</p>
                      )}
                      {e.secondary_muscles.length ? (
                        <p className="text-small">
                          Também trabalha: {e.secondary_muscles.join(', ')}.
                        </p>
                      ) : null}
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </QueryState>
      </Section>
    </Screen>
  )
}
