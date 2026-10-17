import { Link } from 'react-router'
import { ChevronRight, KeyRound, Palette } from 'lucide-react'
import { Screen, Section } from '../ui/Screen'
import { EmptyState } from '../ui/States'

export function Perfil() {
  return (
    <Screen title="Perfil" backTo="/">
      <Section title="Conta">
        <EmptyState icon={<KeyRound className="size-5" />} title="Login ainda não configurado">
          Na próxima etapa você entra com um código enviado ao seu e-mail. Metas, notificações,
          exportação e exclusão de dados ficam aqui.
        </EmptyState>
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
