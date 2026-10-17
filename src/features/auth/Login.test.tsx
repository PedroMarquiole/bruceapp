import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Login } from './Login'
import { WithAuth, fakeAuth } from '../../test/auth'

function setup() {
  const api = fakeAuth({ status: 'deslogado' })
  render(
    <WithAuth api={api}>
      <Login />
    </WithAuth>,
  )
  return { api, user: userEvent.setup() }
}

describe('Login', () => {
  it('recusa e-mail inválido sem chamar o servidor', async () => {
    const { api, user } = setup()
    await user.type(screen.getByLabelText('E-mail'), 'nao-e-email')
    await user.click(screen.getByRole('button', { name: 'Enviar código' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Digite um e-mail válido.')
    expect(api.sendCode).not.toHaveBeenCalled()
  })

  it('envia o código, normaliza o e-mail e pede os 6 dígitos', async () => {
    const { api, user } = setup()
    await user.type(screen.getByLabelText('E-mail'), '  Eu@Teste.Invalid ')
    await user.click(screen.getByRole('button', { name: 'Enviar código' }))
    expect(api.sendCode).toHaveBeenCalledWith('eu@teste.invalid')
    expect(screen.getByText('eu@teste.invalid')).toBeInTheDocument()
    expect(screen.getByLabelText('Código')).toHaveFocus()
    expect(screen.getByRole('button', { name: /Reenviar em \d+ s/ })).toBeDisabled()
  })

  it('aceita só dígitos e verifica o código', async () => {
    const { api, user } = setup()
    await user.type(screen.getByLabelText('E-mail'), 'eu@teste.invalid')
    await user.click(screen.getByRole('button', { name: 'Enviar código' }))
    const campo = screen.getByLabelText('Código')
    await user.type(campo, '12a34-567')
    expect(campo).toHaveValue('123456')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(api.verifyCode).toHaveBeenCalledWith('eu@teste.invalid', '123456')
  })

  it('código incompleto mostra erro sem chamar o servidor', async () => {
    const { api, user } = setup()
    await user.type(screen.getByLabelText('E-mail'), 'eu@teste.invalid')
    await user.click(screen.getByRole('button', { name: 'Enviar código' }))
    await user.type(screen.getByLabelText('Código'), '123')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(screen.getByRole('alert')).toHaveTextContent('O código tem 6 dígitos.')
    expect(api.verifyCode).not.toHaveBeenCalled()
  })

  it('mostra quando o e-mail não tem acesso', async () => {
    const { api, user } = setup()
    vi.mocked(api.sendCode).mockRejectedValueOnce(
      Object.assign(new Error('Database error saving new user'), { status: 500 }),
    )
    await user.type(screen.getByLabelText('E-mail'), 'outro@teste.invalid')
    await user.click(screen.getByRole('button', { name: 'Enviar código' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Este e-mail não tem acesso ao Bruceapp.')
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
  })

  it('volta para trocar o e-mail', async () => {
    const { user } = setup()
    await user.type(screen.getByLabelText('E-mail'), 'eu@teste.invalid')
    await user.click(screen.getByRole('button', { name: 'Enviar código' }))
    await user.click(screen.getByRole('button', { name: 'Usar outro e-mail' }))
    expect(screen.getByLabelText('E-mail')).toHaveValue('eu@teste.invalid')
  })
})
