import type { Exercise } from '../../../lib/db'

/** Normaliza para busca sem acento: "Supino" encontra "supíno". */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

export function filterExercises(list: readonly Exercise[], term: string): Exercise[] {
  const t = normalize(term.trim())
  if (!t) return [...list]
  return list.filter(
    (e) =>
      normalize(e.name).includes(t) ||
      e.primary_muscles.some((m) => normalize(m).includes(t)) ||
      normalize(e.equipment ?? '').includes(t),
  )
}
