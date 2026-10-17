import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderRoute } from '../test/render'
import { fakeDb } from '../test/fakeSupabase'

const habit = {
  id: 'h1',
  name: 'Beber água',
  days_of_week: [1, 2, 3, 4, 5, 6, 7],
  target_per_day: 1,
  reminder_time: null,
  archived_at: null,
  created_at: '2026-01-01T00:00:00Z',
}

describe('hábitos', () => {
  it('marcar um hábito em Hoje grava o registro do dia', async () => {
    fakeDb.tables.habits = [habit]
    const user = userEvent.setup()
    renderRoute('/')
    await user.click(await screen.findByRole('button', { name: 'Marcar Beber água como feito' }))
    await waitFor(() =>
      expect(fakeDb.calls).toContainEqual(
        expect.objectContaining({
          table: 'habit_logs',
          op: 'upsert',
          payload: expect.objectContaining({ habit_id: 'h1', count: 1 }),
        }),
      ),
    )
  })

  it('criar hábito valida o nome e envia os dias escolhidos', async () => {
    const user = userEvent.setup()
    renderRoute('/habitos')
    await user.click(await screen.findByRole('button', { name: 'Novo hábito' }))
    const dialog = screen.getByRole('dialog', { name: 'Novo hábito' })
    await user.click(within(dialog).getByRole('button', { name: 'Criar hábito' }))
    expect(within(dialog).getByText('Dê um nome ao hábito.')).toBeInTheDocument()
    expect(fakeDb.calls).toHaveLength(0)

    await user.type(within(dialog).getByLabelText('Nome'), 'Ler 20 minutos')
    await user.click(within(dialog).getByLabelText('Sáb'))
    await user.click(within(dialog).getByLabelText('Dom'))
    await user.click(within(dialog).getByRole('button', { name: 'Criar hábito' }))
    await waitFor(() =>
      expect(fakeDb.calls).toContainEqual(
        expect.objectContaining({
          table: 'habits',
          op: 'insert',
          payload: expect.objectContaining({
            name: 'Ler 20 minutos',
            days_of_week: [1, 2, 3, 4, 5],
          }),
        }),
      ),
    )
  })
})

describe('nutrição', () => {
  it('soma o dia a partir das entradas quando as calorias estão ativadas', async () => {
    fakeDb.tables.profiles = [{ ...fakeDb.tables.profiles?.[0], track_calories: true }]
    fakeDb.tables.food_diary_entries = [
      {
        id: 'e1',
        day: '2026-10-17',
        meal: 'almoco',
        food_name: 'Arroz',
        quantity_g: 150,
        kcal: 192,
        protein_g: 3.8,
        carbs_g: 42.2,
        fat_g: 0.3,
        fiber_g: 2.4,
        is_estimate: false,
        source: 'usuario',
        created_at: '',
      },
      {
        id: 'e2',
        day: '2026-10-17',
        meal: 'almoco',
        food_name: 'Frango',
        quantity_g: 120,
        kcal: 198,
        protein_g: 37.2,
        carbs_g: 0,
        fat_g: 4.3,
        fiber_g: 0,
        is_estimate: true,
        source: 'ia',
        created_at: '',
      },
    ]
    renderRoute('/nutricao')
    expect(await screen.findByText('390')).toBeInTheDocument()
    expect(screen.getByText('Frango')).toBeInTheDocument()
    expect(screen.getByText(/120 g, estimado/)).toBeInTheDocument()
  })

  it('sem acompanhar calorias, não mostra números de kcal', async () => {
    fakeDb.tables.food_diary_entries = [
      {
        id: 'e1',
        day: '2026-10-17',
        meal: 'cafe',
        food_name: 'Pão',
        quantity_g: 50,
        kcal: 140,
        protein_g: 4,
        carbs_g: 28,
        fat_g: 1,
        fiber_g: 1,
        is_estimate: false,
        source: 'usuario',
        created_at: '',
      },
    ]
    renderRoute('/nutricao')
    expect(await screen.findByText('Pão')).toBeInTheDocument()
    expect(screen.queryByText(/140 kcal/)).toBeNull()
    expect(screen.getByText(/Calorias ocultas/)).toBeInTheDocument()
  })
})

describe('treino', () => {
  const plan = {
    id: 'p1',
    name: 'ABC',
    notes: null,
    archived_at: null,
    created_at: '',
    workout_plan_days: [
      {
        id: 'd1',
        plan_id: 'p1',
        name: 'Treino A',
        weekday: 1,
        position: 0,
        workout_plan_exercises: [
          {
            id: 'pe1',
            plan_day_id: 'd1',
            exercise_id: 'x1',
            position: 0,
            target_sets: 3,
            target_reps_min: 8,
            target_reps_max: 12,
            rest_seconds: 90,
            notes: null,
          },
        ],
      },
    ],
  }

  it('começar um dia do plano cria a sessão com os exercícios e metas copiados', async () => {
    fakeDb.tables.workout_plans = [plan]
    fakeDb.tables.exercises = [
      {
        id: 'x1',
        user_id: null,
        name: 'Supino reto com barra',
        primary_muscles: [],
        secondary_muscles: [],
        equipment: null,
        instructions: null,
      },
    ]
    const user = userEvent.setup()
    renderRoute('/treino')
    await screen.findByText('Treino A')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Começar' })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: 'Começar' }))
    await waitFor(() =>
      expect(fakeDb.calls).toContainEqual(
        expect.objectContaining({
          table: 'session_exercises',
          op: 'insert',
          payload: [
            expect.objectContaining({
              exercise_name: 'Supino reto com barra',
              target_sets: 3,
              rest_seconds: 90,
            }),
          ],
        }),
      ),
    )
    expect(fakeDb.calls[0]).toMatchObject({
      table: 'workout_sessions',
      op: 'insert',
      payload: { plan_day_id: 'd1', title: 'Treino A' },
    })
  })

  it('na sessão ativa, concluir série grava carga, repetições e horário; finalizar chama o cálculo de recordes', async () => {
    fakeDb.tables.workout_sessions = [
      {
        id: 's1',
        plan_day_id: 'd1',
        title: 'Treino A',
        status: 'ativa',
        started_at: new Date().toISOString(),
        finished_at: null,
        notes: null,
        session_exercises: [
          {
            id: 'se1',
            session_id: 's1',
            exercise_id: 'x1',
            exercise_name: 'Supino reto com barra',
            position: 0,
            target_sets: 3,
            target_reps_min: 8,
            target_reps_max: 12,
            rest_seconds: 60,
            exercise_sets: [
              {
                id: 'st1',
                session_exercise_id: 'se1',
                position: 0,
                weight_kg: null,
                reps: null,
                rir: null,
                rest_seconds: null,
                completed_at: null,
              },
            ],
          },
        ],
      },
    ]
    fakeDb.rpc.finish_workout_session = []
    const user = userEvent.setup()
    renderRoute('/treino/sessao/s1')
    await user.type(await screen.findByLabelText('Carga da série 1 em kg'), '82,5')
    await user.type(screen.getByLabelText('Repetições da série 1'), '8')
    await user.click(screen.getByRole('button', { name: 'Concluir série 1' }))
    await waitFor(() =>
      expect(fakeDb.calls).toContainEqual(
        expect.objectContaining({
          table: 'exercise_sets',
          op: 'update',
          payload: expect.objectContaining({
            weight_kg: 82.5,
            reps: 8,
            completed_at: expect.any(String),
            rest_seconds: 60,
          }),
        }),
      ),
    )
    expect(await screen.findByRole('timer')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Finalizar treino' }))
    const dialog = screen.getByRole('dialog', { name: 'Finalizar treino?' })
    await user.click(within(dialog).getByRole('button', { name: 'Finalizar treino' }))
    expect(await screen.findByText(/Nenhum recorde novo desta vez/)).toBeInTheDocument()
  })
})
