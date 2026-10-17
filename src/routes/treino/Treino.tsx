import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { BookOpen, ChevronRight, Dumbbell, Play, Plus, Repeat2 } from 'lucide-react'
import { Screen, Section } from '../../ui/Screen'
import { Button } from '../../ui/Button'
import { EmptyState } from '../../ui/States'
import { QueryState } from '../../ui/QueryState'
import { Sheet } from '../../ui/Sheet'
import { TextField } from '../../ui/Form'
import { WeekStrip, type DayMark } from '../../ui/WeekStrip'
import { currentWeek, localDayKey } from '../../lib/date'
import { useNow } from '../../lib/useNow'
import {
  useActiveSession,
  useCreatePlan,
  useExercises,
  usePlans,
  useSessionHistory,
  useStartSession,
  type PlanDayFull,
} from '../../features/workouts/queries'
import { formatDuration, volume } from '../../features/workouts/domain/sets'
import { fmt } from '../../features/nutrition/domain/nutrients'

export function Treino() {
  const now = useNow()
  const navigate = useNavigate()
  const plans = usePlans()
  const history = useSessionHistory(20)
  const active = useActiveSession()
  const exercises = useExercises()
  const start = useStartSession()
  const createPlan = useCreatePlan()
  const [newPlanOpen, setNewPlanOpen] = useState(false)
  const [planName, setPlanName] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Marcas da semana: dias com treino feito e dias planejados pelo dia da semana do plano.
  const week = currentWeek(now)
  const marks: Record<string, DayMark> = {}
  const labels: Record<string, string> = {}
  week.forEach((d, i) => {
    const planned = (plans.data ?? [])
      .flatMap((p) => p.workout_plan_days)
      .find((pd) => pd.weekday === i + 1)
    if (planned) {
      marks[d.key] = 'planejado'
      labels[d.key] = planned.name
    }
  })
  for (const s of history.data ?? []) {
    const key = localDayKey(new Date(s.started_at))
    if (week.some((d) => d.key === key)) marks[key] = 'feito'
  }

  function startDay(day: PlanDayFull | null) {
    setError(null)
    if (active.data) {
      navigate(`/treino/sessao/${active.data.id}`)
      return
    }
    start.mutate(
      { day, exercises: exercises.data ?? [] },
      {
        onSuccess: (s) => navigate(`/treino/sessao/${s.id}`),
        onError: () =>
          setError('Não foi possível começar o treino. Confira a internet e tente de novo.'),
      },
    )
  }

  function submitPlan(e: FormEvent) {
    e.preventDefault()
    const name = planName.trim()
    if (!name) return setError('Dê um nome ao plano.')
    createPlan.mutate(name.slice(0, 80), {
      onSuccess: (p) => {
        setNewPlanOpen(false)
        setPlanName('')
        navigate(`/treino/planos/${(p as { id: string }).id}`)
      },
      onError: () => setError('Não foi possível criar o plano agora.'),
    })
  }

  return (
    <Screen title="Treino">
      {active.data ? (
        <Link
          to={`/treino/sessao/${active.data.id}`}
          className="mb-6 flex min-h-16 items-center gap-4 rounded-[var(--radius-control)] bg-signal px-4 text-obsidian"
        >
          <Play aria-hidden className="size-5" />
          <span className="flex-1">
            <span className="block font-semibold">
              {active.data.status === 'pausada' ? 'Sessão pausada' : 'Sessão em andamento'}
            </span>
            <span className="block text-small">
              {active.data.title}, {formatDuration(active.data.started_at, null, now)}
            </span>
          </span>
          <ChevronRight aria-hidden className="size-5" />
        </Link>
      ) : null}

      <Section title="Esta semana">
        <WeekStrip today={now} marks={marks} labels={labels} />
      </Section>

      <Section
        title="Planos"
        aside={
          <Button
            variant="quiet"
            className="-mr-4"
            icon={<Plus aria-hidden className="size-4" />}
            onClick={() => setNewPlanOpen(true)}
          >
            Novo plano
          </Button>
        }
      >
        <QueryState
          query={plans}
          loadingLabel="Carregando planos"
          errorTitle="Não foi possível carregar os planos"
        >
          {(list) =>
            list.length === 0 ? (
              <EmptyState icon={<Dumbbell className="size-5" />} title="Nenhum plano criado">
                Monte um plano com os dias e exercícios da sua rotina. Ou comece um treino livre e
                registre o que fizer.
              </EmptyState>
            ) : (
              <ul className="mt-2 space-y-5">
                {list.map((p) => (
                  <li key={p.id}>
                    <div className="flex items-baseline justify-between gap-3">
                      <Link
                        to={`/treino/planos/${p.id}`}
                        className="font-semibold hover:text-signal"
                      >
                        {p.name}
                      </Link>
                      <Link
                        to={`/treino/planos/${p.id}`}
                        className="text-small text-ink-muted hover:text-ink"
                      >
                        Editar
                      </Link>
                    </div>
                    {p.workout_plan_days.length === 0 ? (
                      <p className="mt-1 text-small text-ink-muted">
                        Sem dias ainda. Abra o plano para montar.
                      </p>
                    ) : (
                      <ul className="mt-2 divide-y divide-line border-y border-line">
                        {p.workout_plan_days.map((d) => (
                          <li key={d.id} className="flex min-h-14 items-center gap-3">
                            <span className="min-w-0 flex-1">
                              <span className="block truncate">{d.name}</span>
                              <span className="block text-small text-ink-muted">
                                {d.workout_plan_exercises.length}{' '}
                                {d.workout_plan_exercises.length === 1 ? 'exercício' : 'exercícios'}
                              </span>
                            </span>
                            <Button
                              variant="secondary"
                              icon={<Play aria-hidden className="size-4" />}
                              disabled={
                                start.isPending ||
                                Boolean(active.data) ||
                                d.workout_plan_exercises.length === 0
                              }
                              onClick={() => startDay(d)}
                            >
                              Começar
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )
          }
        </QueryState>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            variant="secondary"
            busy={start.isPending}
            disabled={Boolean(active.data)}
            onClick={() => startDay(null)}
          >
            Treino livre
          </Button>
          <Link
            to="/treino/exercicios"
            className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] px-4 font-medium text-ink hover:bg-graphite"
          >
            <BookOpen aria-hidden className="size-4" />
            Biblioteca de exercícios
          </Link>
        </div>
        {error ? (
          <p role="alert" className="mt-3 text-small text-danger">
            {error}
          </p>
        ) : null}
      </Section>

      <Section title="Histórico">
        <QueryState
          query={history}
          loadingLabel="Carregando histórico"
          errorTitle="Não foi possível carregar o histórico"
        >
          {(list) =>
            list.length === 0 ? (
              <EmptyState icon={<Repeat2 className="size-5" />} title="Nenhuma sessão registrada">
                Cada treino finalizado fica guardado como foi feito, mesmo que o plano mude depois.
              </EmptyState>
            ) : (
              <ul className="mt-2 divide-y divide-line">
                {list.map((s) => {
                  const sets = s.session_exercises.flatMap((e) => e.exercise_sets)
                  return (
                    <li key={s.id}>
                      <Link
                        to={`/treino/sessao/${s.id}`}
                        className="flex min-h-16 items-center gap-3 py-2 hover:text-signal"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{s.title}</span>
                          <span className="block text-small text-ink-muted tabular-nums">
                            {new Intl.DateTimeFormat('pt-BR', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                            }).format(new Date(s.started_at))}
                            {', '}
                            {formatDuration(s.started_at, s.finished_at)}
                            {', '}
                            {fmt(volume(sets), 0)} kg de volume
                          </span>
                        </span>
                        <ChevronRight aria-hidden className="size-5 text-ink-muted" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )
          }
        </QueryState>
      </Section>

      <Sheet open={newPlanOpen} title="Novo plano" onClose={() => setNewPlanOpen(false)}>
        <form noValidate onSubmit={submitPlan} className="space-y-4">
          <TextField
            label="Nome do plano"
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            placeholder="Ex.: ABC, Superior e inferior"
            maxLength={80}
          />
          <Button type="submit" busy={createPlan.isPending} className="w-full">
            Criar plano
          </Button>
        </form>
      </Sheet>
    </Screen>
  )
}
