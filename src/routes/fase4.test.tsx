import { describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderRoute } from '../test/render'
import { fakeDb } from '../test/fakeSupabase'
import { PhotoEstimate } from '../features/nutrition/PhotoEstimate'
import { callAssistant } from '../features/assistant/client'

describe('Bruce AI', () => {
  it('mostra a resposta e só salva a proposta depois de Aceitar', async () => {
    fakeDb.invoke = () => ({
      data: {
        conversation_id: 'c1',
        reply: 'Você treinou 2 vezes nesta semana.',
        proposals: [
          {
            type: 'criar_habito',
            name: 'Dormir 7 horas',
            days_of_week: [1, 2, 3, 4, 5],
            target_per_day: 1,
            reason: 'Recuperação',
          },
        ],
      },
      error: null,
    })
    // Depois do envio, a conversa recarrega do banco com a resposta e a proposta.
    const user = userEvent.setup()
    renderRoute('/bruce')
    await user.type(await screen.findByLabelText('Mensagem para o Bruce'), 'Como foi minha semana?')
    fakeDb.tables.ai_conversations = [{ id: 'c1', title: 'Como foi', updated_at: '' }]
    fakeDb.tables.ai_messages = [
      {
        id: 'm1',
        conversation_id: 'c1',
        role: 'user',
        content: 'Como foi minha semana?',
        proposals: [],
        created_at: '',
      },
      {
        id: 'm2',
        conversation_id: 'c1',
        role: 'assistant',
        content: 'Você treinou 2 vezes nesta semana.',
        proposals: [
          {
            type: 'criar_habito',
            name: 'Dormir 7 horas',
            days_of_week: [1, 2, 3, 4, 5],
            target_per_day: 1,
            reason: 'Recuperação',
          },
        ],
        created_at: '',
      },
    ]
    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(await screen.findByText('Você treinou 2 vezes nesta semana.')).toBeInTheDocument()
    expect(screen.getByText('Criar hábito: Dormir 7 horas')).toBeInTheDocument()
    expect(fakeDb.calls.filter((c) => c.table === 'habits')).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: 'Aceitar' }))
    await waitFor(() =>
      expect(fakeDb.calls).toContainEqual(
        expect.objectContaining({
          table: 'habits',
          op: 'insert',
          payload: expect.objectContaining({ name: 'Dormir 7 horas' }),
        }),
      ),
    )
    expect(await screen.findByText('Aceita e salva.')).toBeInTheDocument()
  })

  it('traduz IA não configurada em mensagem acionável', async () => {
    fakeDb.invoke = () => ({
      data: null,
      error: Object.assign(new Error('x'), {
        context: new Response(JSON.stringify({ code: 'ia_nao_configurada' }), { status: 503 }),
      }),
    })
    await expect(callAssistant({ intent: 'sugestao_dia' })).rejects.toThrow(
      /falta a chave do provedor/,
    )
  })

  it('traduz limite diário', async () => {
    fakeDb.invoke = () => ({
      data: null,
      error: Object.assign(new Error('x'), {
        context: new Response(
          JSON.stringify({
            code: 'limite_diario',
            error: 'Limite de 40 pedidos por dia atingido.',
          }),
          { status: 429 },
        ),
      }),
    })
    await expect(callAssistant({ intent: 'sugestao_dia' })).rejects.toThrow(
      'Limite de 40 pedidos por dia atingido.',
    )
  })
})

describe('estimativa por foto', () => {
  it('revisa itens, recalcula ao mudar gramas e salva marcado como estimado', async () => {
    fakeDb.invoke = () => ({
      data: {
        items: [
          {
            name: 'Arroz',
            grams: 150,
            kcal: 195,
            protein_g: 4,
            carbs_g: 42,
            fat_g: 0.5,
            confidence: 'media',
          },
          {
            name: 'Feijão',
            grams: 100,
            kcal: 76,
            protein_g: 4.8,
            carbs_g: 13.6,
            fat_g: 0.5,
            confidence: 'media',
          },
        ],
        note: 'Porções aproximadas.',
      },
      error: null,
    })
    // createImageBitmap e canvas não existem no jsdom: simula a redução da imagem.
    globalThis.createImageBitmap = (async () => ({
      width: 10,
      height: 10,
    })) as unknown as typeof createImageBitmap
    HTMLCanvasElement.prototype.getContext = (() => ({
      drawImage() {},
    })) as unknown as HTMLCanvasElement['getContext']
    HTMLCanvasElement.prototype.toDataURL = () => `data:image/jpeg;base64,${'A'.repeat(200)}`

    const user = userEvent.setup()
    const qc = new QueryClient()
    let done = false
    render(
      <QueryClientProvider client={qc}>
        <PhotoEstimate day="2026-10-17" meal="almoco" onDone={() => (done = true)} />
      </QueryClientProvider>,
    )
    const input = screen.getByLabelText(/Tirar ou escolher foto/, { selector: 'input' })
    await user.upload(input, new File(['x'], 'prato.jpg', { type: 'image/jpeg' }))
    expect(await screen.findByDisplayValue('Arroz')).toBeInTheDocument()

    const gramas = screen.getByLabelText('Gramas do item 1')
    await user.clear(gramas)
    await user.type(gramas, '300')
    expect(screen.getByText(/390 kcal/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remover Feijão' }))
    await user.click(screen.getByRole('button', { name: 'Salvar no diário' }))
    await waitFor(() => expect(done).toBe(true))
    const call = fakeDb.calls.find((c) => c.table === 'food_diary_entries')
    expect(call?.payload).toEqual([
      expect.objectContaining({
        food_name: 'Arroz',
        quantity_g: 300,
        kcal: 390,
        is_estimate: true,
        source: 'ia',
        meal: 'almoco',
      }),
    ])
  })
})

describe('evolução', () => {
  it('desenha o gráfico com os registros de peso e mostra a variação', async () => {
    const d = new Date()
    const key = (offset: number) => {
      const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset)
      return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
    }
    fakeDb.tables.body_measurements = [
      { id: 'b1', kind: 'peso', value: 80, unit: 'kg', measured_on: key(20), note: null },
      { id: 'b2', kind: 'peso', value: 79, unit: 'kg', measured_on: key(10), note: null },
      { id: 'b3', kind: 'peso', value: 78.5, unit: 'kg', measured_on: key(0), note: null },
    ]
    renderRoute('/evolucao')
    expect(await screen.findByRole('img', { name: 'Gráfico de 3 registros' })).toBeInTheDocument()
    expect(screen.getByText(/Variação no período: -1,5 kg, em 3 registros/)).toBeInTheDocument()
    const table = screen.getByRole('table', { hidden: true })
    expect(within(table).getAllByRole('row', { hidden: true })).toHaveLength(4)
  })
})
