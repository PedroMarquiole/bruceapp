import { useState, type FormEvent } from 'react'
import { z } from 'zod'
import { Button } from '../../ui/Button'
import { TextField } from '../../ui/Form'
import type { Food } from '../../lib/db'
import type { FoodInput } from './queries'

const num = (label: string) =>
  z
    .string()
    .transform((v) => v.trim().replace(',', '.'))
    .refine(
      (v) => v === '' || (Number.isFinite(Number(v)) && Number(v) >= 0),
      `${label}: número igual ou maior que zero.`,
    )
    .transform((v) => (v === '' ? null : Math.round(Number(v) * 100) / 100))

const FoodSchema = z.object({
  name: z.string().trim().min(1, 'Dê um nome ao alimento.').max(120),
  brand: z
    .string()
    .trim()
    .max(80)
    .transform((v) => v || null),
  kcal_100g: num('Calorias'),
  protein_100g: num('Proteína'),
  carbs_100g: num('Carboidratos'),
  fat_100g: num('Gorduras'),
  fiber_100g: num('Fibras'),
  serving_name: z
    .string()
    .trim()
    .max(40)
    .transform((v) => v || null),
  serving_g: num('Porção'),
})

type Draft = Record<keyof z.input<typeof FoodSchema>, string>

const fromFood = (f?: Partial<Food>): Draft => ({
  name: f?.name ?? '',
  brand: f?.brand ?? '',
  kcal_100g: f?.kcal_100g?.toString() ?? '',
  protein_100g: f?.protein_100g?.toString() ?? '',
  carbs_100g: f?.carbs_100g?.toString() ?? '',
  fat_100g: f?.fat_100g?.toString() ?? '',
  fiber_100g: f?.fiber_100g?.toString() ?? '',
  serving_name: f?.serving_name ?? '',
  serving_g: f?.serving_g?.toString() ?? '',
})

/** Cadastro de alimento próprio, com valores por 100 g (como no rótulo). */
export function FoodForm({
  initial,
  busy,
  onSubmit,
}: {
  initial?: Partial<Food>
  busy: boolean
  onSubmit: (f: FoodInput) => void
}) {
  const [d, setD] = useState<Draft>(fromFood(initial))
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({})
  const set = (k: keyof Draft) => (e: { target: { value: string } }) =>
    setD({ ...d, [k]: e.target.value })

  function submit(e: FormEvent) {
    e.preventDefault()
    const parsed = FoodSchema.safeParse(d)
    if (!parsed.success) {
      const errs: Partial<Record<keyof Draft, string>> = {}
      for (const i of parsed.error.issues) errs[i.path[0] as keyof Draft] ??= i.message
      return setErrors(errs)
    }
    setErrors({})
    const v = parsed.data
    onSubmit({
      ...v,
      barcode: initial?.barcode ?? null,
      is_incomplete: [v.kcal_100g, v.protein_100g, v.carbs_100g, v.fat_100g].some(
        (x) => x === null,
      ),
    })
  }

  const n = { inputMode: 'decimal' as const }
  return (
    <form noValidate onSubmit={submit} className="space-y-4">
      <TextField
        label="Nome"
        value={d.name}
        onChange={set('name')}
        maxLength={120}
        error={errors.name}
      />
      <TextField label="Marca (opcional)" value={d.brand} onChange={set('brand')} maxLength={80} />
      <p className="text-small text-ink-muted">
        Valores por 100 g, como na tabela nutricional da embalagem.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Calorias (kcal)"
          {...n}
          value={d.kcal_100g}
          onChange={set('kcal_100g')}
          error={errors.kcal_100g}
        />
        <TextField
          label="Proteína (g)"
          {...n}
          value={d.protein_100g}
          onChange={set('protein_100g')}
          error={errors.protein_100g}
        />
        <TextField
          label="Carboidratos (g)"
          {...n}
          value={d.carbs_100g}
          onChange={set('carbs_100g')}
          error={errors.carbs_100g}
        />
        <TextField
          label="Gorduras (g)"
          {...n}
          value={d.fat_100g}
          onChange={set('fat_100g')}
          error={errors.fat_100g}
        />
        <TextField
          label="Fibras (g)"
          {...n}
          value={d.fiber_100g}
          onChange={set('fiber_100g')}
          error={errors.fiber_100g}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Nome da porção"
          value={d.serving_name}
          onChange={set('serving_name')}
          placeholder="Ex.: 1 fatia"
          maxLength={40}
        />
        <TextField
          label="Porção (g)"
          {...n}
          value={d.serving_g}
          onChange={set('serving_g')}
          error={errors.serving_g}
        />
      </div>
      <Button type="submit" busy={busy} className="w-full">
        Salvar alimento
      </Button>
    </form>
  )
}
