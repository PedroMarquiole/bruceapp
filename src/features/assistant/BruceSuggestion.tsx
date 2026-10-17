import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Section } from '../../ui/Screen'
import { Button } from '../../ui/Button'
import { callAssistant } from './client'

/** Sugestão do dia, gerada só quando pedida (não gasta IA a cada abertura do app). */
export function BruceSuggestion() {
  const [text, setText] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function ask() {
    setBusy(true)
    setError(null)
    try {
      const r = await callAssistant<{ reply: string }>({ intent: 'sugestao_dia' })
      setText(r.reply)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível pedir a sugestão.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section title="Bruce">
      {text ? (
        <p className="mt-2 max-w-prose whitespace-pre-wrap text-ink">{text}</p>
      ) : (
        <p className="mt-2 text-ink-muted">
          Uma sugestão para hoje, com base nos seus registros recentes.
        </p>
      )}
      {error ? (
        <p role="alert" className="mt-2 text-small text-danger">
          {error}
        </p>
      ) : null}
      <Button
        variant="secondary"
        className="mt-3"
        icon={<Sparkles aria-hidden className="size-4" />}
        busy={busy}
        onClick={ask}
      >
        {text ? 'Pedir outra sugestão' : 'Pedir sugestão'}
      </Button>
    </Section>
  )
}
