import type { ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Button } from './Button'

type EmptyStateProps = {
  icon: ReactNode
  title: string
  children: ReactNode
  action?: ReactNode
}

/** Estado vazio: diz o que vai aparecer ali e, quando existir, como começar. */
export function EmptyState({ icon, title, children, action }: EmptyStateProps) {
  return (
    <div className="flex gap-4 py-4">
      <span aria-hidden className="mt-0.5 shrink-0 text-steel">
        {icon}
      </span>
      <div className="min-w-0 space-y-1">
        <p className="font-semibold text-ink">{title}</p>
        <p className="text-ink-muted">{children}</p>
        {action ? <div className="pt-3">{action}</div> : null}
      </div>
    </div>
  )
}

type ErrorStateProps = {
  title: string
  children: ReactNode
  onRetry?: () => void
  retrying?: boolean
}

/** Estado de erro: explica o que falhou e oferece a correção possível. */
export function ErrorState({ title, children, onRetry, retrying = false }: ErrorStateProps) {
  return (
    <div role="alert" className="flex gap-4 py-4">
      <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-danger" />
      <div className="min-w-0 space-y-1">
        <p className="font-semibold text-ink">{title}</p>
        <p className="text-ink-muted">{children}</p>
        {onRetry ? (
          <div className="pt-3">
            <Button variant="secondary" onClick={onRetry} busy={retrying}>
              Tentar de novo
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** Estado de carregamento: blocos com o formato do conteúdo que vai chegar. */
export function LoadingRows({ rows = 3, label }: { rows?: number; label: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3 py-4">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="skeleton size-10 shrink-0 rounded-[var(--radius-control)]" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3.5 w-3/5 rounded" />
            <div className="skeleton h-3 w-2/5 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}
