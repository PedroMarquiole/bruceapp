import { describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '../app/routes'

describe('Sistema visual', () => {
  it('passa do erro para carregando e depois para vazio ao tentar de novo', () => {
    vi.useFakeTimers()
    render(
      <RouterProvider
        router={createMemoryRouter(routes, { initialEntries: ['/perfil/sistema'] })}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar o histórico')

    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(screen.getByRole('status')).toHaveTextContent('Carregando histórico')

    act(() => {
      vi.advanceTimersByTime(1200)
    })
    expect(screen.getByText('Nenhuma sessão registrada')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('botão principal mostra ocupado e depois confirma o salvamento', () => {
    vi.useFakeTimers()
    render(
      <RouterProvider
        router={createMemoryRouter(routes, { initialEntries: ['/perfil/sistema'] })}
      />,
    )
    const salvar = screen.getByRole('button', { name: 'Salvar treino' })
    fireEvent.click(salvar)
    expect(salvar).toBeDisabled()
    act(() => {
      vi.advanceTimersByTime(900)
    })
    expect(screen.getByText('Treino salvo')).toBeInTheDocument()
    vi.useRealTimers()
  })
})
