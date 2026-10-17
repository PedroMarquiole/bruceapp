import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen } from '@testing-library/react'
import { renderRoute } from '../test/render'

describe('Sistema visual', () => {
  it('passa do erro para carregando e depois para vazio ao tentar de novo', async () => {
    renderRoute('/perfil/sistema')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar o histórico',
    )

    vi.useFakeTimers()
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(screen.getByRole('status')).toHaveTextContent('Carregando histórico')

    act(() => {
      vi.advanceTimersByTime(1200)
    })
    expect(screen.getByText('Nenhuma sessão registrada')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('botão principal mostra ocupado e depois confirma o salvamento', async () => {
    renderRoute('/perfil/sistema')
    const salvar = await screen.findByRole('button', { name: 'Salvar treino' })
    vi.useFakeTimers()
    fireEvent.click(salvar)
    expect(salvar).toBeDisabled()
    act(() => {
      vi.advanceTimersByTime(900)
    })
    expect(screen.getByText('Treino salvo')).toBeInTheDocument()
    vi.useRealTimers()
  })
})
