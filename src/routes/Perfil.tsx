import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ChevronRight, LogOut, Palette, Trophy } from 'lucide-react'
import { Screen, Section } from '../ui/Screen'
import { Button } from '../ui/Button'
import { useAuth } from '../features/auth/auth-context'
import {
  AiUsageSection,
  DataSection,
  GoalsSection,
  NutritionSection,
  PersonalSection,
  PinSection,
  RemindersSection,
} from '../features/settings/Sections'

function LinkRow({
  to,
  icon,
  title,
  hint,
}: {
  to: string
  icon: ReactNode
  title: string
  hint: string
}) {
  return (
    <Link
      to={to}
      className="-mx-2 mt-2 flex min-h-12 items-center gap-4 rounded-[var(--radius-control)] px-2 hover:bg-graphite"
    >
      {icon}
      <span className="flex-1">
        <span className="block font-medium">{title}</span>
        <span className="block text-small text-ink-muted">{hint}</span>
      </span>
      <ChevronRight aria-hidden className="size-5 text-ink-muted" />
    </Link>
  )
}

export function Perfil() {
  const { state, signOut } = useAuth()
  const [leaving, setLeaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const email = state.status === 'logado' ? state.session.user.email : undefined

  async function onSignOut() {
    setLeaving(true)
    setError(null)
    try {
      await signOut()
    } catch {
      setError('Não foi possível sair agora. Confira a internet e tente de novo.')
      setLeaving(false)
    }
  }

  return (
    <Screen title="Perfil" backTo="/">
      <PersonalSection />
      <GoalsSection />
      <NutritionSection />
      <RemindersSection />
      <Section title="Progresso">
        <LinkRow
          to="/missoes"
          icon={<Trophy aria-hidden className="size-5 text-steel" />}
          title="Missões e conquistas"
          hint="Nível, pontos e extrato"
        />
      </Section>
      <AiUsageSection />
      <PinSection />
      <DataSection />
      <Section title="Sobre">
        <ul className="mt-2 max-w-prose space-y-2 text-small text-ink-muted">
          <li>
            O Bruceapp não substitui médico, nutricionista ou educador físico. Estimativas de foto e
            de 1RM são aproximadas; corrija quando souber o valor real.
          </li>
          <li>
            Dados de alimentos por código de barras: Open Food Facts, sob a licença ODbL (
            <a
              className="underline hover:text-ink"
              href="https://world.openfoodfacts.org"
              target="_blank"
              rel="noreferrer"
            >
              openfoodfacts.org
            </a>
            ).
          </li>
          <li>Sentiu dor, tontura ou mal-estar? Pare o treino e procure um profissional.</li>
        </ul>
        <LinkRow
          to="/perfil/sistema"
          icon={<Palette aria-hidden className="size-5 text-steel" />}
          title="Sistema visual"
          hint="Cores, tipografia e componentes"
        />
      </Section>
      <Section title="Conta">
        <dl className="mt-3">
          <dt className="text-small text-ink-muted">E-mail de acesso</dt>
          <dd className="mt-0.5 break-all text-ink">{email ?? '—'}</dd>
        </dl>
        <Button
          variant="secondary"
          className="mt-5"
          icon={<LogOut aria-hidden className="size-4" />}
          busy={leaving}
          onClick={onSignOut}
        >
          Sair
        </Button>
        {error ? (
          <p role="alert" className="mt-3 text-small text-danger">
            {error}
          </p>
        ) : null}
      </Section>
    </Screen>
  )
}
