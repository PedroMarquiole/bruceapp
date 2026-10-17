import { useEffect, useState } from 'react'
import { Button } from '../../ui/Button'

/** Contagem regressiva de descanso. Vibra (quando o aparelho permite) ao terminar. */
export function RestTimer({ endsAt, onDone }: { endsAt: number; onDone: () => void }) {
  const [now, setNow] = useState(() => Date.now())
  const remaining = Math.max(0, Math.round((endsAt - now) / 1000))

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (remaining > 0) return
    if ('vibrate' in navigator) navigator.vibrate?.([200, 100, 200])
    onDone()
  }, [remaining, onDone])

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')

  return (
    <div
      role="timer"
      aria-live="off"
      aria-label={`Descanso: ${remaining} segundos restantes`}
      className="sticky top-0 z-10 -mx-5 mb-4 flex items-center justify-between gap-4 border-b border-line bg-obsidian/95 px-5 py-3 backdrop-blur safe-top"
    >
      <span className="text-ink-muted">Descanso</span>
      <span className="text-[2rem] leading-none font-extrabold text-signal tabular-nums [font-stretch:70%]">
        {mm}:{ss}
      </span>
      <Button variant="secondary" onClick={onDone}>
        Pular
      </Button>
    </div>
  )
}
