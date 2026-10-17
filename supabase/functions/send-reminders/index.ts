// Envia lembretes por Web Push. Chamada a cada 15 minutos pelo pg_cron (cabeçalho x-cron-secret)
// ou pelo próprio usuário logado para um envio de teste ({ "test": true }).
import webpush from 'npm:web-push@3.6.7'
import { adminClient, corsHeaders, json, requireUser } from '../_shared/http.ts'

const SUBJECT = 'mailto:bruceapp@users.noreply.github.com'

type Sub = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string }

function spNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  }).formatToParts(new Date())
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  const wd = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(get('weekday')) + 1
  return {
    day: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
    weekday: wd,
  }
}

const toMinutes = (t: string) => {
  const [h = '0', m = '0'] = t.split(':')
  return Number(h) * 60 + Number(m)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)

  const admin = adminClient()
  const [{ data: priv }, { data: pub }, { data: cronSecret }] = await Promise.all([
    admin.rpc('app_secret', { p_name: 'vapid_private_key' }),
    admin.rpc('app_secret', { p_name: 'vapid_public_key' }),
    admin.rpc('app_secret', { p_name: 'cron_secret' }),
  ])
  if (!priv || !pub) return json({ error: 'Chaves de notificação não configuradas' }, 503)
  webpush.setVapidDetails(SUBJECT, pub as string, priv as string)

  async function send(
    sub: Sub,
    payload: { title: string; body: string; url: string; tag: string },
  ) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
        { TTL: 60 * 60, urgency: 'normal' },
      )
      return true
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode
      // Inscrição expirada ou revogada: remove para não tentar de novo.
      if (status === 404 || status === 410)
        await admin.from('push_subscriptions').delete().eq('id', sub.id)
      return false
    }
  }

  // Envio de teste pedido pelo usuário.
  const isCron = cronSecret && req.headers.get('x-cron-secret') === cronSecret
  if (!isCron) {
    const { user } = await requireUser(req)
    if (!user) return json({ error: 'Não autenticado' }, 401)
    const { data: subs } = await admin.from('push_subscriptions').select('*').eq('user_id', user.id)
    let ok = 0
    for (const s of (subs ?? []) as Sub[]) {
      if (
        await send(s, {
          title: 'Bruceapp',
          body: 'Lembretes ativados. É assim que eles vão chegar.',
          url: '/',
          tag: 'teste',
        })
      )
        ok++
    }
    return json({ sent: ok, total: subs?.length ?? 0 })
  }

  // Rodada agendada: janela dos últimos 15 minutos, no horário de Brasília.
  const now = spNow()
  const from = now.minutes - 15
  const inWindow = (t: string | null | undefined) => {
    if (!t) return false
    const m = toMinutes(t)
    return m > from && m <= now.minutes
  }

  const { data: subs } = await admin.from('push_subscriptions').select('*')
  const byUser = new Map<string, Sub[]>()
  for (const s of (subs ?? []) as Sub[])
    byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s])

  let sent = 0
  for (const [userId, userSubs] of byUser) {
    const { data: profile } = await admin
      .from('profiles')
      .select('settings')
      .eq('id', userId)
      .single()
    const settings = (profile?.settings ?? {}) as {
      lembretes_ativos?: boolean
      lembrete_treino?: string | null
    }
    if (!settings.lembretes_ativos) continue
    const messages: Array<{ title: string; body: string; url: string; tag: string }> = []

    const { data: habits } = await admin
      .from('habits')
      .select('id, name, days_of_week, target_per_day, reminder_time')
      .eq('user_id', userId)
      .is('archived_at', null)
      .not('reminder_time', 'is', null)
    const due = (habits ?? []).filter(
      (h) =>
        (h.days_of_week as number[]).includes(now.weekday) && inWindow(h.reminder_time as string),
    )
    if (due.length) {
      const { data: logs } = await admin
        .from('habit_logs')
        .select('habit_id, count')
        .eq('user_id', userId)
        .eq('day', now.day)
        .in(
          'habit_id',
          due.map((h) => h.id),
        )
      for (const h of due) {
        const count = logs?.find((l) => l.habit_id === h.id)?.count ?? 0
        if (count < h.target_per_day)
          messages.push({
            title: 'Lembrete de hábito',
            body: h.name as string,
            url: '/',
            tag: `habito-${h.id}`,
          })
      }
    }

    if (inWindow(settings.lembrete_treino)) {
      const { data: days } = await admin
        .from('workout_plan_days')
        .select('name, workout_plans!inner(archived_at)')
        .eq('user_id', userId)
        .eq('weekday', now.weekday)
        .is('workout_plans.archived_at', null)
        .limit(1)
      const { count } = await admin
        .from('workout_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('started_at', `${now.day}T00:00:00-03:00`)
      if (days?.length && !count) {
        messages.push({
          title: 'Hora do treino',
          body: `Hoje é dia de ${days[0]!.name}.`,
          url: '/treino',
          tag: 'treino',
        })
      }
    }

    for (const m of messages) for (const s of userSubs) if (await send(s, m)) sent++
  }
  return json({ sent })
})
