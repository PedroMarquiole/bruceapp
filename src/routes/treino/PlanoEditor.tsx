import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { Screen, Section } from '../../ui/Screen'
import { Button } from '../../ui/Button'
import { QueryState } from '../../ui/QueryState'
import { Sheet } from '../../ui/Sheet'
import { Segmented, TextField } from '../../ui/Form'
import { ExercisePicker } from '../../features/workouts/ExercisePicker'
import {
  useArchivePlan,
  useDeleteDay,
  useDeletePlanExercise,
  useExercises,
  usePlan,
  useSaveDay,
  useSavePlanExercise,
  useUpdatePlan,
  type PlanDayFull,
} from '../../features/workouts/queries'
import { formatTarget } from '../../features/workouts/domain/sets'
import type { PlanExercise } from '../../lib/db'

const WEEKDAYS = [
  { value: '0', label: 'Sem dia fixo' },
  { value: '1', label: 'Seg' },
  { value: '2', label: 'Ter' },
  { value: '3', label: 'Qua' },
  { value: '4', label: 'Qui' },
  { value: '5', label: 'Sex' },
  { value: '6', label: 'Sáb' },
  { value: '7', label: 'Dom' },
] as const
type WeekdayValue = (typeof WEEKDAYS)[number]['value']

type DayEdit = { day?: PlanDayFull; name: string; weekday: WeekdayValue }

function toInt(v: string): number | null {
  const n = Number(v)
  return v.trim() === '' || !Number.isInteger(n) ? null : n
}

export function PlanoEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const plan = usePlan(id)
  const exercises = useExercises()
  const updatePlan = useUpdatePlan()
  const archive = useArchivePlan()
  const saveDay = useSaveDay()
  const deleteDay = useDeleteDay()
  const saveEx = useSavePlanExercise()
  const deleteEx = useDeletePlanExercise()

  const [name, setName] = useState<string | null>(null)
  const [dayEdit, setDayEdit] = useState<DayEdit | null>(null)
  const [pickFor, setPickFor] = useState<PlanDayFull | null>(null)
  const [exEdit, setExEdit] = useState<PlanExercise | null>(null)
  const [targets, setTargets] = useState({ sets: '3', min: '8', max: '12', rest: '90' })
  const [error, setError] = useState<string | null>(null)

  const exName = (eid: string) => exercises.data?.find((e) => e.id === eid)?.name ?? 'Exercício'
  const fail = (msg: string) => () => setError(msg)

  function submitDay(e: FormEvent, planId: string, count: number) {
    e.preventDefault()
    if (!dayEdit) return
    const n = dayEdit.name.trim()
    if (!n) return setError('Dê um nome ao dia, como "Treino A" ou "Pernas".')
    saveDay.mutate(
      {
        ...(dayEdit.day ? { id: dayEdit.day.id } : {}),
        plan_id: planId,
        name: n.slice(0, 60),
        weekday: dayEdit.weekday === '0' ? null : Number(dayEdit.weekday),
        position: dayEdit.day?.position ?? count,
      },
      { onSuccess: () => setDayEdit(null), onError: fail('Não foi possível salvar o dia.') },
    )
  }

  function submitTargets(e: FormEvent) {
    e.preventDefault()
    if (!exEdit) return
    const sets = toInt(targets.sets)
    const min = toInt(targets.min)
    const max = toInt(targets.max)
    const rest = toInt(targets.rest)
    if (!sets || sets < 1 || sets > 20) return setError('Séries: de 1 a 20.')
    if ((min !== null && (min < 1 || min > 100)) || (max !== null && (max < 1 || max > 100)))
      return setError('Repetições: de 1 a 100.')
    if (min !== null && max !== null && max < min)
      return setError('O máximo de repetições deve ser maior ou igual ao mínimo.')
    if (rest !== null && (rest < 0 || rest > 900)) return setError('Descanso: de 0 a 900 segundos.')
    saveEx.mutate(
      {
        id: exEdit.id,
        target_sets: sets,
        target_reps_min: min,
        target_reps_max: max,
        rest_seconds: rest,
      },
      { onSuccess: () => setExEdit(null), onError: fail('Não foi possível salvar as metas.') },
    )
  }

  function move(day: PlanDayFull, index: number, dir: -1 | 1) {
    const list = [...day.workout_plan_exercises]
    const target = index + dir
    if (target < 0 || target >= list.length) return
    const [item] = list.splice(index, 1)
    if (!item) return
    list.splice(target, 0, item)
    // Renumera a ordem inteira: evita posições repetidas depois de exclusões.
    list.forEach((pe, i) => {
      if (pe.position !== i) saveEx.mutate({ id: pe.id, position: i })
    })
  }

  return (
    <Screen title="Plano" backTo="/treino">
      <QueryState
        query={plan}
        loadingLabel="Carregando plano"
        errorTitle="Não foi possível abrir o plano"
      >
        {(p) => (
          <>
            <form
              noValidate
              className="flex items-end gap-3 pb-6"
              onSubmit={(e) => {
                e.preventDefault()
                const n = (name ?? p.name).trim()
                if (!n) return setError('O plano precisa de um nome.')
                updatePlan.mutate(
                  { id: p.id, name: n.slice(0, 80) },
                  { onSuccess: () => setName(null), onError: fail('Não foi possível renomear.') },
                )
              }}
            >
              <div className="flex-1">
                <TextField
                  label="Nome do plano"
                  value={name ?? p.name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                />
              </div>
              {name !== null && name !== p.name ? (
                <Button type="submit" busy={updatePlan.isPending}>
                  Salvar
                </Button>
              ) : null}
            </form>

            {p.workout_plan_days.map((d) => (
              <Section
                key={d.id}
                title={d.name}
                aside={
                  <Button
                    variant="quiet"
                    className="-mr-4"
                    onClick={() =>
                      setDayEdit({
                        day: d,
                        name: d.name,
                        weekday: String(d.weekday ?? 0) as WeekdayValue,
                      })
                    }
                  >
                    Editar dia
                  </Button>
                }
              >
                <p className="text-small text-ink-muted">
                  {d.weekday ? `Toda ${WEEKDAYS[d.weekday]?.label}` : 'Sem dia fixo'}
                </p>
                <ul className="mt-2 divide-y divide-line">
                  {d.workout_plan_exercises.map((pe, i) => (
                    <li key={pe.id} className="flex min-h-14 items-center gap-2 py-1.5">
                      <button
                        type="button"
                        className="min-w-0 flex-1 rounded-[var(--radius-control)] py-1 text-left hover:text-signal"
                        onClick={() => {
                          setExEdit(pe)
                          setTargets({
                            sets: String(pe.target_sets),
                            min: pe.target_reps_min?.toString() ?? '',
                            max: pe.target_reps_max?.toString() ?? '',
                            rest: pe.rest_seconds?.toString() ?? '',
                          })
                        }}
                      >
                        <span className="block truncate">{exName(pe.exercise_id)}</span>
                        <span className="block text-small text-ink-muted tabular-nums">
                          {formatTarget(pe.target_sets, pe.target_reps_min, pe.target_reps_max)}
                          {pe.rest_seconds ? `, descanso ${pe.rest_seconds} s` : ''}
                        </span>
                      </button>
                      <button
                        type="button"
                        aria-label={`Subir ${exName(pe.exercise_id)}`}
                        disabled={i === 0}
                        onClick={() => move(d, i, -1)}
                        className="grid size-11 place-items-center rounded-full text-ink-muted hover:text-ink disabled:opacity-30"
                      >
                        <ArrowUp aria-hidden className="size-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Descer ${exName(pe.exercise_id)}`}
                        disabled={i === d.workout_plan_exercises.length - 1}
                        onClick={() => move(d, i, 1)}
                        className="grid size-11 place-items-center rounded-full text-ink-muted hover:text-ink disabled:opacity-30"
                      >
                        <ArrowDown aria-hidden className="size-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Remover ${exName(pe.exercise_id)} do dia`}
                        onClick={() =>
                          deleteEx.mutate(pe.id, { onError: fail('Não foi possível remover.') })
                        }
                        className="grid size-11 place-items-center rounded-full text-ink-muted hover:text-danger"
                      >
                        <Trash2 aria-hidden className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
                <Button
                  variant="secondary"
                  className="mt-3"
                  icon={<Plus aria-hidden className="size-4" />}
                  onClick={() => setPickFor(d)}
                >
                  Adicionar exercício
                </Button>
              </Section>
            ))}

            <div className="border-t border-line pt-5">
              <Button
                icon={<Plus aria-hidden className="size-4" />}
                onClick={() => setDayEdit({ name: '', weekday: '0' })}
              >
                Adicionar dia
              </Button>
              {error ? (
                <p role="alert" className="mt-3 text-small text-danger">
                  {error}
                </p>
              ) : null}
              <Button
                variant="danger"
                className="mt-8"
                busy={archive.isPending}
                onClick={() =>
                  archive.mutate(p.id, {
                    onSuccess: () => navigate('/treino'),
                    onError: fail('Não foi possível arquivar.'),
                  })
                }
              >
                Arquivar plano
              </Button>
              <p className="mt-2 text-small text-ink-muted">
                Sessões já feitas com este plano continuam no histórico.
              </p>
            </div>

            <Sheet
              open={dayEdit !== null}
              title={dayEdit?.day ? 'Editar dia' : 'Novo dia'}
              onClose={() => setDayEdit(null)}
            >
              {dayEdit ? (
                <form
                  noValidate
                  className="space-y-5"
                  onSubmit={(e) => submitDay(e, p.id, p.workout_plan_days.length)}
                >
                  <TextField
                    label="Nome"
                    value={dayEdit.name}
                    onChange={(e) => setDayEdit({ ...dayEdit, name: e.target.value })}
                    placeholder="Ex.: Treino A, Pernas"
                    maxLength={60}
                  />
                  <Segmented
                    label="Dia da semana"
                    options={WEEKDAYS}
                    value={dayEdit.weekday}
                    onChange={(v) => setDayEdit({ ...dayEdit, weekday: v })}
                  />
                  <Button type="submit" busy={saveDay.isPending} className="w-full">
                    Salvar dia
                  </Button>
                  {dayEdit.day ? (
                    <Button
                      variant="danger"
                      className="w-full"
                      busy={deleteDay.isPending}
                      onClick={() =>
                        dayEdit.day &&
                        deleteDay.mutate(dayEdit.day.id, {
                          onSuccess: () => setDayEdit(null),
                          onError: fail('Não foi possível excluir o dia.'),
                        })
                      }
                    >
                      Excluir dia
                    </Button>
                  ) : null}
                </form>
              ) : null}
            </Sheet>

            <Sheet
              open={pickFor !== null}
              title="Adicionar exercício"
              onClose={() => setPickFor(null)}
            >
              {pickFor ? (
                <ExercisePicker
                  onPick={(ex) =>
                    saveEx.mutate(
                      {
                        plan_day_id: pickFor.id,
                        exercise_id: ex.id,
                        position: pickFor.workout_plan_exercises.length,
                        target_sets: 3,
                        target_reps_min: 8,
                        target_reps_max: 12,
                        rest_seconds: 90,
                      },
                      {
                        onSuccess: () => setPickFor(null),
                        onError: fail('Não foi possível adicionar.'),
                      },
                    )
                  }
                />
              ) : null}
            </Sheet>

            <Sheet
              open={exEdit !== null}
              title={exEdit ? exName(exEdit.exercise_id) : ''}
              onClose={() => setExEdit(null)}
            >
              <form noValidate className="space-y-4" onSubmit={submitTargets}>
                <TextField
                  label="Séries"
                  type="number"
                  inputMode="numeric"
                  value={targets.sets}
                  onChange={(e) => setTargets({ ...targets, sets: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <TextField
                    label="Repetições mín."
                    type="number"
                    inputMode="numeric"
                    value={targets.min}
                    onChange={(e) => setTargets({ ...targets, min: e.target.value })}
                  />
                  <TextField
                    label="Repetições máx."
                    type="number"
                    inputMode="numeric"
                    value={targets.max}
                    onChange={(e) => setTargets({ ...targets, max: e.target.value })}
                  />
                </div>
                <TextField
                  label="Descanso (segundos)"
                  type="number"
                  inputMode="numeric"
                  value={targets.rest}
                  onChange={(e) => setTargets({ ...targets, rest: e.target.value })}
                />
                <Button type="submit" busy={saveEx.isPending} className="w-full">
                  Salvar metas
                </Button>
              </form>
            </Sheet>
          </>
        )}
      </QueryState>
    </Screen>
  )
}
