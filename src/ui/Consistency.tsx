import { consistencyGrid } from '../lib/date'

const WEEKS = 12

/** Grade das últimas 12 semanas (colunas) por dia da semana (linhas). Vazia até haver registros. */
export function Consistency({ today }: { today: Date }) {
  const grid = consistencyGrid(today, WEEKS)
  return (
    <figure className="mt-4">
      <div
        role="img"
        aria-label={`Grade das últimas ${WEEKS} semanas, ainda sem dias registrados`}
        className="grid w-fit grid-flow-col grid-cols-[repeat(12,1.125rem)] grid-rows-[repeat(7,1.125rem)] gap-[5px]"
      >
        {grid.flat().map((d) => (
          <span
            key={d.key}
            className={`rounded-[4px] border ${
              d.isToday
                ? 'border-2 border-signal'
                : d.isFuture
                  ? 'border-dashed border-line/60'
                  : 'border-line'
            }`}
          />
        ))}
      </div>
      <figcaption className="mt-3 text-small text-ink-muted">
        Últimas {WEEKS} semanas, de segunda (no alto) a domingo. Hoje está marcado. Descanso
        planejado não quebra a sequência.
      </figcaption>
    </figure>
  )
}
