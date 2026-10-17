/** Substitui src/lib/supabase.ts no build de teste (`vite build --mode demo`). */
import type { SupabaseClient } from '@supabase/supabase-js'
import { demoSupabase } from './demoSupabase'

export const supabase = demoSupabase as unknown as SupabaseClient
export const missingEnv: string[] = []
