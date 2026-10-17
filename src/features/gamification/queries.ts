import { useQuery } from '@tanstack/react-query'
import { db, unwrap } from '../../lib/db'

export type LedgerRow = {
  id: string
  rule: string
  source_key: string
  points: number
  day: string
  created_at: string
}

/** Extrato de pontos (gravado só por gatilhos no banco). */
export function usePoints() {
  return useQuery({
    queryKey: ['points'],
    queryFn: async () => {
      const rows = unwrap<LedgerRow[]>(
        await db()
          .from('points_ledger')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1000),
      )
      return { total: rows.reduce((s, r) => s + r.points, 0), rows }
    },
  })
}

/** Dias distintos com registro alimentar (para conquistas e missões). */
export function useDiaryDays() {
  return useQuery({
    queryKey: ['diary', 'days'],
    queryFn: async () => {
      const rows = unwrap<Array<{ day: string }>>(
        await db()
          .from('food_diary_entries')
          .select('day')
          .order('day', { ascending: false })
          .limit(5000),
      )
      return [...new Set(rows.map((r) => r.day))]
    },
  })
}
