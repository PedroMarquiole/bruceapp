import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { db, unwrap, type Goal, type Profile } from '../../lib/db'

export const profileKey = ['profile'] as const

export function useProfile() {
  return useQuery({
    queryKey: profileKey,
    queryFn: async () => unwrap<Profile>(await db().from('profiles').select('*').single()),
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<Omit<Profile, 'id'>>) => {
      const { data: auth } = await db().auth.getUser()
      if (!auth.user) throw new Error('Sessão expirada')
      return unwrap<Profile>(
        await db().from('profiles').update(patch).eq('id', auth.user.id).select('*').single(),
      )
    },
    onSuccess: (p) => qc.setQueryData(profileKey, p),
  })
}

export function useGoals() {
  return useQuery({
    queryKey: ['goals'],
    queryFn: async () =>
      unwrap<Goal[]>(
        await db().from('goals').select('*').neq('status', 'arquivada').order('created_at'),
      ),
  })
}

export function useSaveGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (g: Partial<Goal> & Pick<Goal, 'kind' | 'title'>) => {
      const { id, ...rest } = g
      const q = id ? db().from('goals').update(rest).eq('id', id) : db().from('goals').insert(rest)
      return unwrap<Goal>(await q.select('*').single())
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}
