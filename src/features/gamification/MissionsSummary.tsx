import { Link } from 'react-router'
import { Section } from '../../ui/Screen'
import { fmt } from '../nutrition/domain/nutrients'
import { MissionList } from './MissionList'
import { useProgress } from './useProgress'

/** Resumo de missões do dia e nível, na tela Hoje. */
export function MissionsSummary({ now }: { now: Date }) {
  const p = useProgress(now)
  if (!p.ready) return null
  return (
    <Section
      title="Missões"
      aside={
        <Link
          to="/missoes"
          className="inline-flex min-h-11 items-center text-small text-ink-muted hover:text-ink"
        >
          Nível {p.level.level}, {fmt(p.points, 0)} pontos
        </Link>
      }
    >
      <MissionList missions={p.daily} />
    </Section>
  )
}
