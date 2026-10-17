// Utilitários comuns das Edge Functions do Bruceapp.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  })
}

/** Cliente que age como o usuário da requisição (RLS se aplica). */
export function userClient(req: Request): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  })
}

/** Cliente administrativo: só para operações que o usuário não pode fazer sozinho. */
export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })
}

export async function requireUser(req: Request) {
  const client = userClient(req)
  const { data, error } = await client.auth.getUser()
  if (error || !data.user) return { client, user: null }
  return { client, user: data.user }
}
