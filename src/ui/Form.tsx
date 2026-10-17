import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'

export const inputClass =
  'block w-full rounded-[var(--radius-control)] border border-line bg-graphite px-4 text-body text-ink placeholder:text-ink-muted/70 outline-none transition-colors focus:border-signal aria-[invalid=true]:border-danger disabled:opacity-50'

type FieldProps = {
  label: string
  hint?: string
  error?: string | null | undefined
  children: (props: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode
}

/** Rótulo visível + controle + dica/erro ligados por aria. */
export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')
  return (
    <div>
      <label htmlFor={id} className="block font-medium text-ink">
        {label}
      </label>
      <div className="mt-2">
        {children({ id, describedBy: describedBy || undefined, invalid: Boolean(error) })}
      </div>
      {hint ? (
        <p id={hintId} className="mt-1.5 text-small text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-1.5 text-small text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string
  hint?: string
  error?: string | null | undefined
}

export function TextField({ label, hint, error, className = '', ...rest }: TextFieldProps) {
  return (
    <Field label={label} {...(hint ? { hint } : {})} error={error}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={`${inputClass} h-12 ${className}`}
          {...rest}
        />
      )}
    </Field>
  )
}

type TextAreaFieldProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> & {
  label: string
  hint?: string
  error?: string | null | undefined
}

export function TextAreaField({ label, hint, error, className = '', ...rest }: TextAreaFieldProps) {
  return (
    <Field label={label} {...(hint ? { hint } : {})} error={error}>
      {({ id, describedBy, invalid }) => (
        <textarea
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={`${inputClass} min-h-24 py-3 ${className}`}
          {...rest}
        />
      )}
    </Field>
  )
}

type Option<T extends string> = { value: T; label: string }

/** Grupo de opções exclusivas (rádio estilizado). */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly Option<T>[]
  value: T | null
  onChange: (v: T) => void
}) {
  const name = useId()
  return (
    <fieldset>
      <legend className="font-medium text-ink">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={`inline-flex min-h-11 cursor-pointer items-center rounded-[var(--radius-control)] border px-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-signal ${
              value === o.value
                ? 'border-signal bg-signal/10 text-ink'
                : 'border-line bg-graphite text-ink-muted hover:text-ink'
            }`}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/** Dias da semana (1 = segunda ... 7 = domingo), múltipla escolha. */
export function WeekdayPicker({
  label,
  value,
  onChange,
}: {
  label: string
  value: number[]
  onChange: (v: number[]) => void
}) {
  const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
  return (
    <fieldset>
      <legend className="font-medium text-ink">{label}</legend>
      <div className="mt-2 grid grid-cols-7 gap-1.5">
        {days.map((d, i) => {
          const n = i + 1
          const on = value.includes(n)
          return (
            <label
              key={d}
              className={`grid min-h-11 cursor-pointer place-items-center rounded-[var(--radius-control)] border text-small font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-signal ${
                on
                  ? 'border-signal bg-signal/10 text-ink'
                  : 'border-line bg-graphite text-ink-muted'
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={on}
                onChange={() =>
                  onChange(on ? value.filter((x) => x !== n) : [...value, n].sort((a, b) => a - b))
                }
              />
              {d}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
