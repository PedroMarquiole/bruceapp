import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { db, unwrap } from '../../lib/db'
import { callAssistant } from './client'

export type Proposal =
  | {
      type: 'criar_habito'
      name: string
      days_of_week: number[]
      target_per_day: number
      reason: string
    }
  | {
      type: 'meta_nutricional'
      kcal: number
      protein_g: number
      carbs_g: number
      fat_g: number
      reason: string
    }
  | {
      type: 'meta'
      title: string
      kind: 'peso' | 'forca' | 'habito' | 'nutricao' | 'outro'
      reason: string
    }

export type ChatMessage = {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  proposals: Proposal[]
  created_at: string
}

export type Conversation = { id: string; title: string; updated_at: string }

export function useConversations() {
  return useQuery({
    queryKey: ['ai', 'conversations'],
    queryFn: async () =>
      unwrap<Conversation[]>(
        await db()
          .from('ai_conversations')
          .select('id, title, updated_at')
          .order('updated_at', { ascending: false })
          .limit(20),
      ),
  })
}

export function useMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ['ai', 'messages', conversationId],
    enabled: Boolean(conversationId),
    queryFn: async () =>
      unwrap<ChatMessage[]>(
        await db()
          .from('ai_messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at'),
      ),
  })
}

export function useSendMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { message: string; conversationId: string | null }) =>
      callAssistant<{ conversation_id: string; reply: string; proposals: Proposal[] }>({
        intent: 'chat',
        message: v.message,
        ...(v.conversationId ? { conversation_id: v.conversationId } : {}),
      }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['ai'] })
      void qc.invalidateQueries({ queryKey: ['ai_usage'] })
    },
  })
}

export function useDeleteConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) =>
      unwrap(await db().from('ai_conversations').delete().eq('id', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai'] }),
  })
}
