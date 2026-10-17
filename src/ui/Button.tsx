import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'quiet' | 'danger'

const variants: Record<Variant, string> = {
  primary: 'bg-signal text-obsidian hover:bg-signal-press active:bg-signal-press font-semibold',
  secondary:
    'bg-graphite text-ink border border-line hover:bg-graphite-raised active:bg-graphite-raised font-medium',
  quiet: 'text-ink hover:bg-graphite active:bg-graphite font-medium',
  danger:
    'bg-graphite text-danger border border-line hover:bg-graphite-raised active:bg-graphite-raised font-medium',
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  icon?: ReactNode
  busy?: boolean
}

export function Button({
  variant = 'primary',
  icon,
  busy = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] px-4 text-body transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45 ${variants[variant]} ${className}`}
      {...rest}
    >
      {busy ? (
        <span
          aria-hidden
          className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
        />
      ) : (
        icon
      )}
      {children}
    </button>
  )
}
