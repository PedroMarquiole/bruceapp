import type { ReactNode } from 'react'
import { useAuth } from './auth-context'
import { Login } from './Login'

/** Mostra o app só com sessão válida; senão, a tela de entrada ou de configuração. */
export function AuthGate({ children }: { children: ReactNode }) {
  const { state } = useAuth()

  if (state.status === 'carregando') {
    return (
      <div role="status" className="grid min-h-dvh place-items-center">
        <span className="sr-only">Carregando sessão</span>
        <span aria-hidden className="h-0.5 w-12 animate-pulse rounded-full bg-signal" />
      </div>
    )
  }

  if (state.status === 'sem-config') {
    return (
      <main className="mx-auto max-w-md px-5 pt-24 safe-top">
        <h1 className="type-headline">Configuração ausente</h1>
        <p className="mt-4 text-ink-muted">
          O build foi feito sem as variáveis do Supabase. Defina{' '}
          {state.missing.map((m, i) => (
            <span key={m}>
              {i > 0 ? ' e ' : ''}
              <code className="text-ink">{m}</code>
            </span>
          ))}{' '}
          e gere o build de novo.
        </p>
      </main>
    )
  }

  if (state.status === 'deslogado') return <Login />

  return <>{children}</>
}
