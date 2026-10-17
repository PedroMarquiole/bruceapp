import { useState } from 'react'
import { CalendarCheck2, Plus } from 'lucide-react'
import { Screen, Section } from '../ui/Screen'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/States'
import { QueryState } from '../ui/QueryState'
import { Sheet } from '../ui/Sheet'
import { HabitForm } from '../features/habits/HabitForm'
import { useArchiveHabit, useHabitLogs, useHabits, useSaveHabit } from '../features/habits/queries'
import { adherence, currentStreak } from '../features/habits/domain/streak'
import { localDayKey } from '../lib/date'
import type { Habit } from '../lib/db'

const DAY_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

function describeDays(days: number[]): string {
  if (days.length === 7) return 'Todos os dias'
  if (days.join() === '1,2,3,4,5') return 'Dias úteis'
  return days.map((d) => DAY_SHORT[d - 1]).join(', ')
}

export function Habitos() {
  const today = new Date()
  const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 120)
  const habits = useHabits()
  const logs = useHabitLogs(localDayKey(from), localDayKey(today))
  const save = useSaveHabit()
  const archive = useArchiveHabit()
  const [editing, setEditing] = useState<Habit | 'novo' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const last30 = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29)

  return (
    <Screen title="Hábitos" backTo="/">
      <div className="pb-4">
        <Button icon={<Plus aria-hidden className="size-4" />} onClick={() => setEditing('novo')}>
          Novo hábito
        </Button>
      </div>
      <Section title="Seus hábitos">
        <QueryState
          query={habits}
          loadingLabel="Carregando hábitos"
          errorTitle="Não foi possível carregar os hábitos"
        >
          {(list) =>
            list.length === 0 ? (
              <EmptyState icon={<CalendarCheck2 className="size-5" />} title="Nenhum hábito ainda">
                Crie o primeiro hábito e marque-o na tela Hoje. Dias fora da programação não quebram
                a sequência.
              </EmptyState>
            ) : (
              <ul className="mt-2 divide-y divide-line">
                {list.map((h) => {
                  const hl = (logs.data ?? []).filter((l) => l.habit_id === h.id)
                  const streak = currentStreak(h, hl, today)
                  const adh = adherence(h, hl, last30, today)
                  return (
                    <li key={h.id} className="flex items-center gap-4 py-3.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{h.name}</p>
                        <p className="text-small text-ink-muted">
                          {describeDays(h.days_of_week)}
                          {h.target_per_day > 1 ? `, ${h.target_per_day} vezes` : ''}
                          {h.reminder_time ? `, lembrete ${h.reminder_time.slice(0, 5)}` : ''}
                        </p>
                        <p className="text-small text-ink-muted tabular-nums">
                          Sequência: {streak} {streak === 1 ? 'dia' : 'dias'}
                          {adh.scheduled > 0
                            ? `. Últimos 30 dias: ${adh.done} de ${adh.scheduled}`
                            : ''}
                        </p>
                      </div>
                      <Button variant="secondary" onClick={() => setEditing(h)}>
                        Editar
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )
          }
        </QueryState>
      </Section>

      <Sheet
        open={editing !== null}
        title={editing === 'novo' ? 'Novo hábito' : 'Editar hábito'}
        onClose={() => {
          setEditing(null)
          setError(null)
        }}
      >
        {editing !== null ? (
          <>
            <HabitForm
              {...(editing !== 'novo' ? { initial: editing } : {})}
              busy={save.isPending}
              submitLabel={editing === 'novo' ? 'Criar hábito' : 'Salvar hábito'}
              onSubmit={(v) =>
                save.mutate(editing === 'novo' ? v : { ...v, id: editing.id }, {
                  onSuccess: () => setEditing(null),
                  onError: () =>
                    setError('Não foi possível salvar. Confira a internet e tente de novo.'),
                })
              }
            />
            {error ? (
              <p role="alert" className="mt-3 text-small text-danger">
                {error}
              </p>
            ) : null}
            {editing !== 'novo' ? (
              <Button
                variant="danger"
                className="mt-4 w-full"
                busy={archive.isPending}
                onClick={() =>
                  archive.mutate(editing.id, {
                    onSuccess: () => setEditing(null),
                    onError: () => setError('Não foi possível arquivar agora.'),
                  })
                }
              >
                Arquivar hábito
              </Button>
            ) : null}
          </>
        ) : null}
      </Sheet>
    </Screen>
  )
}
