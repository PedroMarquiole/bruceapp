/**
 * Supabase falso para testes: nenhuma chamada sai da máquina.
 * `fakeDb.tables` define o que cada tabela devolve; `fakeDb.calls` registra escritas.
 * Filtros são ignorados de propósito: cada teste semeia só as linhas que importam.
 */
type Row = Record<string, unknown>
type Call = { table: string; op: 'insert' | 'update' | 'upsert' | 'delete'; payload: unknown }

export const fakeDb = {
  tables: {} as Record<string, Row[]>,
  calls: [] as Call[],
  rpc: {} as Record<string, unknown>,
  invoke: null as null | ((name: string, body: unknown) => { data: unknown; error: unknown }),
  reset() {
    this.tables = {
      profiles: [
        {
          id: 'u1',
          display_name: null,
          timezone: 'America/Sao_Paulo',
          weight_unit: 'kg',
          track_calories: false,
          settings: {},
          onboarded_at: '2026-10-01T00:00:00Z',
        },
      ],
    }
    this.calls = []
    this.rpc = {}
    this.invoke = null
  },
}
fakeDb.reset()

let seq = 0

function builder(table: string) {
  let op: Call['op'] | null = null
  let payload: unknown = null
  let mode: 'many' | 'single' | 'maybe' = 'many'

  const resolve = () => {
    if (op) {
      fakeDb.calls.push({ table, op, payload })
      const base = Array.isArray(payload) ? payload[0] : payload
      const row = { id: `fake-${++seq}`, ...(base as Row) }
      return { data: mode === 'many' ? [row] : row, error: null }
    }
    const rows = fakeDb.tables[table] ?? []
    if (mode === 'single') {
      return rows[0]
        ? { data: rows[0], error: null }
        : { data: null, error: { message: 'nenhuma linha' } }
    }
    if (mode === 'maybe') return { data: rows[0] ?? null, error: null }
    return { data: rows, error: null }
  }

  const api: Record<string, unknown> = {}
  const chain = () => proxy
  const proxy: Record<string, unknown> = new Proxy(api, {
    get(_t, prop: string) {
      if (prop === 'then') {
        return (ok: (v: unknown) => unknown, err?: (e: unknown) => unknown) =>
          Promise.resolve(resolve()).then(ok, err)
      }
      if (prop === 'insert' || prop === 'update' || prop === 'upsert') {
        return (p: unknown) => {
          op = prop
          payload = p
          return proxy
        }
      }
      if (prop === 'delete') {
        return () => {
          op = 'delete'
          return proxy
        }
      }
      if (prop === 'single') return () => ((mode = 'single'), proxy)
      if (prop === 'maybeSingle') return () => ((mode = 'maybe'), proxy)
      return chain
    },
  })
  return proxy
}

export const fakeSupabase = {
  from: (table: string) => builder(table),
  rpc: async (name: string) => ({ data: fakeDb.rpc[name] ?? [], error: null }),
  functions: {
    invoke: async (name: string, opts: { body: unknown }) =>
      fakeDb.invoke
        ? fakeDb.invoke(name, opts.body)
        : { data: null, error: new Error('sem servidor no teste') },
  },
  auth: {
    getUser: async () => ({ data: { user: { id: 'u1', email: 'eu@teste.invalid' } }, error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signInWithOtp: async () => ({ error: null }),
    verifyOtp: async () => ({ error: null }),
    signOut: async () => ({ error: null }),
  },
}
