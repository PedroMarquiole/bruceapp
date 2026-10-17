import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Check, MessageSquarePlus, Send, Sparkles, Trash2, X } from 'lucide-react'
import { Screen, Section } from '../ui/Screen'
import { Button } from '../ui/Button'
import { inputClass } from '../ui/Form'
import { LoadingRows } from '../ui/States'
import {
  useConversations,
  useDeleteConversation,
  useMessages,
  useSendMessage,
  type Proposal,
} from '../features/assistant/queries'
import { useSaveHabit } from '../features/habits/queries'
import { useSetNutritionTarget } from '../features/nutrition/queries'
import { useSaveGoal } from '../features/profile/queries'
import { useAiUsageToday } from '../features/progress/queries'
import { fmt } from '../features/nutrition/domain/nutrients'

const RULES = [
  {
    lead: 'Explica antes de sugerir.',
    text: 'Cada sugestão vem com o motivo e os registros que ele usou.',
  },
  {
    lead: 'Pergunta antes de salvar.',
    text: 'Nenhum plano ou registro muda sem a sua confirmação.',
  },
  {
    lead: 'Conhece os limites.',
    text: 'Não diagnostica nem prescreve, e indica um profissional quando o assunto é clínico.',
  },
] as const

const QUICK = [
  'Resuma a minha semana de treinos',
  'Como está a minha alimentação nos últimos dias?',
  'Sugira um ajuste realista para o meu plano de treino',
] as const

const DAYS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']

function describe(p: Proposal): { title: string; detail: string } {
  if (p.type === 'criar_habito')
    return {
      title: `Criar hábito: ${p.name}`,
      detail: `${p.days_of_week.map((d) => DAYS[d - 1]).join(', ')}${p.target_per_day > 1 ? `, ${p.target_per_day} vezes por dia` : ''}`,
    }
  if (p.type === 'meta_nutricional')
    return {
      title: 'Definir meta nutricional',
      detail: `${fmt(p.kcal, 0)} kcal, ${fmt(p.protein_g, 0)} g proteína, ${fmt(p.carbs_g, 0)} g carboidratos, ${fmt(p.fat_g, 0)} g gorduras`,
    }
  return { title: `Nova meta: ${p.title}`, detail: '' }
}

function ProposalCard({ p }: { p: Proposal }) {
  const saveHabit = useSaveHabit()
  const setTarget = useSetNutritionTarget()
  const saveGoal = useSaveGoal()
  const [state, setState] = useState<'aberta' | 'aceita' | 'descartada' | 'erro'>('aberta')
  const busy = saveHabit.isPending || setTarget.isPending || saveGoal.isPending
  const d = describe(p)

  function accept() {
    const opts = { onSuccess: () => setState('aceita'), onError: () => setState('erro') }
    if (p.type === 'criar_habito')
      saveHabit.mutate(
        {
          name: p.name,
          days_of_week: p.days_of_week,
          target_per_day: p.target_per_day,
          reminder_time: null,
        },
        opts,
      )
    else if (p.type === 'meta_nutricional')
      setTarget.mutate(
        { kcal: p.kcal, protein_g: p.protein_g, carbs_g: p.carbs_g, fat_g: p.fat_g },
        opts,
      )
    else saveGoal.mutate({ title: p.title, kind: p.kind }, opts)
  }

  return (
    <div className="mt-3 rounded-[var(--radius-control)] border border-line bg-graphite p-4">
      <p className="text-small text-ink-muted">Proposta</p>
      <p className="mt-1 font-semibold">{d.title}</p>
      {d.detail ? <p className="text-small text-ink-muted">{d.detail}</p> : null}
      <p className="mt-2 text-small text-ink-muted">Motivo: {p.reason}</p>
      {state === 'aberta' || state === 'erro' ? (
        <div className="mt-3 flex gap-2">
          <Button icon={<Check aria-hidden className="size-4" />} busy={busy} onClick={accept}>
            Aceitar
          </Button>
          <Button
            variant="quiet"
            icon={<X aria-hidden className="size-4" />}
            onClick={() => setState('descartada')}
          >
            Descartar
          </Button>
        </div>
      ) : (
        <p className={`mt-3 text-small ${state === 'aceita' ? 'text-ok' : 'text-ink-muted'}`}>
          {state === 'aceita' ? 'Aceita e salva.' : 'Descartada.'}
        </p>
      )}
      {state === 'erro' ? (
        <p className="mt-2 text-small text-danger">Não foi possível salvar. Tente de novo.</p>
      ) : null}
    </div>
  )
}

export function Bruce() {
  const conversations = useConversations()
  const usage = useAiUsageToday()
  const send = useSendMessage()
  const delConv = useDeleteConversation()
  const [current, setCurrent] = useState<string | null | undefined>(undefined)
  const [text, setText] = useState('')
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  // Abre a conversa mais recente por padrão.
  const activeId = current === undefined ? (conversations.data?.[0]?.id ?? null) : current
  const messages = useMessages(activeId)

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' })
  }, [messages.data?.length, pending])

  function submit(message: string) {
    const m = message.trim()
    if (!m || send.isPending) return
    setError(null)
    setPending(m)
    setText('')
    send.mutate(
      { message: m, conversationId: activeId },
      {
        onSuccess: (r) => setCurrent(r.conversation_id),
        onError: (e) => {
          setError(e.message)
          setText(m)
        },
        onSettled: () => setPending(null),
      },
    )
  }

  const list = messages.data ?? []

  return (
    <Screen title="Bruce">
      {list.length === 0 && !pending ? (
        <>
          <p className="max-w-prose pb-6 text-lead text-ink">
            Pergunte sobre os seus treinos, refeições e metas. As respostas partem só do que você
            registrou.
          </p>
          <Section title="Como ele trabalha">
            <ul className="mt-2 divide-y divide-line">
              {RULES.map((r) => (
                <li key={r.lead} className="py-3.5">
                  <p className="font-semibold text-ink">{r.lead}</p>
                  <p className="text-ink-muted">{r.text}</p>
                </li>
              ))}
            </ul>
          </Section>
        </>
      ) : (
        <div className="flex items-center justify-between gap-3 pb-4">
          <Button
            variant="secondary"
            icon={<MessageSquarePlus aria-hidden className="size-4" />}
            onClick={() => setCurrent(null)}
          >
            Nova conversa
          </Button>
          {activeId ? (
            <Button
              variant="quiet"
              className="-mr-4"
              icon={<Trash2 aria-hidden className="size-4" />}
              busy={delConv.isPending}
              onClick={() => delConv.mutate(activeId, { onSuccess: () => setCurrent(null) })}
            >
              Apagar conversa
            </Button>
          ) : null}
        </div>
      )}

      <div aria-live="polite" className="space-y-5">
        {messages.isPending && activeId ? (
          <LoadingRows label="Carregando conversa" rows={2} />
        ) : null}
        {list.map((m) =>
          m.role === 'user' ? (
            <p
              key={m.id}
              className="ml-10 rounded-[var(--radius-control)] bg-graphite px-4 py-3 whitespace-pre-wrap"
            >
              {m.content}
            </p>
          ) : (
            <div key={m.id} className="border-l-2 border-signal pl-4">
              <p className="max-w-prose whitespace-pre-wrap text-ink">{m.content}</p>
              {(m.proposals ?? []).map((p, i) => (
                <ProposalCard key={i} p={p} />
              ))}
            </div>
          ),
        )}
        {pending ? (
          <>
            <p className="ml-10 rounded-[var(--radius-control)] bg-graphite px-4 py-3 whitespace-pre-wrap">
              {pending}
            </p>
            <p className="flex items-center gap-2 text-ink-muted">
              <Sparkles aria-hidden className="size-4 animate-pulse text-signal" /> Bruce está
              analisando seus registros…
            </p>
          </>
        ) : null}
        <div ref={endRef} />
      </div>

      {list.length === 0 && !pending ? (
        <div className="mt-6 flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => submit(q)}
              className="min-h-11 rounded-[var(--radius-control)] border border-line px-4 text-left text-small text-ink-muted hover:border-steel hover:text-ink"
            >
              {q}
            </button>
          ))}
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-4 text-small text-danger">
          {error}
        </p>
      ) : null}

      <form
        className="mt-6 flex items-end gap-2"
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          submit(text)
        }}
      >
        <label className="flex-1">
          <span className="sr-only">Mensagem para o Bruce</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit(text)
              }
            }}
            rows={2}
            maxLength={2000}
            placeholder="Pergunte algo sobre os seus registros"
            className={`${inputClass} min-h-12 resize-none py-3`}
          />
        </label>
        <Button
          type="submit"
          aria-label="Enviar"
          busy={send.isPending}
          disabled={!text.trim()}
          icon={<Send aria-hidden className="size-4" />}
        />
      </form>
      <p className="mt-2 text-micro text-ink-muted tabular-nums">
        {usage.data ? `Hoje: ${usage.data.count} de 40 pedidos à IA. ` : ''}O assistente pode errar;
        confira antes de mudar algo importante.
      </p>
    </Screen>
  )
}
