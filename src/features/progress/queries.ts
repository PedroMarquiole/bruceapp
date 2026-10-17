import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { db, unwrap, type BodyMeasurement, type MeasurementKind } from '../../lib/db'

export const MEASUREMENTS: ReadonlyArray<{
  value: MeasurementKind
  label: string
  unit: 'kg' | 'cm' | '%'
}> = [
  { value: 'peso', label: 'Peso', unit: 'kg' },
  { value: 'cintura', label: 'Cintura', unit: 'cm' },
  { value: 'quadril', label: 'Quadril', unit: 'cm' },
  { value: 'peito', label: 'Peito', unit: 'cm' },
  { value: 'braco', label: 'Braço', unit: 'cm' },
  { value: 'coxa', label: 'Coxa', unit: 'cm' },
  { value: 'gordura', label: 'Gordura corporal', unit: '%' },
]

export function useMeasurements() {
  return useQuery({
    queryKey: ['measurements'],
    queryFn: async () =>
      unwrap<BodyMeasurement[]>(
        await db().from('body_measurements').select('*').order('measured_on', { ascending: true }),
      ),
  })
}

export function useAddMeasurement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (m: Omit<BodyMeasurement, 'id' | 'note'> & { note?: string | null }) =>
      unwrap(await db().from('body_measurements').insert(m)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['measurements'] }),
  })
}

export function useDeleteMeasurement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) =>
      unwrap(await db().from('body_measurements').delete().eq('id', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['measurements'] }),
  })
}

// Fotos de progresso ------------------------------------------------------------------------------

export type ProgressPhoto = {
  id: string
  storage_path: string
  taken_on: string
  angle: 'frente' | 'lado' | 'costas' | 'outro'
  note: string | null
  url: string | null
}

const BUCKET = 'progress-photos'

/** Lista as fotos com URLs assinadas de 10 minutos (o bucket é privado). */
export function usePhotos() {
  return useQuery({
    queryKey: ['photos'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const rows = unwrap<Omit<ProgressPhoto, 'url'>[]>(
        await db().from('progress_photos').select('*').order('taken_on', { ascending: false }),
      )
      if (rows.length === 0) return [] as ProgressPhoto[]
      const { data } = await db()
        .storage.from(BUCKET)
        .createSignedUrls(
          rows.map((r) => r.storage_path),
          600,
        )
      const byPath = new Map((data ?? []).map((d) => [d.path, d.signedUrl]))
      return rows.map((r) => ({ ...r, url: byPath.get(r.storage_path) ?? null }))
    },
  })
}

export function useUploadPhoto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      blob,
      takenOn,
      angle,
    }: {
      blob: Blob
      takenOn: string
      angle: ProgressPhoto['angle']
    }) => {
      const { data: auth } = await db().auth.getUser()
      if (!auth.user) throw new Error('Sessão expirada')
      const path = `${auth.user.id}/${takenOn}-${crypto.randomUUID()}.jpg`
      const up = await db()
        .storage.from(BUCKET)
        .upload(path, blob, { contentType: 'image/jpeg', upsert: false })
      if (up.error) throw new Error(up.error.message)
      const ins = await db()
        .from('progress_photos')
        .insert({ storage_path: path, taken_on: takenOn, angle })
      if (ins.error) {
        await db().storage.from(BUCKET).remove([path])
        throw new Error(ins.error.message)
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['photos'] }),
  })
}

export function useDeletePhoto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: Pick<ProgressPhoto, 'id' | 'storage_path'>) => {
      const rm = await db().storage.from(BUCKET).remove([p.storage_path])
      if (rm.error) throw new Error(rm.error.message)
      unwrap(await db().from('progress_photos').delete().eq('id', p.id))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['photos'] }),
  })
}

/** Reduz e converte a foto para JPEG antes de enviar (menos espaço, sem metadados de localização). */
export async function compressPhoto(file: File, max = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Não foi possível processar a imagem.')
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Falha ao converter a imagem.'))),
      'image/jpeg',
      0.85,
    ),
  )
}

// Uso da IA ----------------------------------------------------------------------------------------

export function useAiUsageToday() {
  return useQuery({
    queryKey: ['ai_usage', 'today'],
    queryFn: async () => {
      const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(
        new Date(),
      )
      const rows = unwrap<Array<{ cost_usd: number }>>(
        await db().from('ai_usage').select('cost_usd').gte('created_at', `${day}T00:00:00-03:00`),
      )
      return { count: rows.length, cost: rows.reduce((s, r) => s + Number(r.cost_usd), 0) }
    },
  })
}

export function useAiUsageMonth() {
  return useQuery({
    queryKey: ['ai_usage', 'month'],
    queryFn: async () => {
      const now = new Date()
      const first = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01T00:00:00-03:00`
      const rows = unwrap<Array<{ cost_usd: number }>>(
        await db().from('ai_usage').select('cost_usd').gte('created_at', first),
      )
      return { count: rows.length, cost: rows.reduce((s, r) => s + Number(r.cost_usd), 0) }
    },
  })
}
