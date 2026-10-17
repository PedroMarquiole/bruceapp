import { db } from '../../lib/db'

export type AiError = { kind: 'nao_configurada' | 'limite' | 'rede' | 'servidor'; message: string }

/** Chama a Edge Function do assistente e traduz os erros em mensagens acionáveis. */
export async function callAssistant<T>(body: Record<string, unknown>): Promise<T> {
  let res: { data: unknown; error: unknown }
  try {
    res = await db().functions.invoke('bruce-ai', { body })
  } catch {
    throw toError('rede', 'Sem conexão com o servidor. Confira a internet e tente de novo.')
  }
  if (res.error) {
    const ctx = (res.error as { context?: Response }).context
    let payload: { error?: string; code?: string } | null
    try {
      payload = ctx ? await ctx.json() : null
    } catch {
      payload = null
    }
    if (payload?.code === 'ia_nao_configurada')
      throw toError(
        'nao_configurada',
        'O assistente ainda não foi configurado: falta a chave do provedor de IA no Supabase.',
      )
    if (payload?.code === 'limite_diario')
      throw toError('limite', payload.error ?? 'Limite diário de uso da IA atingido. Volta amanhã.')
    if (ctx?.status === 0 || !navigator.onLine)
      throw toError('rede', 'Sem conexão com o servidor. Confira a internet e tente de novo.')
    throw toError(
      'servidor',
      payload?.error ?? 'O assistente não respondeu agora. Tente de novo em instantes.',
    )
  }
  return res.data as T
}

function toError(kind: AiError['kind'], message: string): Error & AiError {
  return Object.assign(new Error(message), { kind })
}

/** Reduz a imagem para no máximo `max` px no maior lado e devolve JPEG em base64 (sem prefixo). */
export async function imageToBase64(file: File, max = 1024): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Não foi possível processar a imagem.')
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
  return dataUrl.slice(dataUrl.indexOf(',') + 1)
}
