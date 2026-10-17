import { Screen, Section } from '../ui/Screen'

const MEALS = ['Café da manhã', 'Almoço', 'Lanche', 'Jantar'] as const

export function Nutricao() {
  return (
    <Screen title="Nutrição">
      <Section title="Diário de hoje">
        <ul className="mt-2 divide-y divide-line">
          {MEALS.map((meal) => (
            <li key={meal} className="flex min-h-14 items-center justify-between gap-4">
              <span className="text-ink">{meal}</span>
              <span className="text-ink-muted">
                <span aria-hidden>—</span>
                <span className="sr-only">nada registrado</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 max-w-prose text-ink-muted">
          Nenhuma refeição registrada. Busca de alimentos, código de barras e estimativa por foto
          chegam na etapa de alimentação; estimativas sempre aparecem marcadas e podem ser
          corrigidas antes de salvar.
        </p>
      </Section>
    </Screen>
  )
}
