export type SetLike = { weight_kg: number | null; reps: number | null; completed_at: string | null }

/** Volume (kg × repetições) das séries concluídas. */
export function volume(sets: readonly SetLike[]): number {
  return sets.reduce(
    (acc, s) => (s.completed_at && s.weight_kg && s.reps ? acc + s.weight_kg * s.reps : acc),
    0,
  )
}

/** 1RM estimado (Epley), igual ao cálculo do banco: só de 1 a 12 repetições. */
export function estimatedOneRepMax(weight: number, reps: number): number | null {
  if (!(weight > 0) || !(reps > 0) || reps > 12) return null
  if (reps === 1) return weight
  return Math.round(weight * (1 + reps / 30) * 10) / 10
}

export function formatSet(s: Pick<SetLike, 'weight_kg' | 'reps'>): string {
  const w = s.weight_kg === null ? '—' : new Intl.NumberFormat('pt-BR').format(s.weight_kg)
  const r = s.reps === null ? '—' : String(s.reps)
  return `${w} kg × ${r}`
}

/** Texto da meta: "3 × 8–12", "4 × 10", "3 séries". */
export function formatTarget(
  sets: number | null,
  min: number | null,
  max: number | null,
): string | null {
  if (!sets) return null
  if (min && max && min !== max) return `${sets} × ${min}–${max}`
  if (min || max) return `${sets} × ${min ?? max}`
  return `${sets} séries`
}

/** Duração legível: "48 min", "1 h 05 min". */
export function formatDuration(startIso: string, endIso: string | null, now = new Date()): string {
  const end = endIso ? new Date(endIso) : now
  const mins = Math.max(0, Math.round((end.getTime() - new Date(startIso).getTime()) / 60000))
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  return `${h} h ${String(mins % 60).padStart(2, '0')} min`
}

export const CRITERION_LABEL: Record<string, string> = {
  carga_1: 'Maior carga (1+ repetição)',
  carga_3: 'Maior carga para 3 repetições',
  carga_5: 'Maior carga para 5 repetições',
  carga_10: 'Maior carga para 10 repetições',
  e1rm: '1RM estimado',
}
