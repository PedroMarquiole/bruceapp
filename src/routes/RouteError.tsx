import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { TabBar } from '../ui/TabBar'

export function RouteError() {
  const error = useRouteError()
  const notFound = isRouteErrorResponse(error) && error.status === 404

  return (
    <div className="mx-auto w-full max-w-xl px-5 safe-top">
      <main className="pt-16 pb-32">
        <h1 className="type-headline">{notFound ? 'Tela não encontrada' : 'Algo deu errado'}</h1>
        <p className="mt-4 max-w-prose text-ink-muted">
          {notFound
            ? 'O endereço aberto não corresponde a nenhuma tela do Bruceapp.'
            : 'Esta tela falhou ao abrir. Volte para Hoje e tente de novo; se repetir, recarregue o app.'}
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-signal px-4 font-semibold text-obsidian hover:bg-signal-press"
        >
          Ir para Hoje
        </Link>
      </main>
      <TabBar />
    </div>
  )
}
