import { Trophy } from 'lucide-react'
import { Screen, Section } from '../ui/Screen'
import { EmptyState } from '../ui/States'
import { ChartFrame } from '../ui/ChartFrame'
import { Consistency } from '../ui/Consistency'
import { useNow } from '../lib/useNow'

export function Evolucao() {
  const now = useNow()
  return (
    <Screen title="Evolução">
      <Section title="Peso">
        <ChartFrame today={now} emptyText="Sem registros de peso" />
      </Section>
      <Section title="Consistência">
        <Consistency today={now} />
      </Section>
      <Section title="Recordes">
        <EmptyState icon={<Trophy className="size-5" />} title="Nenhum recorde ainda">
          Seus melhores levantamentos são calculados a partir dos treinos finalizados.
        </EmptyState>
      </Section>
    </Screen>
  )
}
