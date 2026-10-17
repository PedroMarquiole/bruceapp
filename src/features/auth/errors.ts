/** Traduz erros do Supabase Auth para mensagens que dizem o que fazer. */
export function authErrorMessage(error: unknown, step: 'enviar' | 'verificar'): string {
  const raw = error instanceof Error ? error.message : String(error ?? '')
  const status =
    typeof error === 'object' && error !== null && 'status' in error
      ? Number((error as { status: unknown }).status)
      : undefined
  const msg = raw.toLowerCase()

  if (msg.includes('failed to fetch') || msg.includes('network')) {
    return 'Sem conexão com o servidor. Confira a internet e tente de novo.'
  }
  if (status === 429 || msg.includes('rate limit') || msg.includes('only request this after')) {
    return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.'
  }
  if (step === 'enviar' && (msg.includes('database error') || msg.includes('não autorizado'))) {
    return 'Este e-mail não tem acesso ao Bruceapp.'
  }
  if (step === 'verificar' && (msg.includes('expired') || msg.includes('invalid'))) {
    return 'Código inválido ou expirado. Confira os 6 dígitos ou peça um novo.'
  }
  return step === 'enviar'
    ? 'Não foi possível enviar o código. Tente de novo em instantes.'
    : 'Não foi possível entrar. Tente de novo em instantes.'
}
