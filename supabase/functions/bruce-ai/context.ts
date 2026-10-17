// Monta um resumo curto dos registros do usuário para o assistente.
// Usa o cliente do próprio usuário: RLS garante que só os dados dele entram.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0'

const DAY_MS = 86_400_000

function spDate(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d)
}

function round(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  return n.toFixed(digits).replace('.', ',')
}

export async function buildContext(db: SupabaseClient): Promise<string> {
  const now = new Date()
  const today = spDate(now)
  const d7 = spDate(new Date(now.getTime() - 6 * DAY_MS))
  const d14iso = new Date(now.getTime() - 14 * DAY_MS).toISOString()

  const [profile, goals, sessions, records, diary, habits, logs, weights, plans, target] =
    await Promise.all([
      db.from('profiles').select('display_name, track_calories, settings').single(),
      db
        .from('goals')
        .select('title, kind, target_value, unit, due_on')
        .eq('status', 'ativa')
        .limit(10),
      db
        .from('workout_sessions')
        .select(
          'title, started_at, finished_at, session_exercises(exercise_name, exercise_sets(weight_kg, reps, completed_at))',
        )
        .eq('status', 'finalizada')
        .gte('started_at', d14iso)
        .order('started_at', { ascending: false })
        .limit(12),
      db
        .from('personal_records')
        .select('exercise_name, criterion, value, achieved_on')
        .order('achieved_on', { ascending: false })
        .limit(10),
      db
        .from('food_diary_entries')
        .select('day, kcal, protein_g, carbs_g, fat_g, is_estimate')
        .gte('day', d7)
        .lte('day', today),
      db.from('habits').select('id, name, days_of_week, target_per_day').is('archived_at', null),
      db.from('habit_logs').select('habit_id, day, count').gte('day', d7).lte('day', today),
      db
        .from('body_measurements')
        .select('measured_on, value')
        .eq('kind', 'peso')
        .order('measured_on', { ascending: false })
        .limit(8),
      db
        .from('workout_plans')
        .select(
          'name, workout_plan_days(name, weekday, workout_plan_exercises(target_sets, target_reps_min, target_reps_max, exercises(name)))',
        )
        .is('archived_at', null)
        .limit(3),
      db
        .from('nutrition_targets')
        .select('kcal, protein_g, carbs_g, fat_g')
        .is('valid_to', null)
        .limit(1)
        .maybeSingle(),
    ])

  const lines: string[] = []
  const p = profile.data
  const s = (p?.settings ?? {}) as Record<string, unknown>
  lines.push(
    `Hoje: ${today} (${new Intl.DateTimeFormat('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' }).format(now)}).`,
  )
  lines.push(
    `Perfil: ${p?.display_name ?? 'sem nome'}; objetivo ${s.objetivo ?? 'não informado'}; experiência ${s.experiencia ?? 'não informada'}; acompanha calorias: ${p?.track_calories ? 'sim' : 'não'}.`,
  )

  if (goals.data?.length) {
    lines.push(
      'Metas ativas: ' +
        goals.data
          .map(
            (g) =>
              `${g.title}${g.target_value ? ` (${g.target_value} ${g.unit ?? ''})` : ''}${g.due_on ? ` até ${g.due_on}` : ''}`,
          )
          .join('; ') +
        '.',
    )
  }

  if (plans.data?.length) {
    lines.push('Planos de treino:')
    for (const pl of plans.data) {
      for (const d of (pl.workout_plan_days ?? []) as Array<Record<string, unknown>>) {
        const exs = ((d.workout_plan_exercises ?? []) as Array<Record<string, unknown>>)
          .map(
            (e) =>
              `${(e.exercises as { name?: string } | null)?.name ?? 'exercício'} ${e.target_sets}x${e.target_reps_min ?? ''}${e.target_reps_max && e.target_reps_max !== e.target_reps_min ? `-${e.target_reps_max}` : ''}`,
          )
          .join(', ')
        lines.push(
          `- ${pl.name} / ${d.name}${d.weekday ? ` (dia ${d.weekday} da semana, 1=seg)` : ''}: ${exs || 'sem exercícios'}`,
        )
      }
    }
  }

  if (sessions.data?.length) {
    lines.push('Treinos finalizados nos últimos 14 dias (melhor série por exercício):')
    for (const se of sessions.data) {
      const parts = (
        (se.session_exercises ?? []) as Array<{
          exercise_name: string
          exercise_sets: Array<{
            weight_kg: number | null
            reps: number | null
            completed_at: string | null
          }>
        }>
      ).map((e) => {
        const done = e.exercise_sets.filter((x) => x.completed_at && x.reps)
        const best = done.sort((a, b) => (b.weight_kg ?? 0) - (a.weight_kg ?? 0))[0]
        return `${e.exercise_name} ${done.length} séries${best ? `, melhor ${round(best.weight_kg, 1)} kg x ${best.reps}` : ''}`
      })
      lines.push(
        `- ${spDate(new Date(se.started_at))} ${se.title}: ${parts.join('; ') || 'sem séries'}`,
      )
    }
  } else {
    lines.push('Nenhum treino finalizado nos últimos 14 dias.')
  }

  if (records.data?.length) {
    lines.push(
      'Recordes recentes: ' +
        records.data
          .map(
            (r) => `${r.exercise_name} ${r.criterion} ${round(r.value, 1)} kg em ${r.achieved_on}`,
          )
          .join('; ') +
        '.',
    )
  }

  const byDay = new Map<string, { kcal: number; prot: number; n: number; est: number }>()
  for (const e of diary.data ?? []) {
    const cur = byDay.get(e.day) ?? { kcal: 0, prot: 0, n: 0, est: 0 }
    cur.kcal += e.kcal ?? 0
    cur.prot += e.protein_g ?? 0
    cur.n += 1
    if (e.is_estimate) cur.est += 1
    byDay.set(e.day, cur)
  }
  if (byDay.size) {
    lines.push('Alimentação nos últimos 7 dias:')
    for (const [day, v] of [...byDay.entries()].sort()) {
      lines.push(
        `- ${day}: ${v.n} itens${p?.track_calories ? `, ${round(v.kcal)} kcal, ${round(v.prot)} g proteína` : ''}${v.est ? ` (${v.est} estimados)` : ''}`,
      )
    }
  } else {
    lines.push('Nenhuma refeição registrada nos últimos 7 dias.')
  }
  if (target.data) {
    lines.push(
      `Meta nutricional atual: ${round(target.data.kcal)} kcal, ${round(target.data.protein_g)} g proteína.`,
    )
  }

  if (habits.data?.length) {
    lines.push('Hábitos nos últimos 7 dias (cumpridos / programados):')
    for (const h of habits.data) {
      let scheduled = 0
      let done = 0
      for (let i = 0; i < 7; i++) {
        const d = new Date(now.getTime() - i * DAY_MS)
        const key = spDate(d)
        const wd = ((new Date(`${key}T12:00:00-03:00`).getUTCDay() + 6) % 7) + 1
        if (!(h.days_of_week as number[]).includes(wd)) continue
        scheduled += 1
        const log = (logs.data ?? []).find((l) => l.habit_id === h.id && l.day === key)
        if ((log?.count ?? 0) >= h.target_per_day) done += 1
      }
      lines.push(`- ${h.name}: ${done}/${scheduled}`)
    }
  }

  if (weights.data?.length) {
    lines.push(
      'Peso (mais recente primeiro): ' +
        weights.data.map((w) => `${w.measured_on} ${round(w.value, 1)} kg`).join('; ') +
        '.',
    )
  }

  return lines.join('\n')
}
