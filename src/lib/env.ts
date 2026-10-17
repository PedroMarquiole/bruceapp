import { z } from 'zod'

const EnvSchema = z.object({
  VITE_SUPABASE_URL: z.url({ protocol: /^https$/ }),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
})

export type Env = z.infer<typeof EnvSchema>

export type EnvResult = { ok: true; env: Env } | { ok: false; missing: string[] }

/** Valida as variáveis públicas do build. Nunca lança: a tela de configuração mostra o problema. */
export function readEnv(source: Record<string, unknown> = import.meta.env): EnvResult {
  const parsed = EnvSchema.safeParse(source)
  if (parsed.success) return { ok: true, env: parsed.data }
  const missing = [...new Set(parsed.error.issues.map((i) => String(i.path[0])))]
  return { ok: false, missing }
}
