import { useState, type FormEvent } from 'react'
import { z } from 'zod'
import { Button } from '../../ui/Button'
import { TextField, WeekdayPicker } from '../../ui/Form'
import type { Habit } from '../../lib/db'
import type { HabitInput } from './queries'

const HabitSchema = z.object({
  name: z.string().trim().min(1, 'Dê um nome ao hábito.').max(80, 'Use até 80 caracteres.'),
  days_of_week: z.array(z.number().int().min(1).max(7)).min(1, 'Escolha pelo menos um dia.'),
  target_per_day: z.number().int().min(1, 'Mínimo 1.').max(20, 'Máximo 20.'),
  reminder_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use o formato HH:MM.')
    .nullable(),
})

type Errors = Partial<Record<keyof HabitInput, string>>

export function HabitForm({
  initial,
  onSubmit,
  busy,
  submitLabel,
}: {
  initial?: Habit
  onSubmit: (v: HabitInput) => void
  busy: boolean
  submitLabel: string
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [days, setDays] = useState<number[]>(initial?.days_of_week ?? [1, 2, 3, 4, 5, 6, 7])
  const [target, setTarget] = useState(String(initial?.target_per_day ?? 1))
  const [reminder, setReminder] = useState(initial?.reminder_time?.slice(0, 5) ?? '')
  const [errors, setErrors] = useState<Errors>({})

  function submit(e: FormEvent) {
    e.preventDefault()
    const parsed = HabitSchema.safeParse({
      name,
      days_of_week: days,
      target_per_day: Number(target),
      reminder_time: reminder || null,
    })
    if (!parsed.success) {
      const errs: Errors = {}
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof HabitInput
        errs[k] ??= issue.message
      }
      setErrors(errs)
      return
    }
    setErrors({})
    onSubmit(parsed.data)
  }

  return (
    <form noValidate onSubmit={submit} className="space-y-5">
      <TextField
        label="Nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ex.: Beber 2 litros de água"
        maxLength={80}
        error={errors.name}
      />
      <WeekdayPicker label="Dias" value={days} onChange={setDays} />
      {errors.days_of_week ? <p className="text-small text-danger">{errors.days_of_week}</p> : null}
      <TextField
        label="Vezes por dia"
        type="number"
        inputMode="numeric"
        min={1}
        max={20}
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        hint="Para hábitos contados, como copos de água."
        error={errors.target_per_day}
      />
      <TextField
        label="Lembrete (opcional)"
        type="time"
        value={reminder}
        onChange={(e) => setReminder(e.target.value)}
        hint="Chega como notificação quando os lembretes estiverem ativados no Perfil."
        error={errors.reminder_time}
      />
      <Button type="submit" busy={busy} className="w-full">
        {submitLabel}
      </Button>
    </form>
  )
}
