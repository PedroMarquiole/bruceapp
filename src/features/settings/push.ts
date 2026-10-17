import { db } from '../../lib/db'

const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export function pushSupport(): { ok: boolean; reason?: string } {
  if (!VAPID) return { ok: false, reason: 'O build está sem a chave pública de notificações.' }
  if (
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    !('Notification' in window)
  ) {
    const ios = /iPhone|iPad/.test(navigator.userAgent)
    return {
      ok: false,
      reason: ios
        ? 'No iPhone, as notificações só funcionam com o app instalado: toque em Compartilhar e em "Adicionar à Tela de Início", e abra por lá.'
        : 'Este navegador não oferece notificações.',
    }
  }
  return { ok: true }
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4)
  const b64 = (base64url + pad).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupport().ok) return null
  const reg = await navigator.serviceWorker.getRegistration()
  return (await reg?.pushManager.getSubscription()) ?? null
}

/** Pede permissão, inscreve este aparelho e guarda a inscrição no banco. */
export async function enablePush(): Promise<void> {
  const support = pushSupport()
  if (!support.ok || !VAPID) throw new Error(support.reason)
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error(
      'Permissão de notificação negada. Libere nos ajustes do aparelho para o Bruceapp.',
    )
  }
  const reg = await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(VAPID),
    }))
  const json = sub.toJSON()
  const { error } = await db()
    .from('push_subscriptions')
    .insert({
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh ?? '',
      auth: json.keys?.auth ?? '',
      user_agent: navigator.userAgent.slice(0, 300),
    })
  // Já inscrito antes: tudo certo.
  if (error && !error.message.includes('duplicate'))
    throw new Error('Não foi possível salvar a inscrição.')
}

export async function disablePush(): Promise<void> {
  const sub = await currentSubscription()
  if (!sub) return
  await db().from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}

export async function sendTestPush(): Promise<number> {
  const { data, error } = await db().functions.invoke('send-reminders', { body: { test: true } })
  if (error) throw new Error('Não foi possível enviar o teste agora.')
  return (data as { sent: number }).sent
}
