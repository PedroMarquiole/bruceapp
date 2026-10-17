import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from './routes'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

describe('navegação principal', () => {
  it('abre em Hoje com as cinco abas', () => {
    renderAt('/')
    const nav = screen.getByRole('navigation', { name: 'Navegação principal' })
    for (const label of ['Hoje', 'Nutrição', 'Treino', 'Evolução', 'Bruce']) {
      expect(nav).toHaveTextContent(label)
    }
    expect(screen.getByRole('link', { name: /Hoje/ })).toHaveAttribute('aria-current', 'page')
  })

  it('troca de aba e marca a aba ativa', async () => {
    const user = userEvent.setup()
    const router = renderAt('/')
    await user.click(screen.getByRole('link', { name: /Treino/ }))
    expect(router.state.location.pathname).toBe('/treino')
    expect(screen.getByRole('heading', { level: 1, name: 'Treino' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Treino/ })).toHaveAttribute('aria-current', 'page')
  })

  it('abre o perfil pelo botão do topo', async () => {
    const user = userEvent.setup()
    renderAt('/evolucao')
    await user.click(screen.getByRole('link', { name: 'Abrir perfil e configurações' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Perfil' })).toBeInTheDocument()
  })

  it('mostra tela de não encontrado para endereço desconhecido', () => {
    renderAt('/nao-existe')
    expect(screen.getByRole('heading', { name: 'Tela não encontrada' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir para Hoje' })).toHaveAttribute('href', '/')
  })
})

describe('estados vazios', () => {
  it('cada aba mostra um estado vazio explicando o que vai aparecer', () => {
    const casos: Array<[string, RegExp]> = [
      ['/', /Nada registrado ainda/],
      ['/nutricao', /Nenhuma refeição registrada/],
      ['/treino', /Nenhum plano criado/],
      ['/evolucao', /Sem registros de peso/],
      ['/bruce', /ainda não está ligado/],
    ]
    for (const [path, texto] of casos) {
      const { unmount } = render(
        <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />,
      )
      expect(screen.getByText(texto)).toBeInTheDocument()
      unmount()
    }
  })
})
