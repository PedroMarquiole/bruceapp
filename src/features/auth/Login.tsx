import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { z } from 'zod'
import { Button } from '../../ui/Button'
import { useAuth } from './auth-context'
import { authErrorMessage } from './errors'

const EmailSchema = z.email('Digite um e-mail válido.')
const CodeSchema = z.string().regex(/^\d{6}$/, 'O código tem 6 dígitos.')
const RESEND_SECONDS = 60

type Step = { kind: 'email' } | { kind: 'codigo'; email: string }

const inputClass =
  'block w-full rounded-[var(--radius-control)] border border-line bg-graphite px-4 text-ink placeholder:text-ink-muted/70 outline-none transition-colors focus:border-signal aria-[invalid=true]:border-danger'

function BrandMark() {
  return (
    <svg aria-hidden viewBox="0 0 512 512" className="size-12">
      <rect width="512" height="512" rx="112" fill="var(--color-graphite)" />
      <g fill="var(--color-signal)">
        <rect x="148" y="116" width="64" height="280" rx="10" />
        <path d="M232 116h86a63 63 0 0 1 0 126h-86z" />
        <path d="M232 262h100a67 67 0 0 1 0 134H232z" />
      </g>
    </svg>
  )
}

export function Login() {
  const { sendCode, verifyCode } = useAuth()
  const [step, setStep] = useState<Step>({ kind: 'email' })
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const emailId = useId()
  const codeId = useId()
  const errorId = useId()
  const codeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => window.clearTimeout(t)
  }, [cooldown])

  useEffect(() => {
    if (step.kind === 'codigo') codeRef.current?.focus()
  }, [step])

  async function requestCode(target: string) {
    setBusy(true)
    setError(null)
    try {
      await sendCode(target)
      setStep({ kind: 'codigo', email: target })
      setCode('')
      setCooldown(RESEND_SECONDS)
    } catch (e) {
      setError(authErrorMessage(e, 'enviar'))
    } finally {
      setBusy(false)
    }
  }

  async function onEmailSubmit(e: FormEvent) {
    e.preventDefault()
    const parsed = EmailSchema.safeParse(email.trim().toLowerCase())
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'E-mail inválido.')
      return
    }
    await requestCode(parsed.data)
  }

  async function onCodeSubmit(e: FormEvent) {
    e.preventDefault()
    if (step.kind !== 'codigo') return
    const parsed = CodeSchema.safeParse(code)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Código inválido.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await verifyCode(step.email, parsed.data)
      // O AuthProvider troca a tela ao receber a sessão.
    } catch (err) {
      setError(authErrorMessage(err, 'verificar'))
      setBusy(false)
    }
  }

  const errorNode = error ? (
    <p id={errorId} role="alert" className="mt-3 text-small text-danger">
      {error}
    </p>
  ) : null

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 safe-top">
      <main className="flex flex-1 flex-col justify-center pb-16">
        <BrandMark />
        <h1 className="type-headline mt-8">Entrar</h1>

        {step.kind === 'email' ? (
          <form noValidate onSubmit={onEmailSubmit} className="mt-6">
            <p className="max-w-prose text-ink-muted">
              Vamos enviar um código de 6 dígitos para o seu e-mail. Sem senha.
            </p>
            <label htmlFor={emailId} className="mt-8 block font-medium">
              E-mail
            </label>
            <input
              id={emailId}
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              className={`${inputClass} mt-2 h-12 text-body`}
            />
            {errorNode}
            <Button type="submit" busy={busy} className="mt-6 w-full">
              Enviar código
            </Button>
          </form>
        ) : (
          <form noValidate onSubmit={onCodeSubmit} className="mt-6">
            <p className="max-w-prose text-ink-muted">
              Digite o código enviado para <span className="text-ink">{step.email}</span>.
            </p>
            <label htmlFor={codeId} className="mt-8 block font-medium">
              Código
            </label>
            <input
              ref={codeRef}
              id={codeId}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              className={`${inputClass} mt-2 h-16 text-center text-[2rem] font-extrabold tracking-[0.4em] tabular-nums [font-stretch:75%]`}
            />
            {errorNode}
            <Button type="submit" busy={busy} className="mt-6 w-full">
              Entrar
            </Button>
            <div className="mt-4 flex items-center justify-between gap-3">
              <Button
                variant="quiet"
                className="-ml-4"
                onClick={() => {
                  setStep({ kind: 'email' })
                  setError(null)
                }}
              >
                Usar outro e-mail
              </Button>
              <Button
                variant="quiet"
                className="-mr-4 tabular-nums"
                disabled={cooldown > 0 || busy}
                onClick={() => requestCode(step.email)}
              >
                {cooldown > 0 ? `Reenviar em ${cooldown} s` : 'Reenviar código'}
              </Button>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}
