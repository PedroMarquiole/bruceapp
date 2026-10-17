import { Screen, Section } from '../ui/Screen'

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

export function Bruce() {
  return (
    <Screen title="Bruce">
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
      <Section title="Estado">
        <p className="mt-3 flex items-center gap-3 text-ink-muted">
          <span aria-hidden className="size-2 shrink-0 rounded-full bg-steel/60" />O assistente
          ainda não está ligado. Ele é ativado na etapa de IA.
        </p>
      </Section>
    </Screen>
  )
}
