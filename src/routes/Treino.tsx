import { Repeat2 } from 'lucide-react'
import { Screen, Section } from '../ui/Screen'
import { EmptyState } from '../ui/States'
import { WeekStrip } from '../ui/WeekStrip'
import { useNow } from '../lib/useNow'

export function Treino() {
  const now = useNow()
  return (
    <Screen title="Treino">
      <Section title="Esta semana">
        <WeekStrip today={now} />
        <p className="mt-4 max-w-prose text-ink-muted">
          Nenhum plano criado. Quando você montar um, os dias de treino aparecem preenchidos aqui.
        </p>
      </Section>
      <Section title="Histórico">
        <EmptyState icon={<Repeat2 className="size-5" />} title="Nenhuma sessão registrada">
          Cada treino finalizado fica guardado como foi feito, mesmo que o plano mude depois.
        </EmptyState>
      </Section>
    </Screen>
  )
}
