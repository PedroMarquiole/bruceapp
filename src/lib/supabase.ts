import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { readEnv } from './env'

const result = readEnv()

/** Cliente único do Supabase, ou null quando o build está sem configuração. */
export const supabase: SupabaseClient | null = result.ok
  ? createClient(result.env.VITE_SUPABASE_URL, result.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Login por código: nada chega pela URL.
        detectSessionInUrl: false,
      },
    })
  : null

export const missingEnv: string[] = result.ok ? [] : result.missing
