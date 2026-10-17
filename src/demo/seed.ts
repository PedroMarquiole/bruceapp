/**
 * Dados de exemplo da versão de teste. São fictícios e ficam só no navegador; a faixa no topo
 * do app avisa disso. Datas relativas a hoje, para as telas mostrarem a semana atual.
 */
import { EXERCISES, SCHEMA } from './schema'

type Row = Record<string, unknown>

function dayKey(offset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function at(offset: number, hour: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

export function seedTables(uid: string): Record<string, Row[]> {
  const t: Record<string, Row[]> = {}
  const add = (table: string, input: Row): Row => {
    const cols = SCHEMA[table] ?? {}
    const row: Row = {}
    for (const [c, def] of Object.entries(cols))
      row[c] =
        def === '$uuid'
          ? crypto.randomUUID()
          : def === '$uid'
            ? uid
            : def === '$now'
              ? new Date().toISOString()
              : def === '$today'
                ? dayKey(0)
                : Array.isArray(def)
                  ? [...def]
                  : def
    Object.assign(row, input)
    ;(t[table] ??= []).push(row)
    return row
  }

  add('profiles', {
    id: uid,
    display_name: 'Visitante',
    track_calories: true,
    settings: { objetivo: 'forca', experiencia: 'intermediario' },
    onboarded_at: at(-30, 9),
  })

  const ex = new Map<string, Row>()
  for (const e of EXERCISES) ex.set(e.name, add('exercises', { ...e, user_id: null }))
  const exId = (name: string) => ex.get(name)?.id ?? null

  // Hábitos e as duas últimas semanas de registros.
  const agua = add('habits', {
    name: 'Beber 2 litros de água',
    target_per_day: 4,
    created_at: at(-20, 8),
  })
  const sono = add('habits', { name: 'Dormir 7 horas', created_at: at(-20, 8) })
  const along = add('habits', {
    name: 'Alongar 10 minutos',
    days_of_week: [1, 3, 5],
    created_at: at(-20, 8),
  })
  for (let i = -13; i <= -1; i++) {
    if (i % 4 !== 0)
      add('habit_logs', { habit_id: agua.id, day: dayKey(i), count: i % 3 === 0 ? 3 : 4 })
    if (i % 5 !== 0) add('habit_logs', { habit_id: sono.id, day: dayKey(i), count: 1 })
  }
  add('habit_logs', { habit_id: agua.id, day: dayKey(0), count: 2 })
  void along

  // Plano de treino A/B.
  const plano = add('workout_plans', { name: 'Força A/B', created_at: at(-25, 10) })
  const diaA = add('workout_plan_days', {
    plan_id: plano.id,
    name: 'Treino A',
    weekday: 1,
    position: 0,
  })
  const diaB = add('workout_plan_days', {
    plan_id: plano.id,
    name: 'Treino B',
    weekday: 4,
    position: 1,
  })
  const A = ['Supino reto com barra', 'Remada curvada com barra', 'Desenvolvimento com halteres']
  const B = ['Agachamento livre', 'Levantamento terra', 'Puxada frontal na polia']
  A.forEach((n, i) =>
    add('workout_plan_exercises', {
      plan_day_id: diaA.id,
      exercise_id: exId(n),
      position: i,
      target_sets: 3,
      target_reps_min: 6,
      target_reps_max: 8,
      rest_seconds: 120,
    }),
  )
  B.forEach((n, i) =>
    add('workout_plan_exercises', {
      plan_day_id: diaB.id,
      exercise_id: exId(n),
      position: i,
      target_sets: 3,
      target_reps_min: 5,
      target_reps_max: 8,
      rest_seconds: 150,
    }),
  )

  // Três treinos já feitos.
  const sessoes: Array<[number, Row, string[], number[]]> = [
    [-9, diaA, A, [70, 60, 18]],
    [-6, diaB, B, [90, 110, 55]],
    [-2, diaA, A, [72.5, 62.5, 18]],
  ]
  for (const [off, dia, nomes, cargas] of sessoes) {
    const s = add('workout_sessions', {
      plan_day_id: dia.id,
      title: dia.name,
      status: 'finalizada',
      started_at: at(off, 18),
      finished_at: at(off, 19),
    })
    nomes.forEach((n, i) => {
      const se = add('session_exercises', {
        session_id: s.id,
        exercise_id: exId(n),
        exercise_name: n,
        position: i,
      })
      for (let k = 0; k < 3; k++)
        add('exercise_sets', {
          session_exercise_id: se.id,
          position: k,
          weight_kg: cargas[i],
          reps: 8 - k,
          completed_at: at(off, 18),
        })
    })
  }
  for (const [n, crit, v, off] of [
    ['Supino reto com barra', 'carga_5', 72.5, -2],
    ['Supino reto com barra', 'e1rm', 91.8, -2],
    ['Agachamento livre', 'carga_5', 90, -6],
    ['Levantamento terra', 'carga_5', 110, -6],
  ] as const)
    add('personal_records', {
      exercise_id: exId(n),
      exercise_name: n,
      criterion: crit,
      value: v,
      achieved_on: dayKey(off),
    })

  // Peso das últimas semanas.
  ;[80.4, 80.1, 79.9, 79.6, 79.7, 79.2].forEach((v, i) =>
    add('body_measurements', {
      kind: 'peso',
      unit: 'kg',
      value: v,
      measured_on: dayKey(-35 + i * 7),
    }),
  )

  // Alimentos próprios e o diário de hoje e de ontem.
  const foods: Array<[string, number, number, number, number]> = [
    ['Arroz branco cozido', 128, 2.5, 28, 0.2],
    ['Feijão carioca cozido', 76, 4.8, 13.6, 0.5],
    ['Peito de frango grelhado', 159, 32, 0, 2.5],
    ['Ovo cozido', 146, 13.3, 0.6, 9.5],
    ['Banana prata', 98, 1.3, 26, 0.1],
    ['Aveia em flocos', 394, 13.9, 66.6, 8.5],
  ]
  const food = new Map<string, Row>()
  for (const [name, kcal, p, c, f] of foods)
    food.set(
      name,
      add('foods', {
        source: 'usuario',
        name,
        kcal_100g: kcal,
        protein_100g: p,
        carbs_100g: c,
        fat_100g: f,
      }),
    )
  const comer = (off: number, meal: string, name: string, g: number) => {
    const fd = food.get(name)
    if (!fd) return
    const k = g / 100
    add('food_diary_entries', {
      day: dayKey(off),
      meal,
      eaten_at: at(off, meal === 'cafe' ? 8 : meal === 'almoco' ? 12 : 19),
      food_id: fd.id,
      food_name: name,
      quantity_g: g,
      kcal: Math.round(Number(fd.kcal_100g) * k),
      protein_g: Math.round(Number(fd.protein_100g) * k * 10) / 10,
      carbs_g: Math.round(Number(fd.carbs_100g) * k * 10) / 10,
      fat_g: Math.round(Number(fd.fat_100g) * k * 10) / 10,
      source: 'usuario',
    })
  }
  comer(-1, 'cafe', 'Aveia em flocos', 40)
  comer(-1, 'cafe', 'Banana prata', 100)
  comer(-1, 'almoco', 'Arroz branco cozido', 150)
  comer(-1, 'almoco', 'Feijão carioca cozido', 100)
  comer(-1, 'almoco', 'Peito de frango grelhado', 150)
  comer(0, 'cafe', 'Ovo cozido', 100)
  comer(0, 'cafe', 'Banana prata', 100)

  add('nutrition_targets', {
    kcal: 2400,
    protein_g: 150,
    carbs_g: 280,
    fat_g: 75,
    valid_from: dayKey(-20),
  })
  add('goals', { kind: 'forca', title: 'Supino com 80 kg', target_value: 80, unit: 'kg' })

  return t
}
