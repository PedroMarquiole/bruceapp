// Exclui a conta e TODOS os dados do usuário: arquivos do storage e o usuário (o banco apaga o
// resto em cascata). Exige o corpo { "confirm": "EXCLUIR" } para evitar exclusão acidental.
import { adminClient, corsHeaders, json, requireUser } from '../_shared/http.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)

  const { user } = await requireUser(req)
  if (!user) return json({ error: 'Não autenticado' }, 401)

  const body = await req.json().catch(() => null)
  if (body?.confirm !== 'EXCLUIR') return json({ error: 'Confirmação ausente' }, 400)

  const admin = adminClient()
  // Fotos de progresso: arquivos (não pastas) dentro da pasta do usuário, em rodadas limitadas.
  for (let round = 0; ; round++) {
    if (round >= 50) return json({ error: 'Não foi possível apagar os arquivos.' }, 500)
    const { data: entries, error } = await admin.storage
      .from('progress-photos')
      .list(user.id, { limit: 100 })
    if (error) return json({ error: 'Não foi possível apagar os arquivos.' }, 500)
    const files = (entries ?? []).filter((f) => f.id !== null)
    if (!files.length) break
    const rm = await admin.storage
      .from('progress-photos')
      .remove(files.map((f) => `${user.id}/${f.name}`))
    if (rm.error) return json({ error: 'Não foi possível apagar os arquivos.' }, 500)
  }

  const del = await admin.auth.admin.deleteUser(user.id)
  if (del.error) return json({ error: 'Não foi possível excluir a conta.' }, 500)
  return json({ deleted: true })
})
