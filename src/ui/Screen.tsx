import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ChevronLeft, UserRound } from 'lucide-react'

type ScreenProps = {
  /** Título condensado da tela. Use `header` para um cabeçalho próprio. */
  title?: string
  header?: ReactNode
  backTo?: string
  children: ReactNode
}

export function Screen({ title, header, backTo, children }: ScreenProps) {
  return (
    <div className="mx-auto w-full max-w-xl px-5 safe-top">
      <div className="flex min-h-11 items-center justify-between">
        {backTo ? (
          <Link
            to={backTo}
            className="-ml-2 inline-flex min-h-11 items-center gap-1 pr-3 text-ink-muted hover:text-ink"
          >
            <ChevronLeft aria-hidden className="size-5" />
            Voltar
          </Link>
        ) : (
          <span />
        )}
        <Link
          to="/perfil"
          aria-label="Abrir perfil e configurações"
          className="grid size-11 place-items-center rounded-full border border-line bg-graphite text-steel hover:text-ink"
        >
          <UserRound aria-hidden className="size-5" />
        </Link>
      </div>
      <header className="pt-3 pb-6">
        {header ?? <h1 className="type-headline text-ink">{title}</h1>}
      </header>
      <main className="pb-32">{children}</main>
    </div>
  )
}

type SectionProps = {
  title: string
  children: ReactNode
  aside?: ReactNode
}

/** Seção de tela: título curto + fio fino. Agrupa por assunto, sem cartões. */
export function Section({ title, aside, children }: SectionProps) {
  const id = `sec-${title.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}`
  return (
    <section aria-labelledby={id} className="border-t border-line pt-4 pb-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={id} className="type-section text-ink">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  )
}
