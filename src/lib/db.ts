/**
 * Tipos das linhas do banco usadas pelo app (espelham supabase/migrations).
 * Ao mudar o esquema, atualize aqui e em docs/DATABASE.md.
 */
import { supabase } from './supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

export type Profile = {
  id: string
  display_name: string | null
  timezone: string
  weight_unit: 'kg' | 'lb'
  track_calories: boolean
  settings: Record<string, unknown>
  onboarded_at: string | null
}

export type Goal = {
  id: string
  kind: 'peso' | 'forca' | 'habito' | 'nutricao' | 'outro'
  title: string
  target_value: number | null
  unit: string | null
  due_on: string | null
  status: 'ativa' | 'alcancada' | 'arquivada'
  created_at: string
}

export type Habit = {
  id: string
  name: string
  days_of_week: number[]
  target_per_day: number
  reminder_time: string | null
  archived_at: string | null
  created_at: string
}

export type HabitLog = { id: string; habit_id: string; day: string; count: number }

export type Exercise = {
  id: string
  user_id: string | null
  name: string
  primary_muscles: string[]
  secondary_muscles: string[]
  equipment: string | null
  instructions: string | null
}

export type WorkoutPlan = {
  id: string
  name: string
  notes: string | null
  archived_at: string | null
  created_at: string
}

export type PlanDay = {
  id: string
  plan_id: string
  name: string
  weekday: number | null
  position: number
}

export type PlanExercise = {
  id: string
  plan_day_id: string
  exercise_id: string
  position: number
  target_sets: number
  target_reps_min: number | null
  target_reps_max: number | null
  rest_seconds: number | null
  notes: string | null
}

export type SessionStatus = 'ativa' | 'pausada' | 'finalizada' | 'cancelada'

export type WorkoutSession = {
  id: string
  plan_day_id: string | null
  title: string
  status: SessionStatus
  started_at: string
  finished_at: string | null
  notes: string | null
}

export type SessionExercise = {
  id: string
  session_id: string
  exercise_id: string | null
  exercise_name: string
  position: number
  target_sets: number | null
  target_reps_min: number | null
  target_reps_max: number | null
  rest_seconds: number | null
}

export type ExerciseSet = {
  id: string
  session_exercise_id: string
  position: number
  weight_kg: number | null
  reps: number | null
  rir: number | null
  rest_seconds: number | null
  completed_at: string | null
}

export type PersonalRecord = {
  id: string
  exercise_id: string | null
  exercise_name: string
  criterion: 'carga_1' | 'carga_3' | 'carga_5' | 'carga_10' | 'e1rm'
  value: number
  set_id: string | null
  achieved_on: string
}

export type FoodSource = 'usuario' | 'open_food_facts' | 'ia' | 'tbca'

export type Food = {
  id: string
  user_id: string | null
  source: FoodSource
  external_id: string | null
  barcode: string | null
  name: string
  brand: string | null
  kcal_100g: number | null
  protein_100g: number | null
  carbs_100g: number | null
  fat_100g: number | null
  fiber_100g: number | null
  serving_name: string | null
  serving_g: number | null
  is_incomplete: boolean
  attribution: string | null
}

export type Meal = 'cafe' | 'almoco' | 'lanche' | 'jantar' | 'outro'

export type DiaryEntry = {
  id: string
  day: string
  meal: Meal
  eaten_at: string | null
  food_id: string | null
  food_name: string
  brand: string | null
  quantity_g: number
  kcal: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  fiber_g: number | null
  is_estimate: boolean
  source: FoodSource | 'manual'
  notes: string | null
  created_at: string
}

export type NutritionTarget = {
  id: string
  kcal: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  valid_from: string
  valid_to: string | null
}

export type MeasurementKind =
  'peso' | 'cintura' | 'quadril' | 'peito' | 'braco' | 'coxa' | 'gordura'

export type BodyMeasurement = {
  id: string
  measured_on: string
  kind: MeasurementKind
  value: number
  unit: 'kg' | 'cm' | '%'
  note: string | null
}

/** Cliente garantido (as telas de dados só abrem com sessão, logo com configuração). */
export function db(): SupabaseClient {
  if (!supabase) throw new Error('Supabase não configurado')
  return supabase
}

/** Converte o resultado do supabase-js em valor ou exceção, para o TanStack Query. */
export function unwrap<T>(result: { data: unknown; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message)
  return result.data as T
}
