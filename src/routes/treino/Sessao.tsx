import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Pause, Play, Plus, Trash2, Trophy } from 'lucide-react'
import { Screen, Section } from '../../ui/Screen'
import { Button } from '../../ui/Button'
import { QueryState } from '../../ui/QueryState'
import { Sheet } from '../../ui/Sheet'
import { TextAreaField } from '../../ui/Form'
import { useNow } from '../../lib/useNow'
import type { PersonalRecord } from '../../lib/db'
import { ExercisePicker } from '../../features/workouts/ExercisePicker'
import { RestTimer } from '../../features/workouts/RestTimer'
import { SetRow } from '../../features/workouts/SetRow'
import {
  useAddSessionExercise,
  useDeleteSession,
  useDeleteSet,
  useFinishSession,
  usePreviousPerformance,
  useRecords,
  useRemoveSessionExercise,
  useSaveSet,
  useSession,
  useSetSessionStatus,
  type SessionFull,
} from '../../features/workouts/queries'
import {
  CRITERION_LABEL,
  formatDuration,
  formatSet,
  formatTarget,
  volume,
} from '../../features/workouts/domain/sets'
import { fmt } from '../../features/nutrition/domain/nutrients'

const DEFAULT_REST = 90

export function Sessao() {
  const { id } = useParams()
  const session = useSession(id)
  return (
    <Screen title="Treino" backTo="/treino">
      <QueryState
        query={session}
        loadingLabel="Carregando sessão"
        errorTitle="Não foi possível abrir a sessão"
      >
        {(s) =>
          s.status === 'ativa' || s.status === 'pausada' ? (
            <SessaoAtiva s={s} />
          ) : (
            <SessaoResumo s={s} />
          )
        }
      </QueryState>
    </Screen>
  )
}

function SessaoAtiva({ s }: { s: SessionFull }) {
  const navigate = useNavigate()
  const now = useNow(15_000)
  const saveSet = useSaveSet()
  const deleteSet = useDeleteSet()
  const addEx = useAddSessionExercise()
  const removeEx = useRemoveSessionExercise()
  const setStatus = useSetSessionStatus()
  const finish = useFinishSession()
  const previous = usePreviousPerformance(
    s.session_exercises.map((e) => e.exercise_id).filter((x): x is string => Boolean(x)),
    s.id,
  )
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null)
  const [picking, setPicking] = useState(false)
  const [confirm, setConfirm] = useState<'finalizar' | 'cancelar' | null>(null)
  const [records, setRecords] = useState<PersonalRecord[] | null>(null)
  const [notes, setNotes] = useState(s.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const stopRest = useCallback(() => setRestEndsAt(null), [])
  const fail = (msg: string) => () => setError(msg)
  const completed = s.session_exercises
    .flatMap((e) => e.exercise_sets)
    .filter((x) => x.completed_at).length
  const paused = s.status === 'pausada'

  return (
    <div>
      {restEndsAt ? <RestTimer endsAt={restEndsAt} onDone={stopRest} /> : null}

      <div className="flex items-center justify-between gap-4 pb-6">
        <div>
          <p className="type-section">{s.title}</p>
          <p className="text-small text-ink-muted tabular-nums">
            {paused ? 'Pausada' : 'Em andamento'}, {formatDuration(s.started_at, null, now)}
          </p>
        </div>
        <Button
          variant="secondary"
          icon={
            paused ? (
              <Play aria-hidden className="size-4" />
            ) : (
              <Pause aria-hidden className="size-4" />
            )
          }
          busy={setStatus.isPending}
          onClick={() =>
            setStatus.mutate(
              { id: s.id, status: paused ? 'ativa' : 'pausada' },
              { onError: fail('Não foi possível mudar o estado.') },
            )
          }
        >
          {paused ? 'Retomar' : 'Pausar'}
        </Button>
      </div>

      {s.session_exercises.map((se) => {
        const prev = se.exercise_id ? previous.data?.get(se.exercise_id) : undefined
        const target = formatTarget(se.target_sets, se.target_reps_min, se.target_reps_max)
        const last = se.exercise_sets.at(-1) ?? prev?.sets.at(-1)
        return (
          <Section key={se.id} title={se.exercise_name}>
            <p className="text-small text-ink-muted tabular-nums">
              {target ? `Meta ${target}` : 'Sem meta'}
              {prev ? `. Última vez: ${prev.sets.map(formatSet).join(', ')}` : ''}
            </p>
            {se.exercise_sets.length > 0 ? (
              <div className="mt-3 grid grid-cols-[2rem_1fr_1fr_2.75rem_2.75rem] gap-2 text-micro text-ink-muted">
                <span className="text-center">Série</span>
                <span className="text-center">kg</span>
                <span className="text-center">Repetições</span>
              </div>
            ) : null}
            <ul>
              {se.exercise_sets.map((set, i) => (
                <SetRow
                  key={set.id}
                  set={set}
                  index={i}
                  readOnly={false}
                  onSave={({ weight_kg, reps, completed }) =>
                    saveSet.mutate(
                      {
                        id: set.id,
                        session_exercise_id: se.id,
                        weight_kg,
                        reps,
                        completed_at: completed ? new Date().toISOString() : null,
                        rest_seconds: completed ? (se.rest_seconds ?? DEFAULT_REST) : null,
                      },
                      {
                        onSuccess: () => {
                          if (completed)
                            setRestEndsAt(Date.now() + (se.rest_seconds ?? DEFAULT_REST) * 1000)
                        },
                        onError: fail('A série não foi salva. Confira a internet e toque de novo.'),
                      },
                    )
                  }
                  onDelete={() =>
                    deleteSet.mutate(set.id, { onError: fail('Não foi possível excluir a série.') })
                  }
                />
              ))}
            </ul>
            <div className="mt-2 flex items-center justify-between">
              <Button
                variant="secondary"
                icon={<Plus aria-hidden className="size-4" />}
                busy={
                  saveSet.isPending &&
                  saveSet.variables?.session_exercise_id === se.id &&
                  !saveSet.variables?.id
                }
                onClick={() =>
                  saveSet.mutate(
                    {
                      session_exercise_id: se.id,
                      position: se.exercise_sets.length,
                      weight_kg: last?.weight_kg ?? null,
                      reps: last?.reps ?? se.target_reps_max ?? se.target_reps_min ?? null,
                    },
                    { onError: fail('Não foi possível adicionar a série.') },
                  )
                }
              >
                Adicionar série
              </Button>
              {se.exercise_sets.length === 0 ? (
                <Button
                  variant="quiet"
                  className="-mr-4"
                  icon={<Trash2 aria-hidden className="size-4" />}
                  onClick={() =>
                    removeEx.mutate(se.id, { onError: fail('Não foi possível remover.') })
                  }
                >
                  Remover
                </Button>
              ) : null}
            </div>
          </Section>
        )
      })}

      <div className="border-t border-line pt-5">
        <Button
          variant="secondary"
          icon={<Plus aria-hidden className="size-4" />}
          onClick={() => setPicking(true)}
        >
          Adicionar exercício
        </Button>
        <div className="mt-6">
          <TextAreaField
            label="Observações"
            value={notes}
            maxLength={2000}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() =>
              notes !== (s.notes ?? '') && setStatus.mutate({ id: s.id, notes: notes || null })
            }
            placeholder="Como foi o treino, ajustes de carga, sensação"
          />
        </div>
        {error ? (
          <p role="alert" className="mt-3 text-small text-danger">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col gap-3">
          <Button onClick={() => setConfirm('finalizar')}>Finalizar treino</Button>
          <Button variant="danger" onClick={() => setConfirm('cancelar')}>
            Cancelar treino
          </Button>
        </div>
      </div>

      <Sheet open={picking} title="Adicionar exercício" onClose={() => setPicking(false)}>
        {picking ? (
          <ExercisePicker
            onPick={(ex) =>
              addEx.mutate(
                { sessionId: s.id, exercise: ex, position: s.session_exercises.length },
                {
                  onSuccess: () => setPicking(false),
                  onError: fail('Não foi possível adicionar.'),
                },
              )
            }
          />
        ) : null}
      </Sheet>

      <Sheet
        open={confirm !== null}
        title={confirm === 'finalizar' ? 'Finalizar treino?' : 'Cancelar treino?'}
        onClose={() => setConfirm(null)}
      >
        {confirm === 'finalizar' ? (
          <div className="space-y-4">
            <p className="text-ink-muted">
              {completed === 0
                ? 'Nenhuma série foi concluída. A sessão será salva sem séries.'
                : `${completed} ${completed === 1 ? 'série concluída' : 'séries concluídas'}. Séries não concluídas não entram nos recordes. Depois de finalizada, a sessão não pode ser editada.`}
            </p>
            <Button
              className="w-full"
              busy={finish.isPending}
              onClick={() =>
                finish.mutate(s.id, {
                  onSuccess: (r) => {
                    setConfirm(null)
                    setRecords(r)
                  },
                  onError: fail('Não foi possível finalizar. Confira a internet e tente de novo.'),
                })
              }
            >
              Finalizar treino
            </Button>
          </div>
        ) : confirm === 'cancelar' ? (
          <div className="space-y-4">
            <p className="text-ink-muted">
              A sessão fica marcada como cancelada e não conta no histórico nem nos recordes.
            </p>
            <Button
              variant="danger"
              className="w-full"
              busy={setStatus.isPending}
              onClick={() =>
                setStatus.mutate(
                  { id: s.id, status: 'cancelada' },
                  {
                    onSuccess: () => navigate('/treino'),
                    onError: fail('Não foi possível cancelar.'),
                  },
                )
              }
            >
              Cancelar treino
            </Button>
          </div>
        ) : null}
      </Sheet>

      <Sheet open={records !== null} title="Treino salvo" onClose={() => navigate('/treino')}>
        {records ? (
          <div className="space-y-4">
            {records.length === 0 ? (
              <p className="text-ink-muted">
                Sessão registrada no histórico. Nenhum recorde novo desta vez.
              </p>
            ) : (
              <>
                <p className="flex items-center gap-2 font-semibold">
                  <Trophy aria-hidden className="size-5 text-signal" />
                  {records.length} {records.length === 1 ? 'recorde novo' : 'recordes novos'}
                </p>
                <ul className="divide-y divide-line">
                  {records.map((r) => (
                    <li key={r.id} className="py-2">
                      <p>{r.exercise_name}</p>
                      <p className="text-small text-ink-muted tabular-nums">
                        {CRITERION_LABEL[r.criterion]}: {fmt(r.value)} kg
                        {r.criterion === 'e1rm' ? ' (estimado)' : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <Button className="w-full" onClick={() => navigate('/treino')}>
              Voltar ao treino
            </Button>
          </div>
        ) : null}
      </Sheet>
    </div>
  )
}

function SessaoResumo({ s }: { s: SessionFull }) {
  const navigate = useNavigate()
  const records = useRecords()
  const del = useDeleteSession()
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sets = s.session_exercises.flatMap((e) => e.exercise_sets)
  const setIds = new Set(sets.map((x) => x.id))
  const prs = (records.data ?? []).filter((r) => r.set_id && setIds.has(r.set_id))

  return (
    <div>
      <div className="pb-6">
        <p className="type-section">{s.title}</p>
        <p className="text-small text-ink-muted tabular-nums">
          {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(new Date(s.started_at))}
        </p>
        <p className="text-small text-ink-muted tabular-nums">
          {s.status === 'cancelada'
            ? 'Cancelada'
            : `${formatDuration(s.started_at, s.finished_at)}, ${fmt(volume(sets), 0)} kg de volume`}
        </p>
      </div>
      {prs.length ? (
        <Section title="Recordes nesta sessão">
          <ul className="mt-2 space-y-1">
            {prs.map((r) => (
              <li key={r.id} className="text-ink-muted">
                <span className="text-ink">{r.exercise_name}</span>:{' '}
                {CRITERION_LABEL[r.criterion]?.toLowerCase()}, {fmt(r.value)} kg
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
      {s.session_exercises.map((se) => (
        <Section key={se.id} title={se.exercise_name}>
          {se.exercise_sets.filter((x) => x.completed_at).length === 0 ? (
            <p className="text-small text-ink-muted">Nenhuma série concluída.</p>
          ) : (
            <ol className="mt-2 space-y-1 tabular-nums">
              {se.exercise_sets
                .filter((x) => x.completed_at)
                .map((x, i) => (
                  <li key={x.id} className="flex gap-4">
                    <span className="w-6 text-ink-muted">{i + 1}</span>
                    <span>{formatSet(x)}</span>
                  </li>
                ))}
            </ol>
          )}
        </Section>
      ))}
      {s.notes ? (
        <Section title="Observações">
          <p className="mt-2 max-w-prose whitespace-pre-wrap text-ink-muted">{s.notes}</p>
        </Section>
      ) : null}
      <div className="border-t border-line pt-5">
        <Button variant="danger" onClick={() => setConfirm(true)}>
          Excluir sessão
        </Button>
        {error ? (
          <p role="alert" className="mt-3 text-small text-danger">
            {error}
          </p>
        ) : null}
      </div>
      <Sheet open={confirm} title="Excluir sessão?" onClose={() => setConfirm(false)}>
        <div className="space-y-4">
          <p className="text-ink-muted">
            A sessão e suas séries serão apagadas. Recordes registrados nela continuam, sem o
            vínculo com a série.
          </p>
          <Button
            variant="danger"
            className="w-full"
            busy={del.isPending}
            onClick={() =>
              del.mutate(s.id, {
                onSuccess: () => navigate('/treino'),
                onError: () => setError('Não foi possível excluir agora.'),
              })
            }
          >
            Excluir sessão
          </Button>
        </div>
      </Sheet>
    </div>
  )
}
