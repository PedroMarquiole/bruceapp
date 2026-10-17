import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderRoute } from '../test/render'
import { fakeAuth } from '../test/auth'

const renderAt = (path: string) => renderRoute(path).router

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
  it('cada aba mostra um estado vazio explicando o que vai aparecer', async () => {
    const casos: Array<[string, RegExp]> = [
      ['/', /Nenhum hábito configurado/],
      ['/nutricao', /Café da manhã/],
      ['/treino', /Nenhum plano criado/],
      ['/evolucao', /Sem registros neste período/],
      ['/bruce', /Pergunte sobre os seus treinos/],
    ]
    for (const [path, texto] of casos) {
      const { unmount } = renderRoute(path)
      expect(await screen.findByText(texto)).toBeInTheDocument()
      unmount()
    }
  })
})

describe('acesso', () => {
  it('sem sessão, mostra a tela de entrada em vez do app', () => {
    renderRoute('/treino', fakeAuth({ status: 'deslogado' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Entrar' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Navegação principal' })).toBeNull()
  })

  it('sem configuração, explica quais variáveis faltam', () => {
    renderRoute('/', fakeAuth({ status: 'sem-config', missing: ['VITE_SUPABASE_URL'] }))
    expect(screen.getByRole('heading', { name: 'Configuração ausente' })).toBeInTheDocument()
    expect(screen.getByText('VITE_SUPABASE_URL')).toBeInTheDocument()
  })

  it('perfil mostra o e-mail da conta e permite sair', async () => {
    const user = userEvent.setup()
    const { api } = renderRoute('/perfil')
    expect(screen.getByText('eu@teste.invalid')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Sair' }))
    expect(api.signOut).toHaveBeenCalledOnce()
  })
})
