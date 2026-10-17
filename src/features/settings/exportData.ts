import { db } from '../../lib/db'

/** Tabelas do usuário incluídas na exportação (RLS garante que só vêm os dados dele). */
export const EXPORT_TABLES = [
  'profiles',
  'goals',
  'nutrition_targets',
  'habits',
  'habit_logs',
  'foods',
  'food_diary_entries',
  'exercises',
  'workout_plans',
  'workout_plan_days',
  'workout_plan_exercises',
  'workout_sessions',
  'session_exercises',
  'exercise_sets',
  'personal_records',
  'body_measurements',
  'progress_photos',
  'ai_conversations',
  'ai_messages',
  'ai_usage',
  'points_ledger',
] as const

const PAGE = 1000

/** Lê todas as linhas de cada tabela, em páginas, e devolve um objeto pronto para JSON. */
export async function collectExport(): Promise<Record<string, unknown>> {
  const data: Record<string, unknown[]> = {}
  for (const table of EXPORT_TABLES) {
    const rows: unknown[] = []
    for (let from = 0; ; from += PAGE) {
      let q = db()
        .from(table)
        .select('*')
        .range(from, from + PAGE - 1)
      // Exercícios do catálogo padrão (user_id nulo) não são dados pessoais.
      if (table === 'exercises') q = q.not('user_id', 'is', null)
      const { data: page, error } = await q
      if (error) throw new Error(`Falha ao ler ${table}`)
      rows.push(...(page ?? []))
      if (!page || page.length < PAGE) break
    }
    data[table] = rows
  }
  return {
    app: 'Bruceapp',
    format: 1,
    exported_at: new Date().toISOString(),
    note: 'Fotos de evolução não vão no arquivo; os caminhos estão em progress_photos.',
    data,
  }
}

export function downloadJson(obj: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
