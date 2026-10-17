import { Lock, Trophy } from 'lucide-react'
import { Screen, Section } from '../ui/Screen'
import { ErrorState, LoadingRows } from '../ui/States'
import { useNow } from '../lib/useNow'
import { parseDayKey, shortDate } from '../lib/date'
import { useProgress } from '../features/gamification/useProgress'
import { MissionList } from '../features/gamification/MissionList'
import { POINT_RULES } from '../features/gamification/domain/rules'
import { fmt } from '../features/nutrition/domain/nutrients'

const RULE_LABEL = Object.fromEntries(POINT_RULES.map((r) => [r.rule, r.label]))

export function Missoes() {
  const now = useNow()
  const p = useProgress(now)

  return (
    <Screen title="Missões" backTo="/">
      {p.error ? (
        <ErrorState title="Não foi possível carregar os pontos" onRetry={p.refetch}>
          Confira a internet e tente de novo.
        </ErrorState>
      ) : !p.ready ? (
        <LoadingRows label="Carregando progresso" />
      ) : (
        <>
          <div className="pb-6">
            <p className="text-small text-ink-muted">Nível</p>
            <p className="type-headline text-ink tabular-nums">{p.level.level}</p>
            <div
              role="progressbar"
              aria-label="Progresso para o próximo nível"
              aria-valuemin={p.level.start}
              aria-valuemax={p.level.next}
              aria-valuenow={p.points}
              className="mt-4 h-1.5 overflow-hidden rounded-full bg-line"
            >
              <div
                className="h-full rounded-full bg-signal"
                style={{ width: `${p.level.progress * 100}%` }}
              />
            </div>
            <p className="mt-2 text-small text-ink-muted tabular-nums">
              {fmt(p.points, 0)} pontos. Faltam {fmt(p.level.toNext, 0)} para o nível{' '}
              {p.level.level + 1}.
            </p>
          </div>

          <Section title="Hoje">
            <MissionList missions={p.daily} />
          </Section>
          <Section title="Esta semana">
            <MissionList missions={p.weekly} />
          </Section>

          <Section title="Conquistas">
            <ul className="mt-2 grid grid-cols-2 gap-2">
              {p.achievements.map((a) => (
                <li
                  key={a.id}
                  className={`rounded-[var(--radius-control)] border p-3 ${a.unlocked ? 'border-steel/60' : 'border-dashed border-line'}`}
                >
                  <span
                    className={`flex items-center gap-1.5 font-semibold ${a.unlocked ? 'text-ink' : 'text-ink-muted'}`}
                  >
                    {a.unlocked ? (
                      <Trophy aria-hidden className="size-4 text-signal" />
                    ) : (
                      <Lock aria-hidden className="size-4" />
                    )}
                    {a.title}
                  </span>
                  <span className="mt-1 block text-small text-ink-muted">{a.description}</span>
                  {!a.unlocked ? (
                    <span className="mt-1 block text-micro text-ink-muted tabular-nums">
                      {fmt(a.progress, 0)} de {fmt(a.target, 0)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Como os pontos funcionam">
            <ul className="mt-2 space-y-1 text-small text-ink-muted">
              {POINT_RULES.map((r) => (
                <li key={r.rule} className="flex justify-between gap-4 tabular-nums">
                  <span>{r.label}</span>
                  <span className="text-ink">+{r.points}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-small text-ink-muted">
              Cada ação conta uma vez. Desfazer a ação retira os pontos dela; um dia perdido nunca
              tira pontos.
            </p>
          </Section>

          <Section title="Extrato">
            {p.ledger.length === 0 ? (
              <p className="mt-2 text-ink-muted">
                Nenhum ponto ainda. Marque um hábito ou finalize um treino.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-line">
                {p.ledger.slice(0, 30).map((r) => (
                  <li
                    key={r.id}
                    className="flex min-h-11 items-center justify-between gap-4 tabular-nums"
                  >
                    <span className="text-small">
                      {RULE_LABEL[r.rule] ?? r.rule}
                      <span className="text-ink-muted">, {shortDate(parseDayKey(r.day))}</span>
                    </span>
                    <span className="text-small text-ink">+{r.points}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </>
      )}
    </Screen>
  )
}
