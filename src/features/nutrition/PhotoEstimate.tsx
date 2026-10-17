import { useState } from 'react'
import { Camera, Trash2 } from 'lucide-react'
import { Button } from '../../ui/Button'
import { inputClass } from '../../ui/Form'
import type { Meal } from '../../lib/db'
import { callAssistant, imageToBase64 } from '../assistant/client'
import { fmt } from './domain/nutrients'
import { useAddManualEntries } from './queries'

export type EstimatedItem = {
  name: string
  grams: number
  kcal: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  confidence: 'baixa' | 'media' | 'alta'
}

type Row = EstimatedItem & { base: EstimatedItem; gramsText: string }

function rescale(base: EstimatedItem, grams: number): EstimatedItem {
  const r = base.grams > 0 ? grams / base.grams : 0
  const s = (v: number | null) => (v === null ? null : Math.round(v * r * 10) / 10)
  return {
    ...base,
    grams,
    kcal: s(base.kcal),
    protein_g: s(base.protein_g),
    carbs_g: s(base.carbs_g),
    fat_g: s(base.fat_g),
  }
}

/** Estimativa por foto: a IA sugere itens e porções; nada é salvo sem revisão e confirmação. */
export function PhotoEstimate({
  day,
  meal,
  onDone,
}: {
  day: string
  meal: Meal
  onDone: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[] | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const save = useAddManualEntries()

  async function onFile(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('Escolha uma imagem.')
    setBusy(true)
    setError(null)
    try {
      const image = await imageToBase64(file)
      const r = await callAssistant<{ items: EstimatedItem[]; note?: string }>({
        intent: 'estimativa_foto',
        image,
      })
      setRows(r.items.map((it) => ({ ...it, base: it, gramsText: String(it.grams) })))
      setNote(r.note ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível estimar agora.')
    } finally {
      setBusy(false)
    }
  }

  if (!rows) {
    return (
      <div className="space-y-4">
        <p className="text-ink-muted">
          Tire ou escolha uma foto do prato. A IA sugere os alimentos e as porções; você revisa e
          corrige antes de salvar. É uma estimativa, não uma medição.
        </p>
        <label className="flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-control)] bg-signal font-semibold text-obsidian has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-signal">
          <Camera aria-hidden className="size-5" />
          {busy ? 'Analisando a foto…' : 'Tirar ou escolher foto'}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            disabled={busy}
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
        </label>
        {error ? (
          <p role="alert" className="text-small text-danger">
            {error}
          </p>
        ) : null}
      </div>
    )
  }

  const valid = rows.every((r) => r.grams > 0 && r.grams <= 5000 && r.name.trim())

  return (
    <div className="space-y-4">
      <p className="text-small text-ink-muted">
        Revise cada item. Mudar os gramas recalcula os valores. Tudo fica marcado como estimado no
        diário.
      </p>
      {note ? <p className="text-small text-ink-muted">{note}</p> : null}
      {rows.length === 0 ? (
        <p className="text-ink-muted">Nenhum alimento reconhecido na foto.</p>
      ) : null}
      <ul className="divide-y divide-line">
        {rows.map((r, i) => (
          <li key={i} className="space-y-2 py-3">
            <div className="flex items-center gap-2">
              <input
                aria-label={`Nome do item ${i + 1}`}
                value={r.name}
                onChange={(e) =>
                  setRows(rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                }
                className={`${inputClass} h-11 flex-1`}
              />
              <input
                aria-label={`Gramas do item ${i + 1}`}
                inputMode="decimal"
                value={r.gramsText}
                onChange={(e) => {
                  const g = Number(e.target.value.replace(',', '.'))
                  setRows(
                    rows.map((x, j) =>
                      j === i
                        ? {
                            ...x,
                            ...(g > 0 ? rescale(x.base, g) : { grams: 0 }),
                            gramsText: e.target.value,
                          }
                        : x,
                    ),
                  )
                }}
                className={`${inputClass} h-11 w-20 text-center`}
              />
              <span className="text-small text-ink-muted">g</span>
              <button
                type="button"
                aria-label={`Remover ${r.name}`}
                onClick={() => setRows(rows.filter((_, j) => j !== i))}
                className="grid size-11 place-items-center rounded-full text-ink-muted hover:text-danger"
              >
                <Trash2 aria-hidden className="size-4" />
              </button>
            </div>
            <p className="text-small text-ink-muted tabular-nums">
              {fmt(r.kcal, 0)} kcal, {fmt(r.protein_g)} g proteína, {fmt(r.carbs_g)} g carbo,{' '}
              {fmt(r.fat_g)} g gordura. Confiança {r.confidence}.
            </p>
          </li>
        ))}
      </ul>
      {error ? (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex gap-3">
        <Button
          className="flex-1"
          busy={save.isPending}
          disabled={!valid || rows.length === 0}
          onClick={() =>
            save.mutate(
              rows.map((r) => ({
                day,
                meal,
                food_name: r.name.trim().slice(0, 120),
                brand: null,
                quantity_g: r.grams,
                kcal: r.kcal,
                protein_g: r.protein_g,
                carbs_g: r.carbs_g,
                fat_g: r.fat_g,
                fiber_g: null,
                is_estimate: true,
                source: 'ia' as const,
                notes: `Estimativa por foto (confiança ${r.confidence})`,
              })),
              {
                onSuccess: onDone,
                onError: () => setError('Não foi possível salvar. Tente de novo.'),
              },
            )
          }
        >
          Salvar no diário
        </Button>
        <Button variant="quiet" onClick={() => setRows(null)}>
          Outra foto
        </Button>
      </div>
    </div>
  )
}
