/**
 * Backend da versão de teste (build `--mode demo`). Substitui o Supabase por um banco em memória,
 * guardado só neste navegador. Nada sai do aparelho. Imita as regras do banco que o app usa:
 * padrões das colunas, exclusão em cascata, uma sessão em andamento, recordes ao finalizar e pontos.
 */
import { SCHEMA } from './schema'
import { seedTables } from './seed'

type Row = Record<string, unknown>
type Tables = Record<string, Row[]>
type Result = {
  data: unknown
  error: { message: string; code?: string } | null
  count?: number | null
}

const KEY = 'bruce.demo.v1'
const PHOTOS = 'bruce.demo.photos.v1'
export const DEMO_USER = {
  id: '00000000-0000-4000-8000-00000000d3e0',
  email: 'teste@bruceapp.local',
}

// Estado ------------------------------------------------------------------------------------------

function load(): Tables {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as Tables
  } catch {
    /* sem armazenamento: começa do zero */
  }
  return seedTables(DEMO_USER.id)
}

let tables: Tables = load()

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(tables))
  } catch {
    /* sem espaço: segue só em memória */
  }
}

export function resetDemo() {
  tables = seedTables(DEMO_USER.id)
  try {
    localStorage.removeItem(PHOTOS)
  } catch {
    /* ignora */
  }
  recomputePoints()
  save()
}

const rows = (t: string): Row[] => (tables[t] ??= [])
const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function withDefaults(table: string, input: Row): Row {
  const cols = SCHEMA[table] ?? {}
  const out: Row = {}
  for (const [col, def] of Object.entries(cols)) {
    if (input[col] !== undefined) continue
    out[col] =
      def === '$uuid'
        ? crypto.randomUUID()
        : def === '$uid'
          ? DEMO_USER.id
          : def === '$now'
            ? new Date().toISOString()
            : def === '$today'
              ? today()
              : Array.isArray(def)
                ? [...def]
                : def
  }
  return { ...out, ...input }
}

// Relações e regras ---------------------------------------------------------------------------------

/** Nome da coluna que aponta para cada tabela. */
const FK: Record<string, string> = {
  workout_plans: 'plan_id',
  workout_plan_days: 'plan_day_id',
  workout_sessions: 'session_id',
  session_exercises: 'session_exercise_id',
  habits: 'habit_id',
  foods: 'food_id',
  exercises: 'exercise_id',
  ai_conversations: 'conversation_id',
  exercise_sets: 'set_id',
}

/** Exclusão em cascata (filho, coluna) e anulação de referências. */
const CASCADE: Record<string, Array<[string, string]>> = {
  workout_plans: [['workout_plan_days', 'plan_id']],
  workout_plan_days: [['workout_plan_exercises', 'plan_day_id']],
  workout_sessions: [['session_exercises', 'session_id']],
  session_exercises: [['exercise_sets', 'session_exercise_id']],
  habits: [['habit_logs', 'habit_id']],
  ai_conversations: [['ai_messages', 'conversation_id']],
}
const SET_NULL: Record<string, Array<[string, string]>> = {
  workout_plan_days: [['workout_sessions', 'plan_day_id']],
  exercise_sets: [['personal_records', 'set_id']],
  foods: [['food_diary_entries', 'food_id']],
  exercises: [
    ['session_exercises', 'exercise_id'],
    ['personal_records', 'exercise_id'],
  ],
}

function removeRow(table: string, id: unknown) {
  tables[table] = rows(table).filter((r) => r.id !== id)
  for (const [child, col] of CASCADE[table] ?? [])
    for (const r of rows(child).filter((c) => c[col] === id)) removeRow(child, r.id)
  for (const [other, col] of SET_NULL[table] ?? [])
    for (const r of rows(other)) if (r[col] === id) r[col] = null
}

function violation(message: string, code = '23514'): Result {
  return { data: null, error: { message, code } }
}

function checkInsert(table: string, row: Row, all: Row[]): Result | null {
  if (table === 'workout_sessions' && ['ativa', 'pausada'].includes(String(row.status))) {
    if (all.some((s) => s.id !== row.id && ['ativa', 'pausada'].includes(String(s.status))))
      return violation('duplicate key value violates unique constraint', '23505')
  }
  if (
    table === 'push_subscriptions' &&
    all.some((s) => s.endpoint === row.endpoint && s.id !== row.id)
  )
    return violation('duplicate key value violates unique constraint', '23505')
  if (
    table === 'habit_logs' &&
    all.some((l) => l.id !== row.id && l.habit_id === row.habit_id && l.day === row.day)
  )
    return violation('duplicate key value violates unique constraint', '23505')
  return null
}

function sessionOf(table: string, row: Row): Row | undefined {
  if (table === 'session_exercises')
    return rows('workout_sessions').find((s) => s.id === row.session_id)
  if (table === 'exercise_sets') {
    const se = rows('session_exercises').find((x) => x.id === row.session_exercise_id)
    return se && rows('workout_sessions').find((s) => s.id === se.session_id)
  }
  return undefined
}

/** Pontos derivados dos registros, com as mesmas regras dos gatilhos do banco. */
function recomputePoints() {
  const old = new Map(rows('points_ledger').map((r) => [String(r.source_key), r]))
  const next: Row[] = []
  const add = (rule: string, key: string, points: number, day: string) => {
    const prev = old.get(key)
    next.push(prev ?? withDefaults('points_ledger', { rule, source_key: key, points, day }))
  }
  for (const l of rows('habit_logs')) {
    const h = rows('habits').find((x) => x.id === l.habit_id)
    if (h && Number(l.count) >= Number(h.target_per_day ?? 1))
      add('habito', `habito:${l.habit_id}:${l.day}`, 10, String(l.day))
  }
  for (const s of rows('workout_sessions'))
    if (s.status === 'finalizada')
      add('treino', `treino:${s.id}`, 50, String(s.finished_at ?? s.started_at).slice(0, 10))
  for (const d of new Set(rows('food_diary_entries').map((e) => String(e.day))))
    add('diario', `diario:${d}`, 5, d)
  for (const d of new Set(rows('body_measurements').map((m) => String(m.measured_on))))
    add('medida', `medida:${d}`, 5, d)
  for (const r of rows('personal_records'))
    add('recorde', `recorde:${r.id}`, 20, String(r.achieved_on))
  tables.points_ledger = next
}

function finishSession(id: string): Result {
  const s = rows('workout_sessions').find((x) => x.id === id)
  if (!s || !['ativa', 'pausada'].includes(String(s.status)))
    return violation('Sessão não encontrada ou já encerrada', 'P0002')
  s.status = 'finalizada'
  s.finished_at = new Date().toISOString()
  type Cand = {
    set_id: unknown
    exercise_id: unknown
    exercise_name: unknown
    criterion: string
    value: number
  }
  const cands: Cand[] = []
  for (const se of rows('session_exercises').filter((x) => x.session_id === id)) {
    for (const st of rows('exercise_sets').filter((x) => x.session_exercise_id === se.id)) {
      const w = Number(st.weight_kg)
      const reps = Number(st.reps)
      if (!st.completed_at || !(w > 0) || !(reps > 0)) continue
      const base = { set_id: st.id, exercise_id: se.exercise_id, exercise_name: se.exercise_name }
      for (const [criterion, min] of [
        ['carga_1', 1],
        ['carga_3', 3],
        ['carga_5', 5],
        ['carga_10', 10],
      ] as const)
        if (reps >= min) cands.push({ ...base, criterion, value: w })
      if (reps === 1) cands.push({ ...base, criterion: 'e1rm', value: w })
      else if (reps <= 12)
        cands.push({ ...base, criterion: 'e1rm', value: Math.round(w * (1 + reps / 30) * 10) / 10 })
    }
  }
  const best = new Map<string, Cand>()
  for (const c of cands) {
    const k = `${c.exercise_id ?? c.exercise_name}|${c.criterion}`
    const cur = best.get(k)
    if (!cur || cur.value < c.value) best.set(k, c)
  }
  const created: Row[] = []
  for (const c of best.values()) {
    const prev = Math.max(
      0,
      ...rows('personal_records')
        .filter(
          (p) =>
            p.criterion === c.criterion &&
            (c.exercise_id ? p.exercise_id === c.exercise_id : p.exercise_name === c.exercise_name),
        )
        .map((p) => Number(p.value)),
    )
    if (c.value > prev) {
      const r = withDefaults('personal_records', { ...c, achieved_on: today() })
      rows('personal_records').push(r)
      created.push(r)
    }
  }
  recomputePoints()
  save()
  return { data: created, error: null }
}

// Seleção com relações ----------------------------------------------------------------------------

type Field = { name: string; inner: boolean; children: Field[] | null }

function parseSelect(s: string): Field[] {
  const out: Field[] = []
  let depth = 0
  let cur = ''
  const push = () => {
    const t = cur.trim()
    cur = ''
    if (!t) return
    const m = /^([a-z_*]+)(!inner)?(?:\((.*)\))?$/s.exec(t)
    if (!m?.[1]) return
    out.push({
      name: m[1],
      inner: Boolean(m[2]),
      children: m[3] !== undefined ? parseSelect(m[3]) : null,
    })
  }
  for (const ch of s) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) push()
    else cur += ch
  }
  push()
  return out
}

function project(table: string, row: Row, fields: Field[]): Row | null {
  const out: Row = {}
  const all = fields.some((f) => f.name === '*')
  if (all) Object.assign(out, row)
  for (const f of fields) {
    if (f.name === '*') continue
    if (!f.children) {
      out[f.name] = row[f.name] ?? null
      continue
    }
    const rel = f.name
    const fkHere = FK[rel]
    if (fkHere && fkHere in row) {
      const target = rows(rel).find((r) => r.id === row[fkHere])
      out[rel] = target ? project(rel, target, f.children) : null
      if (f.inner && !target) return null
    } else {
      const fkThere = FK[table]
      const kids = fkThere ? rows(rel).filter((r) => r[fkThere] === row.id) : []
      const sub = f.children
      out[rel] = kids.map((k) => project(rel, k, sub)).filter(Boolean)
    }
  }
  return out
}

// Construtor de consultas -------------------------------------------------------------------------

type Filter = (r: Row) => boolean

const get = (r: Row, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Row)[k] : undefined), r)

const cmp = (a: unknown, b: unknown) =>
  String(a ?? '') < String(b ?? '') ? -1 : String(a ?? '') > String(b ?? '') ? 1 : 0

class Query implements PromiseLike<Result> {
  private op: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select'
  private payload: Row | Row[] | null = null
  private fields: Field[] = [{ name: '*', inner: false, children: null }]
  private returning = false
  private filters: Filter[] = []
  private orders: Array<[string, boolean]> = []
  private lim: number | null = null
  private off = 0
  private mode: 'many' | 'single' | 'maybe' = 'many'
  private countMode = false
  private headOnly = false
  private conflict: string[] = []

  constructor(private table: string) {}

  select(cols = '*', opts?: { count?: string; head?: boolean }) {
    this.fields = parseSelect(cols)
    if (this.op !== 'select') this.returning = true
    if (opts?.count) this.countMode = true
    if (opts?.head) this.headOnly = true
    return this
  }
  insert(p: Row | Row[]) {
    this.op = 'insert'
    this.payload = p
    return this
  }
  update(p: Row) {
    this.op = 'update'
    this.payload = p
    return this
  }
  upsert(p: Row, opts?: { onConflict?: string }) {
    this.op = 'upsert'
    this.payload = p
    this.conflict = (opts?.onConflict ?? 'id').split(',').map((s) => s.trim())
    return this
  }
  delete() {
    this.op = 'delete'
    return this
  }
  eq(c: string, v: unknown) {
    this.filters.push((r) => get(r, c) === v)
    return this
  }
  neq(c: string, v: unknown) {
    this.filters.push((r) => get(r, c) !== v)
    return this
  }
  is(c: string, v: unknown) {
    this.filters.push((r) => (get(r, c) ?? null) === v)
    return this
  }
  not(c: string, op: string, v: unknown) {
    if (op === 'is') this.filters.push((r) => (get(r, c) ?? null) !== v)
    else if (op === 'eq') this.filters.push((r) => get(r, c) !== v)
    return this
  }
  gte(c: string, v: unknown) {
    this.filters.push((r) => cmp(get(r, c), v) >= 0)
    return this
  }
  gt(c: string, v: unknown) {
    this.filters.push((r) => cmp(get(r, c), v) > 0)
    return this
  }
  lte(c: string, v: unknown) {
    this.filters.push((r) => cmp(get(r, c), v) <= 0)
    return this
  }
  lt(c: string, v: unknown) {
    this.filters.push((r) => cmp(get(r, c), v) < 0)
    return this
  }
  in(c: string, vs: unknown[]) {
    this.filters.push((r) => vs.includes(get(r, c)))
    return this
  }
  ilike(c: string, pattern: string) {
    const needle = pattern.replace(/%/g, '').toLowerCase()
    this.filters.push((r) =>
      String(get(r, c) ?? '')
        .toLowerCase()
        .includes(needle),
    )
    return this
  }
  order(c: string, opts?: { ascending?: boolean }) {
    this.orders.push([c, opts?.ascending !== false])
    return this
  }
  limit(n: number) {
    this.lim = n
    return this
  }
  range(from: number, to: number) {
    this.off = from
    this.lim = to - from + 1
    return this
  }
  single() {
    this.mode = 'single'
    return this
  }
  maybeSingle() {
    this.mode = 'maybe'
    return this
  }

  then<A = Result, B = never>(
    ok?: ((v: Result) => A | PromiseLike<A>) | null,
    err?: ((e: unknown) => B | PromiseLike<B>) | null,
  ) {
    // Pequena espera para a interface mostrar os estados de carregamento como no app real.
    return new Promise<Result>((resolve) => setTimeout(() => resolve(this.run()), 60)).then(ok, err)
  }

  private matches(): Row[] {
    return rows(this.table).filter((r) => this.filters.every((f) => f(r)))
  }

  private shape(list: Row[]): Result {
    if (this.mode === 'single') {
      return list.length === 1
        ? { data: list[0], error: null }
        : violation('JSON object requested, multiple (or no) rows returned', 'PGRST116')
    }
    if (this.mode === 'maybe') return { data: list[0] ?? null, error: null }
    return { data: list, error: null }
  }

  private run(): Result {
    const t = this.table
    if (this.op === 'select') {
      let list = rows(t)
        .map((r) => project(t, r, this.fields))
        .filter((r): r is Row => r !== null)
        .filter((r) => this.filters.every((f) => f(r)))
      for (const [c, asc] of [...this.orders].reverse())
        list = [...list].sort((a, b) => (asc ? 1 : -1) * cmp(get(a, c), get(b, c)))
      const total = list.length
      list = list.slice(this.off, this.lim === null ? undefined : this.off + this.lim)
      if (this.headOnly) return { data: null, error: null, count: total }
      return { ...this.shape(list), ...(this.countMode ? { count: total } : {}) }
    }

    let changed: Row[] = []
    if (this.op === 'insert' || this.op === 'upsert') {
      const input = Array.isArray(this.payload) ? this.payload : [this.payload ?? {}]
      for (const p of input) {
        const existing =
          this.op === 'upsert'
            ? rows(t).find((r) => this.conflict.every((c) => r[c] === p[c]))
            : undefined
        if (existing) {
          Object.assign(existing, p, { updated_at: new Date().toISOString() })
          changed.push(existing)
          continue
        }
        const row = withDefaults(t, p)
        const s = sessionOf(t, row)
        if (s?.status === 'finalizada') return violation('Sessão finalizada não pode ser alterada')
        const bad = checkInsert(t, row, rows(t))
        if (bad) return bad
        rows(t).push(row)
        changed.push(row)
      }
    } else if (this.op === 'update') {
      for (const r of this.matches()) {
        const s = sessionOf(t, r)
        if (s?.status === 'finalizada') return violation('Sessão finalizada não pode ser alterada')
        if (t === 'workout_sessions' && r.status === 'finalizada')
          return violation('Sessão finalizada não pode ser alterada')
        const next = { ...r, ...(this.payload as Row) }
        const bad = checkInsert(t, next, rows(t))
        if (bad) return bad
        Object.assign(
          r,
          this.payload,
          'updated_at' in r ? { updated_at: new Date().toISOString() } : {},
        )
        changed.push(r)
      }
    } else if (this.op === 'delete') {
      changed = this.matches()
      for (const r of changed) removeRow(t, r.id)
    }
    recomputePoints()
    save()
    if (!this.returning) return { data: null, error: null }
    return this.shape(
      changed.map((r) => project(t, r, this.fields)).filter((r): r is Row => r !== null),
    )
  }
}

// Armazenamento de fotos (só neste navegador) -----------------------------------------------------

function photoStore(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(PHOTOS) ?? '{}') as Record<string, string>
  } catch {
    return {}
  }
}

const blobToDataUrl = (b: Blob) =>
  new Promise<string>((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result))
    fr.onerror = () => reject(fr.error)
    fr.readAsDataURL(b)
  })

const storage = {
  from: () => ({
    async upload(path: string, blob: Blob) {
      const all = photoStore()
      all[path] = await blobToDataUrl(blob)
      try {
        localStorage.setItem(PHOTOS, JSON.stringify(all))
      } catch {
        return { data: null, error: { message: 'Sem espaço para fotos na versão de teste.' } }
      }
      return { data: { path }, error: null }
    },
    async createSignedUrls(paths: string[]) {
      const all = photoStore()
      return { data: paths.map((p) => ({ path: p, signedUrl: all[p] ?? null })), error: null }
    },
    async remove(paths: string[]) {
      const all = Object.fromEntries(
        Object.entries(photoStore()).filter(([k]) => !paths.includes(k)),
      )
      try {
        localStorage.setItem(PHOTOS, JSON.stringify(all))
      } catch {
        /* ignora */
      }
      return { data: null, error: null }
    },
  }),
}

// Funções do servidor -------------------------------------------------------------------------------

function fnError(message: string, status = 501) {
  return {
    data: null,
    error: {
      message,
      context: new Response(JSON.stringify({ error: message }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    },
  }
}

const functions = {
  async invoke(name: string) {
    await new Promise((r) => setTimeout(r, 300))
    if (name === 'bruce-ai')
      return fnError(
        'Na versão de teste o Bruce não está ligado à IA. No app real ele responde aqui.',
      )
    if (name === 'food-lookup')
      return fnError(
        'A busca por código de barras precisa do servidor e não funciona na versão de teste.',
      )
    if (name === 'send-reminders') return fnError('Notificações não funcionam na versão de teste.')
    if (name === 'delete-account') {
      resetDemo()
      return { data: { deleted: true }, error: null }
    }
    return fnError('Função indisponível na versão de teste.')
  },
}

// Sessão --------------------------------------------------------------------------------------------

type Listener = (event: string, session: unknown) => void
const listeners = new Set<Listener>()
const SESSION_KEY = 'bruce.demo.session'

function currentSession() {
  let out = true
  try {
    out = localStorage.getItem(SESSION_KEY) !== 'saiu'
  } catch {
    /* padrão: logado */
  }
  return out
    ? { access_token: 'teste', token_type: 'bearer', user: { ...DEMO_USER, aud: 'authenticated' } }
    : null
}

function setSession(on: boolean) {
  try {
    localStorage.setItem(SESSION_KEY, on ? 'entrou' : 'saiu')
  } catch {
    /* ignora */
  }
  const s = currentSession()
  for (const l of listeners) l(on ? 'SIGNED_IN' : 'SIGNED_OUT', s)
}

const auth = {
  async getSession() {
    return { data: { session: currentSession() }, error: null }
  },
  async getUser() {
    const s = currentSession()
    return { data: { user: s?.user ?? null }, error: null }
  },
  onAuthStateChange(cb: Listener) {
    listeners.add(cb)
    return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } }
  },
  async signInWithOtp() {
    return { data: {}, error: null }
  },
  async verifyOtp() {
    setSession(true)
    return { data: {}, error: null }
  },
  async signOut() {
    setSession(false)
    return { error: null }
  },
}

recomputePoints()

export const demoSupabase = {
  from: (table: string) => new Query(table),
  rpc: async (name: string, args: Record<string, unknown>) => {
    if (name === 'finish_workout_session') return finishSession(String(args.p_session))
    return violation('Função indisponível na versão de teste.')
  },
  storage,
  functions,
  auth,
}
