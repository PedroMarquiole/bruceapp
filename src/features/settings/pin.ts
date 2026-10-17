/**
 * PIN local: bloqueia a abertura do app neste aparelho. Guarda só o hash (PBKDF2-SHA256 com sal),
 * nunca o PIN. Não substitui o login; esquecer o PIN = sair e entrar de novo pelo e-mail.
 */
const KEY = 'bruce.pin'
const UNLOCK = 'bruce.unlocked-at'
const FAILS = 'bruce.pin-fails'
const ITERATIONS = 150_000
export const RELOCK_MS = 5 * 60_000

type Stored = { salt: string; hash: string }

const CORRUPT: Stored = { salt: '', hash: '' }

/** null = sem PIN. Valor ilegível conta como PIN que nunca confere (não destrava sozinho). */
function read(): Stored | null {
  let raw: string | null
  try {
    raw = localStorage.getItem(KEY)
  } catch {
    return null
  }
  if (!raw) return null
  try {
    const v = JSON.parse(raw) as Partial<Stored>
    return typeof v.salt === 'string' && typeof v.hash === 'string' && v.salt && v.hash
      ? { salt: v.salt, hash: v.hash }
      : CORRUPT
  } catch {
    return CORRUPT
  }
}

const b64 = (bytes: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(bytes)))

export async function hashPin(pin: string, saltB64: string): Promise<string> {
  const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0))
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS },
    key,
    256,
  )
  return b64(bits)
}

export const isValidPin = (pin: string) => /^\d{4,6}$/.test(pin)

export function hasPin(): boolean {
  return read() !== null
}

export async function setPin(pin: string): Promise<void> {
  if (!isValidPin(pin)) throw new Error('O PIN tem de 4 a 6 dígitos.')
  const salt = b64(crypto.getRandomValues(new Uint8Array(16)))
  const hash = await hashPin(pin, salt)
  localStorage.setItem(KEY, JSON.stringify({ salt, hash }))
  markUnlocked()
}

export async function verifyPin(pin: string): Promise<boolean> {
  const s = read()
  if (!s) return true
  if (s === CORRUPT || !isValidPin(pin)) return false
  return (await hashPin(pin, s.salt)) === s.hash
}

/** Espera crescente depois de erros seguidos: 0, 0, 0, 2 s, 4 s, 8 s… até 60 s. */
export function failureDelayMs(failures: number): number {
  return failures < 3 ? 0 : Math.min(60_000, 1000 * 2 ** (failures - 2))
}

export function failures(): number {
  try {
    return Number(localStorage.getItem(FAILS) ?? 0) || 0
  } catch {
    return 0
  }
}

export function setFailures(n: number): void {
  try {
    if (n > 0) localStorage.setItem(FAILS, String(n))
    else localStorage.removeItem(FAILS)
  } catch {
    /* ignora */
  }
}

export function clearPin(): void {
  try {
    localStorage.removeItem(FAILS)
    localStorage.removeItem(KEY)
    sessionStorage.removeItem(UNLOCK)
  } catch {
    /* sem armazenamento: nada a limpar */
  }
}

export function markUnlocked(): void {
  try {
    sessionStorage.setItem(UNLOCK, String(Date.now()))
  } catch {
    /* ignora */
  }
}

/** Precisa desbloquear se há PIN e não houve desbloqueio recente nesta sessão. */
export function needsUnlock(now = Date.now()): boolean {
  if (!hasPin()) return false
  try {
    const at = Number(sessionStorage.getItem(UNLOCK) ?? 0)
    return !at || now - at > RELOCK_MS
  } catch {
    return true
  }
}
