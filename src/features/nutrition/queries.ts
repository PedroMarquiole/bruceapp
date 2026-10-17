import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  db,
  unwrap,
  type DiaryEntry,
  type Food,
  type Meal,
  type NutritionTarget,
} from '../../lib/db'
import { scaleNutrients } from './domain/nutrients'

export const MEALS: ReadonlyArray<{ value: Meal; label: string }> = [
  { value: 'cafe', label: 'Café da manhã' },
  { value: 'almoco', label: 'Almoço' },
  { value: 'lanche', label: 'Lanche' },
  { value: 'jantar', label: 'Jantar' },
  { value: 'outro', label: 'Outro' },
]

/** Sugere a refeição pelo horário local. */
export function mealForHour(hour: number): Meal {
  if (hour < 10) return 'cafe'
  if (hour < 15) return 'almoco'
  if (hour < 18) return 'lanche'
  if (hour < 23) return 'jantar'
  return 'outro'
}

// Alimentos -------------------------------------------------------------------------------------

export function useFoodSearch(term: string) {
  const q = term.trim()
  return useQuery({
    queryKey: ['foods', 'search', q],
    queryFn: async () => {
      let req = db().from('foods').select('*').order('name').limit(40)
      if (q) req = req.ilike('name', `%${q.replace(/[%_]/g, '')}%`)
      return unwrap<Food[]>(await req)
    },
  })
}

/** Alimentos usados recentemente (pelo diário), sem repetição. */
export function useRecentFoods() {
  return useQuery({
    queryKey: ['foods', 'recent'],
    queryFn: async () => {
      const rows = unwrap<Array<{ food_id: string | null; foods: Food | null }>>(
        await db()
          .from('food_diary_entries')
          .select('food_id, foods(*)')
          .not('food_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(60),
      )
      const seen = new Set<string>()
      const out: Food[] = []
      for (const r of rows) {
        if (r.foods && !seen.has(r.foods.id)) {
          seen.add(r.foods.id)
          out.push(r.foods)
        }
      }
      return out.slice(0, 12)
    },
  })
}

export type FoodInput = Omit<Food, 'id' | 'user_id' | 'external_id' | 'attribution' | 'source'> & {
  source?: Food['source']
}

export function useSaveFood() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...f }: FoodInput & { id?: string }) => {
      const row = { source: 'usuario' as const, ...f }
      const q = id ? db().from('foods').update(row).eq('id', id) : db().from('foods').insert(row)
      return unwrap<Food>(await q.select('*').single())
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['foods'] }),
  })
}

export function useDeleteFood() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap(await db().from('foods').delete().eq('id', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['foods'] }),
  })
}

export type BarcodeResult = { found: false } | { found: true; food: Food; cached: boolean }

export async function lookupBarcode(barcode: string): Promise<BarcodeResult> {
  const { data, error } = await db().functions.invoke('food-lookup', { body: { barcode } })
  if (error) {
    const ctx = (error as { context?: Response }).context
    let message = 'Não foi possível consultar o código agora.'
    try {
      const body = ctx ? await ctx.json() : null
      if (body?.error) message = body.error
    } catch {
      /* mantém a mensagem padrão */
    }
    throw new Error(message)
  }
  return data as BarcodeResult
}

// Diário ----------------------------------------------------------------------------------------

export function useDiary(day: string) {
  return useQuery({
    queryKey: ['diary', day],
    queryFn: async () =>
      unwrap<DiaryEntry[]>(
        await db()
          .from('food_diary_entries')
          .select('*')
          .eq('day', day)
          .order('eaten_at', { ascending: true, nullsFirst: false })
          .order('created_at'),
      ),
  })
}

export function useDiaryRange(from: string, to: string) {
  return useQuery({
    queryKey: ['diary', 'range', from, to],
    queryFn: async () =>
      unwrap<DiaryEntry[]>(
        await db().from('food_diary_entries').select('*').gte('day', from).lte('day', to),
      ),
  })
}

function invalidateDiary(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ['diary'] })
  void qc.invalidateQueries({ queryKey: ['foods', 'recent'] })
  void qc.invalidateQueries({ queryKey: ['points'] })
}

/** Registra um alimento: grava a cópia dos valores para a quantidade (histórico preservado). */
export function useAddEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: {
      food: Food
      grams: number
      day: string
      meal: Meal
      isEstimate?: boolean
      notes?: string | null
    }) =>
      unwrap<DiaryEntry>(
        await db()
          .from('food_diary_entries')
          .insert({
            day: v.day,
            meal: v.meal,
            eaten_at: new Date().toISOString(),
            food_id: v.food.id,
            food_name: v.food.name,
            brand: v.food.brand,
            quantity_g: v.grams,
            ...scaleNutrients(v.food, v.grams),
            is_estimate: v.isEstimate ?? v.food.source === 'ia',
            source: v.food.source,
            notes: v.notes ?? null,
          })
          .select('*')
          .single(),
      ),
    onSuccess: () => invalidateDiary(qc),
  })
}

/** Registro manual (sem alimento cadastrado), ex.: estimativa por foto confirmada. */
export function useAddManualEntries() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (
      rows: Array<Omit<DiaryEntry, 'id' | 'created_at' | 'food_id' | 'eaten_at'>>,
    ) =>
      unwrap(
        await db()
          .from('food_diary_entries')
          .insert(rows.map((r) => ({ ...r, eaten_at: new Date().toISOString() }))),
      ),
    onSuccess: () => invalidateDiary(qc),
  })
}

/** Muda quantidade/refeição. Os nutrientes acompanham proporcionalmente a cópia original. */
export function useUpdateEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      entry,
      grams,
      meal,
    }: {
      entry: DiaryEntry
      grams: number
      meal: Meal
    }) => {
      if (!(grams > 0)) throw new RangeError('Quantidade deve ser maior que zero')
      const ratio = grams / entry.quantity_g
      const scale = (v: number | null) => (v === null ? null : Math.round(v * ratio * 10) / 10)
      return unwrap(
        await db()
          .from('food_diary_entries')
          .update({
            meal,
            quantity_g: grams,
            kcal: scale(entry.kcal),
            protein_g: scale(entry.protein_g),
            carbs_g: scale(entry.carbs_g),
            fat_g: scale(entry.fat_g),
            fiber_g: scale(entry.fiber_g),
          })
          .eq('id', entry.id),
      )
    },
    onSuccess: () => invalidateDiary(qc),
  })
}

export function useDeleteEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) =>
      unwrap(await db().from('food_diary_entries').delete().eq('id', id)),
    onSuccess: () => invalidateDiary(qc),
  })
}

// Metas nutricionais ------------------------------------------------------------------------------

export function useNutritionTarget() {
  return useQuery({
    queryKey: ['nutrition_target'],
    queryFn: async () =>
      unwrap<NutritionTarget | null>(
        await db()
          .from('nutrition_targets')
          .select('*')
          .is('valid_to', null)
          .order('valid_from', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ),
  })
}

/** Nova meta encerra a anterior (histórico de metas preservado). */
export function useSetNutritionTarget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (t: Pick<NutritionTarget, 'kcal' | 'protein_g' | 'carbs_g' | 'fat_g'>) => {
      const today = new Date()
      const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      const { error: closeErr } = await db()
        .from('nutrition_targets')
        .update({ valid_to: key })
        .is('valid_to', null)
      if (closeErr) throw new Error(closeErr.message)
      return unwrap(
        await db()
          .from('nutrition_targets')
          .insert({ ...t, valid_from: key }),
      )
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nutrition_target'] }),
  })
}
