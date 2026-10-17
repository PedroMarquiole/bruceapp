import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Lock } from 'lucide-react'
import { Button } from '../../ui/Button'
import { inputClass } from '../../ui/Form'
import { useAuth } from '../auth/auth-context'
import { clearPin, markUnlocked, needsUnlock, verifyPin } from './pin'

/** Pede o PIN local ao abrir o app (e depois de 5 min em segundo plano). */
export function PinLock({ children }: { children: ReactNode }) {
  const { signOut } = useAuth()
  const [locked, setLocked] = useState(() => needsUnlock())
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let hiddenAt = 0
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now()
        markUnlocked()
      } else if (hiddenAt && needsUnlock()) {
        setLocked(true)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  if (!locked) return <>{children}</>

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    const ok = await verifyPin(pin)
    setBusy(false)
    setPin('')
    if (ok) {
      markUnlocked()
      setError(null)
      setLocked(false)
    } else {
      setError('PIN incorreto.')
    }
  }

  async function onForgot() {
    clearPin()
    await signOut()
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 safe-top">
      <Lock aria-hidden className="size-6 text-signal" />
      <h1 className="mt-4 type-headline">Bruceapp bloqueado</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label htmlFor="pin" className="block font-medium">
          PIN
        </label>
        <input
          id="pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'pin-error' : undefined}
          className={`${inputClass} h-12 tracking-[0.4em]`}
        />
        {error ? (
          <p id="pin-error" role="alert" className="text-small text-danger">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" busy={busy} disabled={pin.length < 4}>
          Desbloquear
        </Button>
      </form>
      <Button variant="quiet" className="mt-6" onClick={onForgot}>
        Esqueci o PIN: sair e entrar pelo e-mail
      </Button>
    </main>
  )
}
