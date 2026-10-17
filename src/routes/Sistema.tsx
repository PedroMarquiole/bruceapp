import { useEffect, useRef, useState } from 'react'
import { Check, Dumbbell } from 'lucide-react'
import { Screen, Section } from '../ui/Screen'
import { Button } from '../ui/Button'
import { EmptyState, ErrorState, LoadingRows } from '../ui/States'

const SWATCHES = [
  { name: 'Obsidian', token: 'bg-obsidian', hex: '#090A0D', role: 'Fundo' },
  { name: 'Graphite', token: 'bg-graphite', hex: '#17191F', role: 'Superfícies' },
  { name: 'Signal', token: 'bg-signal', hex: '#F2C94C', role: 'Ação e progresso' },
  { name: 'Steel', token: 'bg-steel', hex: '#A7ADB8', role: 'Ícones' },
  { name: 'Ink', token: 'bg-ink', hex: '#F5F6F8', role: 'Texto principal' },
  { name: 'Ink muted', token: 'bg-ink-muted', hex: '#8D95A3', role: 'Texto secundário' },
  { name: 'Danger', token: 'bg-danger', hex: '#EF7C6B', role: 'Erro' },
  { name: 'Ok', token: 'bg-ok', hex: '#7CC5A8', role: 'Sucesso' },
] as const

type DemoStatus = 'error' | 'loading' | 'done'

/** Vitrine dos tokens e estados, para conferir o visual no iPhone. */
export function Sistema() {
  const [status, setStatus] = useState<DemoStatus>('error')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const timers = useRef<number[]>([])

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((t) => window.clearTimeout(t))
  }, [])

  function later(fn: () => void, ms: number) {
    timers.current.push(window.setTimeout(fn, ms))
  }

  function retry() {
    setStatus('loading')
    later(() => setStatus('done'), 1200)
  }

  function save() {
    setSaving(true)
    setSaved(false)
    later(() => {
      setSaving(false)
      setSaved(true)
    }, 900)
  }

  return (
    <Screen title="Sistema visual" backTo="/perfil">
      <Section title="Cores">
        <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5">
          {SWATCHES.map((s) => (
            <li key={s.name} className="flex items-center gap-3">
              <span
                aria-hidden
                className={`size-10 shrink-0 rounded-[var(--radius-control)] border border-line ${s.token}`}
              />
              <span className="min-w-0">
                <span className="block text-small font-semibold">{s.name}</span>
                <span className="block text-small text-ink-muted">{s.role}</span>
                <span className="block text-small text-ink-muted tabular-nums">{s.hex}</span>
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Tipografia">
        <div className="mt-4 space-y-4">
          <p className="type-monument">Sexta</p>
          <p className="type-headline">Supino reto</p>
          <p className="type-section">Treino de hoje</p>
          <p className="max-w-prose">
            Corpo de texto em Archivo, largura normal. Números usam algarismos tabulares para
            alinhar cargas: 82,5 kg × 8.
          </p>
          <p className="text-small text-ink-muted">Texto secundário, para contexto e datas.</p>
        </div>
      </Section>

      <Section title="Botões">
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={save} busy={saving}>
            Salvar treino
          </Button>
          <Button variant="secondary">Editar plano</Button>
          <Button variant="quiet">Cancelar</Button>
          <Button variant="danger">Excluir</Button>
        </div>
        <p className="mt-3 min-h-6 text-small text-ok" aria-live="polite">
          {saved ? (
            <span className="inline-flex items-center gap-1.5">
              <Check aria-hidden className="size-4" /> Treino salvo
            </span>
          ) : null}
        </p>
      </Section>

      <Section title="Estados">
        {status === 'error' ? (
          <ErrorState title="Não foi possível carregar o histórico" onRetry={retry}>
            Sem conexão com o servidor. Confira a internet e tente de novo.
          </ErrorState>
        ) : null}
        {status === 'loading' ? <LoadingRows label="Carregando histórico" /> : null}
        {status === 'done' ? (
          <EmptyState icon={<Dumbbell className="size-5" />} title="Nenhuma sessão registrada">
            Este é o estado vazio que aparece depois de carregar sem dados.
          </EmptyState>
        ) : null}
      </Section>
    </Screen>
  )
}
