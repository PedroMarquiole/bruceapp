import { Link, Navigate, useNavigate } from 'react-router'
import { ChevronRight, Play, Settings2 } from 'lucide-react'
import { Screen, Section } from '../ui/Screen'
import { Button } from '../ui/Button'
import { DayRule } from '../ui/DayRule'
import { Readouts } from '../ui/Readouts'
import { EmptyState } from '../ui/States'
import { dayAndMonth, localDayKey, weekdayTitle } from '../lib/date'
import { useNow } from '../lib/useNow'
import { useProfile } from '../features/profile/queries'
import { useHabitLogs, useHabits, useSetHabitCount } from '../features/habits/queries'
import { HabitCheck } from '../features/habits/HabitCheck'
import { currentStreak, isoWeekday, isScheduled } from '../features/habits/domain/streak'
import {
  useActiveSession,
  useExercises,
  usePlans,
  useSessionHistory,
  useStartSession,
} from '../features/workouts/queries'
import { formatDuration } from '../features/workouts/domain/sets'
import { useDiary } from '../features/nutrition/queries'
import { fmt, sumEntries } from '../features/nutrition/domain/nutrients'
import { BruceSuggestion } from '../features/assistant/BruceSuggestion'
import { MissionsSummary } from '../features/gamification/MissionsSummary'
import { CalendarCheck2, Dumbbell } from 'lucide-react'

export function Hoje({ now: fixedNow }: { now?: Date }) {
  const liveNow = useNow()
  const now = fixedNow ?? liveNow
  const navigate = useNavigate()
  const today = localDayKey(now)
  const from60 = localDayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 60))

  const profile = useProfile()
  const habits = useHabits()
  const logs = useHabitLogs(from60, today)
  const setCount = useSetHabitCount()
  const plans = usePlans()
  const active = useActiveSession()
  const history = useSessionHistory(10)
  const exercises = useExercises()
  const start = useStartSession()
  const diary = useDiary(today)

  if (profile.data && !profile.data.onboarded_at) return <Navigate to="/boas-vindas" replace />

  const weekday = isoWeekday(now)
  const plannedDay = (plans.data ?? [])
    .flatMap((p) => p.workout_plan_days)
    .find((d) => d.weekday === weekday)
  const trainedToday = (history.data ?? []).some(
    (s) => localDayKey(new Date(s.started_at)) === today,
  )
  const todaysHabits = (habits.data ?? []).filter((h) => isScheduled(h, now))
  const logsToday = new Map(
    (logs.data ?? []).filter((l) => l.day === today).map((l) => [l.habit_id, l.count]),
  )
  const habitsDone = todaysHabits.filter(
    (h) => (logsToday.get(h.id) ?? 0) >= h.target_per_day,
  ).length
  const entries = diary.data ?? []
  const totals = sumEntries(entries)
  const track = profile.data?.track_calories ?? false
  const name = profile.data?.display_name

  return (
    <Screen
      header={
        <div>
          <h1 className="type-monument reveal-monument text-ink">{weekdayTitle(now)}</h1>
          <p className="mt-2 text-lead text-steel">
            {dayAndMonth(now)}
            {name ? `, ${name}` : ''}
          </p>
        </div>
      }
    >
      <DayRule now={now} />

      <div className="mt-6">
        <Readouts
          items={[
            {
              label: 'Treino',
              value: trainedToday
                ? 'Feito'
                : active.data
                  ? 'Em curso'
                  : plannedDay
                    ? plannedDay.name
                    : 'Livre',
            },
            track
              ? { label: 'kcal hoje', value: fmt(totals.kcal, 0) }
              : { label: 'Refeições', value: String(new Set(entries.map((e) => e.meal)).size) },
            { label: 'Hábitos', value: `${habitsDone}/${todaysHabits.length}` },
          ]}
        />
      </div>

      <div className="mt-6">
        <Section title="Treino">
          {active.data ? (
            <Link
              to={`/treino/sessao/${active.data.id}`}
              className="mt-3 flex min-h-16 items-center gap-4 rounded-[var(--radius-control)] bg-signal px-4 text-obsidian"
            >
              <Play aria-hidden className="size-5" />
              <span className="flex-1">
                <span className="block font-semibold">Continuar {active.data.title}</span>
                <span className="block text-small">
                  {formatDuration(active.data.started_at, null, now)} em andamento
                </span>
              </span>
              <ChevronRight aria-hidden className="size-5" />
            </Link>
          ) : trainedToday ? (
            <p className="mt-2 text-ink-muted">
              Treino de hoje registrado. Descanso também faz parte.
            </p>
          ) : plannedDay ? (
            <div className="mt-3 flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{plannedDay.name}</p>
                <p className="text-small text-ink-muted">
                  {plannedDay.workout_plan_exercises.length}{' '}
                  {plannedDay.workout_plan_exercises.length === 1 ? 'exercício' : 'exercícios'}
                </p>
              </div>
              <Button
                icon={<Play aria-hidden className="size-4" />}
                busy={start.isPending}
                disabled={plannedDay.workout_plan_exercises.length === 0}
                onClick={() =>
                  start.mutate(
                    { day: plannedDay, exercises: exercises.data ?? [] },
                    { onSuccess: (s) => navigate(`/treino/sessao/${s.id}`) },
                  )
                }
              >
                Começar treino
              </Button>
            </div>
          ) : (
            <EmptyState
              icon={<Dumbbell className="size-5" />}
              title="Nenhum treino planejado para hoje"
              action={
                <Link to="/treino" className="font-medium text-signal">
                  Ver planos ou começar um treino livre
                </Link>
              }
            >
              Dias de treino aparecem aqui quando o plano tem um dia da semana definido.
            </EmptyState>
          )}
        </Section>

        <Section
          title="Hábitos"
          aside={
            <Link
              to="/habitos"
              className="inline-flex min-h-11 items-center gap-1 text-small text-ink-muted hover:text-ink"
            >
              <Settings2 aria-hidden className="size-4" />
              Gerenciar
            </Link>
          }
        >
          {habits.isSuccess && todaysHabits.length === 0 ? (
            <EmptyState
              icon={<CalendarCheck2 className="size-5" />}
              title={
                habits.data.length
                  ? 'Nenhum hábito programado para hoje'
                  : 'Nenhum hábito configurado'
              }
              action={
                habits.data.length ? undefined : (
                  <Link to="/habitos" className="font-medium text-signal">
                    Criar o primeiro hábito
                  </Link>
                )
              }
            >
              Marque cada hábito ao longo do dia. Dias fora da programação não quebram a sequência.
            </EmptyState>
          ) : (
            <ul className="mt-1 divide-y divide-line">
              {todaysHabits.map((h) => (
                <HabitCheck
                  key={h.id}
                  habit={h}
                  count={logsToday.get(h.id) ?? 0}
                  streak={currentStreak(
                    h,
                    (logs.data ?? []).filter((l) => l.habit_id === h.id),
                    now,
                  )}
                  onChange={(count) => setCount.mutate({ habitId: h.id, day: today, count })}
                />
              ))}
            </ul>
          )}
        </Section>

        <Section
          title="Alimentação"
          aside={
            <Link
              to="/nutricao"
              className="inline-flex min-h-11 items-center text-small text-ink-muted hover:text-ink"
            >
              Abrir diário
            </Link>
          }
        >
          {entries.length === 0 ? (
            <p className="mt-2 text-ink-muted">
              Nada registrado hoje. Registre pelo diário: busca, código de barras ou foto.
            </p>
          ) : (
            <p className="mt-2 text-ink-muted tabular-nums">
              {totals.entries} {totals.entries === 1 ? 'item registrado' : 'itens registrados'}
              {track
                ? `: ${fmt(totals.kcal, 0)} kcal, ${fmt(totals.protein_g, 0)} g de proteína`
                : ''}
              .
            </p>
          )}
        </Section>

        <MissionsSummary now={now} />

        <BruceSuggestion />
      </div>
    </Screen>
  )
}
