import { useState } from 'react'
import { resetDemo } from './demoSupabase'

/** Faixa fixa da versão de teste: deixa claro que os dados são de exemplo e permite recomeçar. */
export function DemoBanner() {
  const [confirming, setConfirming] = useState(false)
  return (
    <div
      role="note"
      className="sticky top-0 z-50 flex items-center gap-3 border-b border-signal/40 bg-graphite px-4 py-2 text-small text-ink safe-top"
    >
      <span className="min-w-0 flex-1">
        <strong className="font-semibold text-signal">Versão de teste.</strong> Dados de exemplo,
        salvos só neste navegador. IA, código de barras e notificações ficam desligados.
      </span>
      {confirming ? (
        <button
          type="button"
          className="min-h-11 shrink-0 rounded-[var(--radius-control)] px-3 font-medium text-danger hover:bg-graphite-raised"
          onClick={() => {
            resetDemo()
            window.location.reload()
          }}
        >
          Confirmar
        </button>
      ) : (
        <button
          type="button"
          className="min-h-11 shrink-0 rounded-[var(--radius-control)] px-3 font-medium text-ink-muted hover:bg-graphite-raised hover:text-ink"
          onClick={() => setConfirming(true)}
        >
          Recomeçar
        </button>
      )}
    </div>
  )
}
