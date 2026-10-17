import { useState } from 'react'
import { Link } from 'react-router'
import { ChevronRight, LogOut, Palette } from 'lucide-react'
import { Screen, Section } from '../ui/Screen'
import { Button } from '../ui/Button'
import { useAuth } from '../features/auth/auth-context'

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
      <Section title="Conta">
        <dl className="mt-3">
          <dt className="text-small text-ink-muted">E-mail de acesso</dt>
          <dd className="mt-0.5 break-all text-ink">{email ?? '—'}</dd>
        </dl>
        <p className="mt-4 max-w-prose text-small text-ink-muted">
          Metas, notificações, exportação e exclusão de dados chegam nas próximas etapas.
        </p>
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
      <Section title="Aparência">
        <Link
          to="/perfil/sistema"
          className="-mx-2 mt-2 flex min-h-12 items-center gap-4 rounded-[var(--radius-control)] px-2 hover:bg-graphite"
        >
          <Palette aria-hidden className="size-5 text-steel" />
          <span className="flex-1">
            <span className="block font-medium">Sistema visual</span>
            <span className="block text-small text-ink-muted">Cores, tipografia e componentes</span>
          </span>
          <ChevronRight aria-hidden className="size-5 text-ink-muted" />
        </Link>
      </Section>
    </Screen>
  )
}
