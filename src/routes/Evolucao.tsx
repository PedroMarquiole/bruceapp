import { useMemo, useState } from 'react'
import { Camera, Plus, Scale, Trash2, Trophy } from 'lucide-react'
import { Screen, Section } from '../ui/Screen'
import { Button } from '../ui/Button'
import { EmptyState, ErrorState } from '../ui/States'
import { QueryState } from '../ui/QueryState'
import { Sheet } from '../ui/Sheet'
import { Segmented, TextField } from '../ui/Form'
import { Consistency } from '../ui/Consistency'
import { localDayKey, parseDayKey, shortDate } from '../lib/date'
import { useNow } from '../lib/useNow'
import type { MeasurementKind, PersonalRecord } from '../lib/db'
import { WeightChart } from '../features/progress/WeightChart'
import { change, inPeriod, type Period } from '../features/progress/domain/trend'
import {
  compressPhoto,
  MEASUREMENTS,
  useAddMeasurement,
  useDeleteMeasurement,
  useDeletePhoto,
  useMeasurements,
  usePhotos,
  useUploadPhoto,
  type ProgressPhoto,
} from '../features/progress/queries'
import { useRecords, useSessionHistory } from '../features/workouts/queries'
import { CRITERION_LABEL } from '../features/workouts/domain/sets'
import { useHabitLogs, useHabits } from '../features/habits/queries'
import { isDone, isScheduled } from '../features/habits/domain/streak'
import { fmt } from '../features/nutrition/domain/nutrients'

const PERIODS = [
  { value: '4s', label: '4 semanas' },
  { value: '3m', label: '3 meses' },
  { value: '1a', label: '1 ano' },
  { value: 'tudo', label: 'Tudo' },
] as const

const ANGLES = [
  { value: 'frente', label: 'Frente' },
  { value: 'lado', label: 'Lado' },
  { value: 'costas', label: 'Costas' },
  { value: 'outro', label: 'Outro' },
] as const

export function Evolucao() {
  const now = useNow()
  const today = localDayKey(now)
  const measurements = useMeasurements()
  const add = useAddMeasurement()
  const del = useDeleteMeasurement()
  const records = useRecords()
  const history = useSessionHistory(200)
  const habits = useHabits()
  const from84 = localDayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90))
  const logs = useHabitLogs(from84, today)
  const photos = usePhotos()
  const upload = useUploadPhoto()
  const delPhoto = useDeletePhoto()

  const [period, setPeriod] = useState<Period>('3m')
  const [kind, setKind] = useState<MeasurementKind>('peso')
  const [adding, setAdding] = useState(false)
  const [newKind, setNewKind] = useState<MeasurementKind>('peso')
  const [value, setValue] = useState('')
  const [date, setDate] = useState(today)
  const [error, setError] = useState<string | null>(null)
  const [photoAngle, setPhotoAngle] = useState<ProgressPhoto['angle']>('frente')
  const [viewing, setViewing] = useState<ProgressPhoto | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)

  const meta = MEASUREMENTS.find((m) => m.value === kind) ?? MEASUREMENTS[0]
  const series = useMemo(
    () =>
      inPeriod(
        (measurements.data ?? [])
          .filter((m) => m.kind === kind)
          .map((m) => ({ day: m.measured_on, value: Number(m.value) })),
        period,
        now,
      ),
    [measurements.data, kind, period, now],
  )
  const delta = change(series)

  // Dias ativos: treino finalizado ou todos os hábitos programados cumpridos.
  const active = useMemo(() => {
    const set = new Set<string>()
    for (const s of history.data ?? []) set.add(localDayKey(new Date(s.started_at)))
    const hs = habits.data ?? []
    const byDay = new Map<string, Map<string, number>>()
    for (const l of logs.data ?? []) {
      const m = byDay.get(l.day) ?? new Map<string, number>()
      m.set(l.habit_id, l.count)
      byDay.set(l.day, m)
    }
    for (const [day, m] of byDay) {
      const d = parseDayKey(day)
      const scheduled = hs.filter((h) => isScheduled(h, d))
      if (scheduled.length && scheduled.every((h) => isDone(h, { day, count: m.get(h.id) ?? 0 })))
        set.add(day)
    }
    return set
  }, [history.data, habits.data, logs.data])

  // Melhor recorde por exercício e critério.
  const bests = useMemo(() => {
    const map = new Map<string, PersonalRecord>()
    for (const r of records.data ?? []) {
      const k = `${r.exercise_id ?? r.exercise_name}|${r.criterion}`
      const cur = map.get(k)
      if (!cur || r.value > cur.value) map.set(k, r)
    }
    const byEx = new Map<string, Array<PersonalRecord>>()
    for (const r of map.values()) {
      const list = byEx.get(r.exercise_name) ?? []
      list.push(r)
      byEx.set(r.exercise_name, list)
    }
    return [...byEx.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [records.data])

  function submitMeasurement() {
    const v = Number(value.replace(',', '.'))
    const m = MEASUREMENTS.find((x) => x.value === newKind)
    if (!m) return
    const max = m.unit === '%' ? 70 : m.unit === 'kg' ? 400 : 250
    if (!(v > 0 && v <= max)) return setError(`Informe um valor entre 0 e ${max} ${m.unit}.`)
    if (!date || date > today) return setError('A data não pode estar no futuro.')
    add.mutate(
      { kind: newKind, value: v, unit: m.unit, measured_on: date },
      {
        onSuccess: () => {
          setAdding(false)
          setValue('')
          setKind(newKind)
        },
        onError: () => setError('Não foi possível salvar. Confira a internet e tente de novo.'),
      },
    )
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return
    setPhotoError(null)
    try {
      const blob = await compressPhoto(file)
      await upload.mutateAsync({ blob, takenOn: today, angle: photoAngle })
    } catch {
      setPhotoError('Não foi possível enviar a foto. Confira a internet e tente de novo.')
    }
  }

  const kindHas = new Set((measurements.data ?? []).map((m) => m.kind))
  const kindOptions = MEASUREMENTS.filter((m) => m.value === 'peso' || kindHas.has(m.value))

  return (
    <Screen title="Evolução">
      <Section
        title={meta?.label ?? 'Peso'}
        aside={
          <Button
            variant="quiet"
            className="-mr-4"
            icon={<Plus aria-hidden className="size-4" />}
            onClick={() => {
              setNewKind(kind)
              setDate(today)
              setError(null)
              setAdding(true)
            }}
          >
            Registrar
          </Button>
        }
      >
        {kindOptions.length > 1 ? (
          <div className="mt-3">
            <Segmented label="Medida" options={kindOptions} value={kind} onChange={setKind} />
          </div>
        ) : null}
        <div className="mt-3">
          <Segmented label="Período" options={PERIODS} value={period} onChange={setPeriod} />
        </div>
        <QueryState
          query={measurements}
          loadingLabel="Carregando medidas"
          errorTitle="Não foi possível carregar as medidas"
        >
          {() =>
            series.length === 0 ? (
              <EmptyState icon={<Scale className="size-5" />} title="Sem registros neste período">
                Registre {meta?.label.toLowerCase() ?? 'o peso'} de vez em quando, de preferência no
                mesmo horário. A linha amarela mostra a média de 7 dias, que oscila menos que o
                registro do dia.
              </EmptyState>
            ) : (
              <>
                <WeightChart points={series} unit={meta?.unit ?? 'kg'} />
                {delta !== null ? (
                  <p className="mt-2 text-small text-ink-muted tabular-nums">
                    Variação no período: {delta > 0 ? '+' : ''}
                    {fmt(delta)} {meta?.unit}, em {series.length} registros.
                  </p>
                ) : null}
                <details className="mt-3">
                  <summary className="cursor-pointer text-small text-ink-muted">
                    Ver e apagar registros
                  </summary>
                  <ul className="mt-2 divide-y divide-line">
                    {[...series].reverse().map((p) => {
                      const row = (measurements.data ?? []).find(
                        (m) =>
                          m.kind === kind && m.measured_on === p.day && Number(m.value) === p.value,
                      )
                      return (
                        <li
                          key={row?.id ?? p.day}
                          className="flex min-h-11 items-center justify-between tabular-nums"
                        >
                          <span>
                            {shortDate(parseDayKey(p.day))}: {fmt(p.value)} {meta?.unit}
                          </span>
                          {row ? (
                            <button
                              type="button"
                              aria-label={`Apagar registro de ${p.day}`}
                              onClick={() => del.mutate(row.id)}
                              className="grid size-11 place-items-center rounded-full text-ink-muted hover:text-danger"
                            >
                              <Trash2 aria-hidden className="size-4" />
                            </button>
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>
                </details>
              </>
            )
          }
        </QueryState>
      </Section>

      <Section title="Consistência">
        <Consistency today={now} active={active} />
      </Section>

      <Section title="Recordes">
        <QueryState
          query={records}
          loadingLabel="Carregando recordes"
          errorTitle="Não foi possível carregar os recordes"
        >
          {() =>
            bests.length === 0 ? (
              <EmptyState icon={<Trophy className="size-5" />} title="Nenhum recorde ainda">
                Recordes são calculados ao finalizar um treino, só com séries concluídas: maior
                carga para 1, 3, 5 e 10 repetições e o 1RM estimado.
              </EmptyState>
            ) : (
              <ul className="mt-2 divide-y divide-line">
                {bests.map(([name, list]) => (
                  <li key={name} className="py-3">
                    <p className="font-medium">{name}</p>
                    <ul className="mt-1 space-y-0.5 text-small text-ink-muted tabular-nums">
                      {list
                        .sort((a, b) => a.criterion.localeCompare(b.criterion))
                        .map((r) => (
                          <li key={r.id}>
                            {CRITERION_LABEL[r.criterion]}:{' '}
                            <span className="text-ink">{fmt(r.value)} kg</span>
                            {r.criterion === 'e1rm' ? ' (estimado)' : ''},{' '}
                            {shortDate(parseDayKey(r.achieved_on))}
                          </li>
                        ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )
          }
        </QueryState>
      </Section>

      <Section title="Fotos">
        <p className="mt-2 text-small text-ink-muted">
          Guardadas em pasta privada, visíveis só para você. Não são enviadas para a IA.
        </p>
        <div className="mt-3">
          <Segmented
            label="Ângulo da próxima foto"
            options={ANGLES}
            value={photoAngle}
            onChange={setPhotoAngle}
          />
        </div>
        <label className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border border-line bg-graphite px-4 font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-signal">
          <Camera aria-hidden className="size-4" />
          {upload.isPending ? 'Enviando…' : 'Adicionar foto'}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={upload.isPending}
            onChange={(e) => {
              void onPhoto(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </label>
        {photoError ? (
          <p role="alert" className="mt-2 text-small text-danger">
            {photoError}
          </p>
        ) : null}
        {photos.isError ? (
          <ErrorState
            title="Não foi possível carregar as fotos"
            onRetry={() => void photos.refetch()}
          >
            Confira a internet e tente de novo.
          </ErrorState>
        ) : null}
        {photos.data?.length ? (
          <ul className="mt-4 grid grid-cols-3 gap-2">
            {photos.data.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setViewing(p)}
                  className="block aspect-[3/4] w-full overflow-hidden rounded-[var(--radius-control)] border border-line bg-graphite"
                  aria-label={`Foto de ${p.taken_on}, ${p.angle}`}
                >
                  {p.url ? (
                    <img src={p.url} alt="" loading="lazy" className="size-full object-cover" />
                  ) : null}
                </button>
                <p className="mt-1 text-micro text-ink-muted tabular-nums">
                  {shortDate(parseDayKey(p.taken_on))}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </Section>

      <Sheet open={adding} title="Registrar medida" onClose={() => setAdding(false)}>
        <form
          noValidate
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault()
            submitMeasurement()
          }}
        >
          <Segmented label="Medida" options={MEASUREMENTS} value={newKind} onChange={setNewKind} />
          <TextField
            label={`Valor (${MEASUREMENTS.find((m) => m.value === newKind)?.unit ?? ''})`}
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            error={error}
          />
          <TextField
            label="Data"
            type="date"
            max={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Button type="submit" busy={add.isPending} className="w-full">
            Salvar medida
          </Button>
        </form>
      </Sheet>

      <Sheet
        open={viewing !== null}
        title={viewing ? `Foto de ${shortDate(parseDayKey(viewing.taken_on))}` : ''}
        onClose={() => setViewing(null)}
      >
        {viewing ? (
          <div className="space-y-4">
            {viewing.url ? (
              <img
                src={viewing.url}
                alt={`Foto de progresso, ${viewing.angle}`}
                className="w-full rounded-[var(--radius-control)]"
              />
            ) : null}
            <Button
              variant="danger"
              className="w-full"
              busy={delPhoto.isPending}
              onClick={() => delPhoto.mutate(viewing, { onSuccess: () => setViewing(null) })}
            >
              Apagar foto
            </Button>
          </div>
        ) : null}
      </Sheet>
    </Screen>
  )
}
