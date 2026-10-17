import { afterEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderRoute } from '../test/render'
import { fakeDb } from '../test/fakeSupabase'
import { clearPin, setPin } from '../features/settings/pin'
import { collectExport, EXPORT_TABLES } from '../features/settings/exportData'

afterEach(() => {
  clearPin()
})

const ledger = [
  { id: 'p1', rule: 'treino', source_key: 's1', points: 50, day: '2026-10-16', created_at: '' },
  { id: 'p2', rule: 'habito', source_key: 'h1', points: 10, day: '2026-10-16', created_at: '' },
]

describe('Missões', () => {
  it('mostra nível, pontos e extrato vindos do banco', async () => {
    fakeDb.tables.points_ledger = ledger
    renderRoute('/missoes')
    expect(await screen.findByText(/60 pontos\. Faltam 140 para o nível 3/)).toBeInTheDocument()
    const extrato = screen.getByRole('heading', { name: 'Extrato' }).closest('section')
    expect(extrato).not.toBeNull()
    expect(within(extrato as HTMLElement).getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByRole('heading', { name: 'Conquistas' })).toBeInTheDocument()
  })

  it('sem pontos, o extrato explica como começar', async () => {
    renderRoute('/missoes')
    expect(await screen.findByText(/Nenhum ponto ainda/)).toBeInTheDocument()
  })

  it('Hoje resume as missões e leva para a tela completa', async () => {
    fakeDb.tables.points_ledger = ledger
    renderRoute('/')
    const link = await screen.findByRole('link', { name: /Nível 2, 60 pontos/ })
    expect(link).toHaveAttribute('href', '/missoes')
  })
})

describe('Perfil e configurações', () => {
  it('recusa meta abaixo de 1200 kcal e salva uma meta válida', async () => {
    const user = userEvent.setup()
    renderRoute('/perfil')
    const kcal = await screen.findByLabelText('Calorias (kcal)')
    await user.type(kcal, '900')
    await user.click(screen.getByRole('button', { name: 'Salvar meta diária' }))
    expect(await screen.findByText(/abaixo de 1200 kcal/)).toBeInTheDocument()
    expect(fakeDb.calls.some((c) => c.table === 'nutrition_targets')).toBe(false)

    await user.clear(kcal)
    await user.type(kcal, '2300')
    await user.click(screen.getByRole('button', { name: 'Salvar meta diária' }))
    expect(await screen.findByText(/Meta salva/)).toBeInTheDocument()
    expect(fakeDb.calls).toContainEqual(
      expect.objectContaining({ table: 'nutrition_targets', op: 'insert' }),
    )
  })

  it('cria uma meta pessoal pela folha', async () => {
    const user = userEvent.setup()
    renderRoute('/perfil')
    await user.click(await screen.findByRole('button', { name: 'Nova meta' }))
    const sheet = screen.getByRole('dialog', { name: 'Nova meta' })
    await user.type(within(sheet).getByLabelText('Meta'), 'Chegar a 78 kg')
    await user.type(within(sheet).getByLabelText('Valor alvo (opcional)'), '78')
    await user.click(within(sheet).getByRole('button', { name: 'Salvar meta' }))
    await waitFor(() =>
      expect(fakeDb.calls).toContainEqual({
        table: 'goals',
        op: 'insert',
        payload: { kind: 'peso', title: 'Chegar a 78 kg', target_value: 78, unit: 'kg' },
      }),
    )
  })

  it('sem suporte a notificações, explica em vez de mostrar um botão que não funciona', async () => {
    renderRoute('/perfil')
    expect(await screen.findByRole('heading', { name: 'Lembretes' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ativar lembretes' })).toBeNull()
  })

  it('excluir a conta exige digitar EXCLUIR e só então chama o servidor e sai', async () => {
    const user = userEvent.setup()
    const calls: Array<[string, unknown]> = []
    fakeDb.invoke = (name, body) => {
      calls.push([name, body])
      return { data: { ok: true }, error: null }
    }
    const { api } = renderRoute('/perfil')
    await user.click(await screen.findByRole('button', { name: 'Excluir conta e dados' }))
    const sheet = screen.getByRole('dialog', { name: 'Excluir conta' })
    const confirmar = within(sheet).getByRole('button', { name: 'Excluir definitivamente' })
    expect(confirmar).toBeDisabled()
    await user.type(within(sheet).getByLabelText(/Digite EXCLUIR/), 'excluir')
    expect(confirmar).toBeDisabled()
    await user.clear(within(sheet).getByLabelText(/Digite EXCLUIR/))
    await user.type(within(sheet).getByLabelText(/Digite EXCLUIR/), 'EXCLUIR')
    await user.click(confirmar)
    await waitFor(() => expect(api.signOut).toHaveBeenCalledOnce())
    expect(calls).toEqual([['delete-account', { confirm: 'EXCLUIR' }]])
  })

  it('se a exclusão falhar, avisa e não sai', async () => {
    const user = userEvent.setup()
    const { api } = renderRoute('/perfil')
    await user.click(await screen.findByRole('button', { name: 'Excluir conta e dados' }))
    const sheet = screen.getByRole('dialog', { name: 'Excluir conta' })
    await user.type(within(sheet).getByLabelText(/Digite EXCLUIR/), 'EXCLUIR')
    await user.click(within(sheet).getByRole('button', { name: 'Excluir definitivamente' }))
    expect(await within(sheet).findByText(/Nada foi apagado/)).toBeInTheDocument()
    expect(api.signOut).not.toHaveBeenCalled()
  })
})

describe('Exportação', () => {
  it('junta todas as tabelas do usuário em um único objeto', async () => {
    fakeDb.tables.habits = [{ id: 'h1', name: 'Água' }]
    const out = (await collectExport()) as { app: string; data: Record<string, unknown[]> }
    expect(out.app).toBe('Bruceapp')
    expect(Object.keys(out.data)).toEqual([...EXPORT_TABLES])
    expect(out.data.habits).toEqual([{ id: 'h1', name: 'Água' }])
  })
})

describe('PIN', () => {
  it('bloqueia o app até o PIN certo', async () => {
    await setPin('4821')
    sessionStorage.clear()
    const user = userEvent.setup()
    renderRoute('/')
    expect(await screen.findByRole('heading', { name: 'Bruceapp bloqueado' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Navegação principal' })).toBeNull()

    await user.type(screen.getByLabelText('PIN'), '1111')
    await user.click(screen.getByRole('button', { name: 'Desbloquear' }))
    expect(await screen.findByText('PIN incorreto.')).toBeInTheDocument()

    await user.type(screen.getByLabelText('PIN'), '4821')
    await user.click(screen.getByRole('button', { name: 'Desbloquear' }))
    expect(
      await screen.findByRole('navigation', { name: 'Navegação principal' }),
    ).toBeInTheDocument()
  })

  it('esqueci o PIN: remove o PIN e sai', async () => {
    await setPin('4821')
    sessionStorage.clear()
    const user = userEvent.setup()
    const { api } = renderRoute('/')
    await user.click(await screen.findByRole('button', { name: /Esqueci o PIN/ }))
    expect(api.signOut).toHaveBeenCalledOnce()
    expect(localStorage.getItem('bruce.pin')).toBeNull()
  })
})
