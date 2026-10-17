import { consistencyGrid } from '../lib/date'

const WEEKS = 12

/**
 * Grade das últimas 12 semanas (colunas) por dia da semana (linhas).
 * Dia preenchido = treino finalizado ou todos os hábitos programados cumpridos.
 */
export function Consistency({
  today,
  active = new Set<string>(),
}: {
  today: Date
  active?: ReadonlySet<string>
}) {
  const grid = consistencyGrid(today, WEEKS)
  const total = grid.flat().filter((d) => active.has(d.key)).length
  return (
    <figure className="mt-4">
      <div
        role="img"
        aria-label={`Últimas ${WEEKS} semanas: ${total} ${total === 1 ? 'dia ativo' : 'dias ativos'}`}
        className="grid w-fit grid-flow-col grid-cols-[repeat(12,1.125rem)] grid-rows-[repeat(7,1.125rem)] gap-[5px]"
      >
        {grid.flat().map((d) => (
          <span
            key={d.key}
            title={d.key}
            className={`rounded-[4px] border ${
              active.has(d.key)
                ? `border-transparent bg-steel ${d.isToday ? 'outline-2 outline-offset-1 outline-signal' : ''}`
                : d.isToday
                  ? 'border-2 border-signal'
                  : d.isFuture
                    ? 'border-dashed border-line/60'
                    : 'border-line'
            }`}
          />
        ))}
      </div>
      <figcaption className="mt-3 text-small text-ink-muted">
        {total} {total === 1 ? 'dia ativo' : 'dias ativos'} nas últimas {WEEKS} semanas (treino
        finalizado ou hábitos do dia cumpridos). Segunda no alto; hoje marcado em amarelo. Descanso
        não conta contra você.
      </figcaption>
    </figure>
  )
}
