import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '../../ui/Button'
import { TextField } from '../../ui/Form'

/**
 * Lê código de barras pela câmera traseira (ZXing). Sempre oferece digitação manual,
 * porque câmera pode estar bloqueada ou indisponível.
 */
export function BarcodeScanner({
  onCode,
  busy,
}: {
  onCode: (code: string) => void
  busy: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [camError, setCamError] = useState<string | null>(null)
  const [manual, setManual] = useState('')
  const [manualError, setManualError] = useState<string | null>(null)
  const firedRef = useRef(false)

  useEffect(() => {
    let stop: (() => void) | undefined
    let cancelled = false
    async function startCam() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamError('Este navegador não dá acesso à câmera. Digite o código abaixo.')
        return
      }
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        const reader = new BrowserMultiFormatReader()
        if (cancelled || !videoRef.current) return
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } }, audio: false },
          videoRef.current,
          (result) => {
            const text = result?.getText()
            if (text && /^[0-9]{6,14}$/.test(text) && !firedRef.current) {
              firedRef.current = true
              navigator.vibrate?.(80)
              onCode(text)
            }
          },
        )
        stop = () => controls.stop()
        if (cancelled) stop()
      } catch (e) {
        const name = e instanceof Error ? e.name : ''
        setCamError(
          name === 'NotAllowedError'
            ? 'Acesso à câmera negado. Libere nas configurações do navegador ou digite o código.'
            : 'Não foi possível abrir a câmera. Digite o código abaixo.',
        )
      }
    }
    void startCam()
    return () => {
      cancelled = true
      stop?.()
    }
  }, [onCode])

  function submit(e: FormEvent) {
    e.preventDefault()
    const code = manual.replace(/\D/g, '')
    if (!/^[0-9]{6,14}$/.test(code)) return setManualError('O código tem de 6 a 14 dígitos.')
    setManualError(null)
    onCode(code)
  }

  return (
    <div className="space-y-5">
      {camError ? (
        <p className="text-ink-muted">{camError}</p>
      ) : (
        <div className="relative overflow-hidden rounded-[var(--radius-panel)] border border-line bg-graphite">
          <video ref={videoRef} muted playsInline className="aspect-[4/3] w-full object-cover" />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-signal/80"
          />
          <p className="absolute inset-x-0 bottom-0 bg-obsidian/70 px-4 py-2 text-small text-ink-muted">
            Aponte para o código de barras da embalagem.
          </p>
        </div>
      )}
      <form noValidate onSubmit={submit} className="flex items-end gap-3">
        <div className="flex-1">
          <TextField
            label="Ou digite o código"
            inputMode="numeric"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            error={manualError}
          />
        </div>
        <Button type="submit" variant="secondary" busy={busy}>
          Buscar
        </Button>
      </form>
    </div>
  )
}
