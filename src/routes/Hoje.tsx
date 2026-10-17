import { Screen } from '../ui/Screen'
import { DayRule } from '../ui/DayRule'
import { Readouts } from '../ui/Readouts'
import { dayAndMonth, weekdayTitle } from '../lib/date'
import { useNow } from '../lib/useNow'

export function Hoje({ now: fixedNow }: { now?: Date }) {
  const liveNow = useNow()
  const now = fixedNow ?? liveNow

  return (
    <Screen
      header={
        <div>
          <h1 className="type-monument reveal-monument text-ink">{weekdayTitle(now)}</h1>
          <p className="mt-2 text-lead text-steel">{dayAndMonth(now)}</p>
        </div>
      }
    >
      <DayRule now={now} />

      <div className="mt-6">
        <Readouts
          items={[
            { label: 'Treino previsto', value: 'Nenhum' },
            { label: 'Refeições', value: '0' },
            { label: 'Hábitos', value: '0' },
          ]}
        />
        <p className="mt-4 max-w-prose text-ink-muted">
          Nada registrado ainda. Estes indicadores se preenchem sozinhos conforme você cria planos,
          registra refeições e marca hábitos.
        </p>
      </div>
    </Screen>
  )
}
