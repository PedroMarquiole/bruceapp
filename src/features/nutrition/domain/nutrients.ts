/** Cálculos nutricionais puros. Valores por 100 g no alimento; cópia por quantidade no diário. */

export type Per100 = {
  kcal_100g: number | null
  protein_100g: number | null
  carbs_100g: number | null
  fat_100g: number | null
  fiber_100g: number | null
}

export type Snapshot = {
  kcal: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  fiber_g: number | null
}

const round1 = (n: number) => Math.round(n * 10) / 10

function scale(per100: number | null, grams: number): number | null {
  if (per100 === null || !Number.isFinite(per100)) return null
  return round1((per100 * grams) / 100)
}

/** Valores para uma quantidade em gramas, arredondados a 0,1. Nulo continua nulo (dado ausente). */
export function scaleNutrients(food: Per100, grams: number): Snapshot {
  if (!(grams > 0)) throw new RangeError('Quantidade deve ser maior que zero')
  return {
    kcal: scale(food.kcal_100g, grams),
    protein_g: scale(food.protein_100g, grams),
    carbs_g: scale(food.carbs_100g, grams),
    fat_g: scale(food.fat_100g, grams),
    fiber_g: scale(food.fiber_100g, grams),
  }
}

/** Converte porções em gramas. */
export function gramsFromServings(servings: number, servingGrams: number): number {
  if (!(servings > 0) || !(servingGrams > 0)) throw new RangeError('Porção inválida')
  return round1(servings * servingGrams)
}

export type Totals = Snapshot & { entries: number; incomplete: number }

/** Soma as entradas do dia. Entradas com algum valor ausente contam em `incomplete`. */
export function sumEntries(entries: readonly Snapshot[]): Totals {
  const keys = ['kcal', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g'] as const
  const acc = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 }
  let incomplete = 0
  for (const e of entries) {
    let missing = false
    for (const k of keys) {
      const v = e[k]
      if (v === null) missing = true
      else acc[k] += v
    }
    if (missing) incomplete += 1
  }
  return {
    kcal: round1(acc.kcal),
    protein_g: round1(acc.protein_g),
    carbs_g: round1(acc.carbs_g),
    fat_g: round1(acc.fat_g),
    fiber_g: round1(acc.fiber_g),
    entries: entries.length,
    incomplete,
  }
}

/** Formata número em pt-BR sem casas desnecessárias: 12,5 · 100. */
export function fmt(n: number | null, digits = 1): string {
  if (n === null) return '—'
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: digits }).format(n)
}
