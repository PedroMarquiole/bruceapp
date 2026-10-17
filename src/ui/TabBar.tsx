import { NavLink } from 'react-router'
import type { LucideIcon } from 'lucide-react'
import { CalendarDays, Dumbbell, ChartLine, MessageSquareText, UtensilsCrossed } from 'lucide-react'

type Tab = { to: string; label: string; icon: LucideIcon; end?: boolean }

const TABS: readonly Tab[] = [
  { to: '/', label: 'Hoje', icon: CalendarDays, end: true },
  { to: '/nutricao', label: 'Nutrição', icon: UtensilsCrossed },
  { to: '/treino', label: 'Treino', icon: Dumbbell },
  { to: '/evolucao', label: 'Evolução', icon: ChartLine },
  { to: '/bruce', label: 'Bruce', icon: MessageSquareText },
]

export function TabBar() {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-obsidian/92 backdrop-blur-md safe-bottom"
    >
      <ul className="mx-auto flex max-w-xl">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end ?? false}
              className={({ isActive }) =>
                `relative flex min-h-14 flex-col items-center justify-center gap-1 text-micro font-medium transition-colors ${
                  isActive ? 'text-ink' : 'text-ink-muted hover:text-ink'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    aria-hidden
                    className={`absolute top-0 h-0.5 w-8 rounded-full bg-signal transition-opacity ${
                      isActive ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                  <Icon aria-hidden className="size-[22px]" strokeWidth={isActive ? 2.25 : 1.75} />
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
