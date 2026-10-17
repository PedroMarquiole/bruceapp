import { describe, expect, it } from 'vitest'
import { authErrorMessage } from './errors'

function err(message: string, status?: number) {
  return Object.assign(new Error(message), status ? { status } : {})
}

describe('authErrorMessage', () => {
  it('e-mail fora da lista de acesso', () => {
    expect(authErrorMessage(err('Database error saving new user', 500), 'enviar')).toBe(
      'Este e-mail não tem acesso ao Bruceapp.',
    )
  })

  it('código errado ou vencido', () => {
    expect(authErrorMessage(err('Token has expired or is invalid', 403), 'verificar')).toMatch(
      /Código inválido ou expirado/,
    )
  })

  it('limite de tentativas', () => {
    expect(authErrorMessage(err('email rate limit exceeded', 429), 'enviar')).toMatch(
      /Muitas tentativas/,
    )
  })

  it('sem internet', () => {
    expect(authErrorMessage(new TypeError('Failed to fetch'), 'verificar')).toMatch(/Sem conexão/)
  })

  it('erro desconhecido tem mensagem genérica por etapa', () => {
    expect(authErrorMessage(err('boom'), 'enviar')).toMatch(/enviar o código/)
    expect(authErrorMessage(err('boom'), 'verificar')).toMatch(/Não foi possível entrar/)
  })
})
