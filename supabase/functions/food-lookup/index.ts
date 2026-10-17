// Busca um produto pelo código de barras: primeiro no cache do banco, depois no Open Food Facts.
// Dados do Open Food Facts: licença ODbL (atribuição e compartilhamento pela mesma licença).
import { adminClient, corsHeaders, json, requireUser } from '../_shared/http.ts'

const USER_AGENT = 'Bruceapp/0.1 (app pessoal; https://github.com/PedroMarquiole/bruceapp)'
const FIELDS = 'code,product_name,product_name_pt,brands,nutriments,serving_quantity,serving_size'

type Nutriments = Record<string, number | string | undefined>

function num(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : typeof v === 'number' ? v : NaN
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)

  const { client, user } = await requireUser(req)
  if (!user) return json({ error: 'Não autenticado' }, 401)

  let barcode = ''
  try {
    const body = await req.json()
    barcode = String(body?.barcode ?? '').trim()
  } catch {
    return json({ error: 'Corpo inválido' }, 400)
  }
  if (!/^[0-9]{6,14}$/.test(barcode)) return json({ error: 'Código de barras inválido' }, 400)

  // 1. Cache: alimento próprio ou global com esse código.
  const cached = await client
    .from('foods')
    .select('*')
    .eq('barcode', barcode)
    .order('user_id', { nullsFirst: false })
    .limit(1)
    .maybeSingle()
  if (cached.data) return json({ found: true, food: cached.data, cached: true })

  // 2. Open Food Facts.
  let product: Record<string, unknown> | null = null
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=${FIELDS}`,
      { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(8000) },
    )
    if (res.ok) {
      const body = await res.json()
      if (body?.status === 1 && body.product) product = body.product
    } else if (res.status !== 404) {
      return json({ error: 'Open Food Facts indisponível agora' }, 502)
    }
  } catch {
    return json({ error: 'Open Food Facts indisponível agora' }, 502)
  }
  if (!product) return json({ found: false })

  const n = (product.nutriments ?? {}) as Nutriments
  const kcal =
    num(n['energy-kcal_100g']) ??
    (num(n['energy_100g']) !== null ? Math.round((num(n['energy_100g'])! / 4.184) * 10) / 10 : null)
  const food = {
    user_id: null,
    source: 'open_food_facts',
    external_id: String(product.code ?? barcode).slice(0, 64),
    barcode,
    name: String(product.product_name_pt || product.product_name || `Produto ${barcode}`).slice(
      0,
      120,
    ),
    brand: product.brands ? String(product.brands).split(',')[0]!.trim().slice(0, 80) : null,
    kcal_100g: kcal,
    protein_100g: num(n['proteins_100g']),
    carbs_100g: num(n['carbohydrates_100g']),
    fat_100g: num(n['fat_100g']),
    fiber_100g: num(n['fiber_100g']),
    serving_g:
      num(product.serving_quantity) && num(product.serving_quantity)! > 0
        ? num(product.serving_quantity)
        : null,
    serving_name: product.serving_size ? String(product.serving_size).slice(0, 40) : null,
    is_incomplete: false,
    attribution: 'Open Food Facts (ODbL)',
  }
  food.is_incomplete = [food.kcal_100g, food.protein_100g, food.carbs_100g, food.fat_100g].some(
    (v) => v === null,
  )

  // Guarda no catálogo global (somente leitura para o app) para não consultar de novo.
  const saved = await adminClient().from('foods').insert(food).select('*').single()
  if (saved.error) return json({ found: true, food: { ...food, id: null }, cached: false })
  return json({ found: true, food: saved.data, cached: false })
})
