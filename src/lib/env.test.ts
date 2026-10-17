import { describe, expect, it } from 'vitest'
import { readEnv } from './env'

describe('readEnv', () => {
  it('aceita URL https e chave', () => {
    const r = readEnv({
      VITE_SUPABASE_URL: 'https://abc.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_1234567890abcdef',
    })
    expect(r.ok).toBe(true)
  })

  it('aponta o que falta ou está errado', () => {
    const r = readEnv({ VITE_SUPABASE_URL: 'http://inseguro.com' })
    expect(r).toEqual({
      ok: false,
      missing: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'],
    })
  })
})
