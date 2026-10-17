import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Screen, Section } from '../ui/Screen'
import { Button } from '../ui/Button'
import { QueryState } from '../ui/QueryState'
import { Readouts } from '../ui/Readouts'
import { Sheet } from '../ui/Sheet'
import { Segmented, TextField } from '../ui/Form'
import { dayAndMonth, localDayKey, parseDayKey, shiftDayKey, weekdayTitle } from '../lib/date'
import type { DiaryEntry, Meal } from '../lib/db'
import { AddFood } from '../features/nutrition/AddFood'
import { SOURCE_LABEL } from '../features/nutrition/labels'
import { PhotoEstimate } from '../features/nutrition/PhotoEstimate'
import { fmt, sumEntries } from '../features/nutrition/domain/nutrients'
import {
  MEALS,
  useDeleteEntry,
  useDiary,
  useNutritionTarget,
  useUpdateEntry,
} from '../features/nutrition/queries'
import { useProfile } from '../features/profile/queries'

function dayLabel(key: string): string {
  const today = localDayKey(new Date())
  if (key === today) return 'Hoje'
  if (key === shiftDayKey(today, -1)) return 'Ontem'
  const date = parseDayKey(key)
  return `${weekdayTitle(date)}, ${dayAndMonth(date)}`
}

export function Nutricao() {
  const today = localDayKey(new Date())
  const [day, setDay] = useState(today)
  const diary = useDiary(day)
  const profile = useProfile()
  const target = useNutritionTarget()
  const update = useUpdateEntry()
  const del = useDeleteEntry()
  const [adding, setAdding] = useState<Meal | null>(null)
  const [photo, setPhoto] = useState<Meal | null>(null)
  const [editing, setEditing] = useState<DiaryEntry | null>(null)
  const [editGrams, setEditGrams] = useState('')
  const [editMeal, setEditMeal] = useState<Meal>('cafe')
  const [error, setError] = useState<string | null>(null)
  const track = profile.data?.track_calories ?? false

  return (
    <Screen title="Nutrição">
      <div className="flex items-center justify-between gap-2 pb-4">
        <button
          type="button"
          aria-label="Dia anterior"
          onClick={() => setDay(shiftDayKey(day, -1))}
          className="grid size-11 place-items-center rounded-full text-ink-muted hover:bg-graphite hover:text-ink"
        >
          <ChevronLeft aria-hidden className="size-5" />
        </button>
        <p className="font-semibold" aria-live="polite">
          {dayLabel(day)}
        </p>
        <button
          type="button"
          aria-label="Próximo dia"
          disabled={day >= today}
          onClick={() => setDay(shiftDayKey(day, 1))}
          className="grid size-11 place-items-center rounded-full text-ink-muted hover:bg-graphite hover:text-ink disabled:opacity-30"
        >
          <ChevronRight aria-hidden className="size-5" />
        </button>
      </div>

      <QueryState
        query={diary}
        loadingLabel="Carregando diário"
        errorTitle="Não foi possível carregar o diário"
      >
        {(entries) => {
          const totals = sumEntries(entries)
          const t = target.data
          return (
            <>
              <Readouts
                items={
                  track
                    ? [
                        {
                          label: t?.kcal ? `kcal de ${fmt(t.kcal, 0)}` : 'kcal',
                          value: fmt(totals.kcal, 0),
                        },
                        {
                          label: t?.protein_g
                            ? `Proteína de ${fmt(t.protein_g, 0)} g`
                            : 'Proteína (g)',
                          value: fmt(totals.protein_g, 0),
                        },
                        { label: 'Itens', value: String(totals.entries) },
                      ]
                    : [
                        { label: 'Itens', value: String(totals.entries) },
                        {
                          label: 'Refeições',
                          value: String(new Set(entries.map((e) => e.meal)).size),
                        },
                        {
                          label: 'Estimados',
                          value: String(entries.filter((e) => e.is_estimate).length),
                        },
                      ]
                }
              />
              {track ? (
                <p className="mt-2 text-small text-ink-muted tabular-nums">
                  Carboidratos {fmt(totals.carbs_g, 0)} g, gorduras {fmt(totals.fat_g, 0)} g, fibras{' '}
                  {fmt(totals.fiber_g, 0)} g
                  {totals.incomplete
                    ? `. ${totals.incomplete} ${totals.incomplete === 1 ? 'item com dados incompletos' : 'itens com dados incompletos'}`
                    : ''}
                </p>
              ) : (
                <p className="mt-2 text-small text-ink-muted">
                  Calorias ocultas. Ative o acompanhamento no Perfil se quiser ver os números.
                </p>
              )}

              {MEALS.map((m) => {
                const items = entries.filter((e) => e.meal === m.value)
                const mt = sumEntries(items)
                return (
                  <Section
                    key={m.value}
                    title={m.label}
                    aside={
                      track && items.length ? (
                        <span className="text-small text-ink-muted tabular-nums">
                          {fmt(mt.kcal, 0)} kcal
                        </span>
                      ) : undefined
                    }
                  >
                    <ul className="mt-1 divide-y divide-line">
                      {items.map((e) => (
                        <li key={e.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(e)
                              setEditGrams(String(e.quantity_g).replace('.', ','))
                              setEditMeal(e.meal)
                              setError(null)
                            }}
                            className="flex min-h-14 w-full items-center justify-between gap-3 py-2 text-left hover:text-signal"
                          >
                            <span className="min-w-0">
                              <span className="block truncate">{e.food_name}</span>
                              <span className="block text-small text-ink-muted tabular-nums">
                                {fmt(e.quantity_g)} g{e.is_estimate ? ', estimado' : ''}
                              </span>
                            </span>
                            {track ? (
                              <span className="shrink-0 text-small tabular-nums">
                                {fmt(e.kcal, 0)} kcal
                              </span>
                            ) : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant="quiet"
                      className="-ml-4"
                      icon={<Plus aria-hidden className="size-4" />}
                      onClick={() => setAdding(m.value)}
                    >
                      Adicionar
                    </Button>
                  </Section>
                )
              })}
            </>
          )
        }}
      </QueryState>

      <Sheet open={adding !== null} title="Adicionar alimento" onClose={() => setAdding(null)}>
        {adding ? (
          <AddFood
            day={day}
            initialMeal={adding}
            onDone={() => setAdding(null)}
            onPhoto={() => {
              setPhoto(adding)
              setAdding(null)
            }}
          />
        ) : null}
      </Sheet>

      <Sheet open={photo !== null} title="Estimar por foto" onClose={() => setPhoto(null)}>
        {photo ? <PhotoEstimate day={day} meal={photo} onDone={() => setPhoto(null)} /> : null}
      </Sheet>

      <Sheet
        open={editing !== null}
        title={editing?.food_name ?? ''}
        onClose={() => setEditing(null)}
      >
        {editing ? (
          <form
            noValidate
            className="space-y-5"
            onSubmit={(ev) => {
              ev.preventDefault()
              const g = Number(editGrams.replace(',', '.'))
              if (!(g > 0 && g <= 5000)) return setError('Informe uma quantidade entre 0 e 5000 g.')
              update.mutate(
                { entry: editing, grams: g, meal: editMeal },
                {
                  onSuccess: () => setEditing(null),
                  onError: () => setError('Não foi possível salvar.'),
                },
              )
            }}
          >
            <p className="text-small text-ink-muted">
              Fonte: {SOURCE_LABEL[editing.source]}
              {editing.is_estimate ? '. Valores estimados, não medidos.' : ''}
            </p>
            <TextField
              label="Quantidade (g)"
              inputMode="decimal"
              value={editGrams}
              onChange={(e) => setEditGrams(e.target.value)}
              error={error}
            />
            <Segmented label="Refeição" options={MEALS} value={editMeal} onChange={setEditMeal} />
            <Button type="submit" busy={update.isPending} className="w-full">
              Salvar alteração
            </Button>
            <Button
              variant="danger"
              className="w-full"
              busy={del.isPending}
              onClick={() =>
                del.mutate(editing.id, {
                  onSuccess: () => setEditing(null),
                  onError: () => setError('Não foi possível remover.'),
                })
              }
            >
              Remover do diário
            </Button>
          </form>
        ) : null}
      </Sheet>
    </Screen>
  )
}
