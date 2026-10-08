import { BookOpen, ChevronLeft, Clock } from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router'
import { cn } from '../lib/utils'

const NAV_ITEMS = [
  { to: '/namaz', label: 'Namaz', icon: Clock },
  { to: '/quran', label: 'Quran', icon: BookOpen },
]

/** Pages that render the bottom bar need this much space at the bottom */
export const NAV_SPACE = 'pb-[calc(5rem+env(safe-area-inset-bottom))]'

export function BottomNav() {
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg border-t border-stone-200 bg-white/95 backdrop-blur">
      <div className="flex">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-0.5 pt-2.5 pb-2 text-[11px] font-semibold transition',
                isActive ? 'text-emerald-700' : 'text-stone-500',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'grid h-7 w-12 place-items-center rounded-full transition',
                    isActive && 'bg-emerald-50',
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.4 : 2} />
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export function PageHeader({
  title,
  subtitle,
  back,
  actions,
  children,
}: {
  title: string
  subtitle?: ReactNode
  /** path to go back to, or true for history back */
  back?: string | boolean
  actions?: ReactNode
  children?: ReactNode
}) {
  const navigate = useNavigate()
  return (
    <header className="pt-safe sticky top-0 z-30 border-b border-stone-200/70 bg-stone-50/90 backdrop-blur">
      <div className="flex min-h-14 items-center gap-1 px-2">
        {back ? (
          <button
            aria-label="Back"
            onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-stone-700 active:bg-stone-200"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        ) : (
          <div className="w-2" />
        )}
        <div className="min-w-0 flex-1 py-2">
          <h1 className="truncate text-lg leading-tight font-bold text-stone-900">{title}</h1>
          {subtitle && <div className="truncate text-xs font-medium text-stone-500">{subtitle}</div>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1 pr-1">{actions}</div>}
      </div>
      {children && <div className="px-4 pb-3">{children}</div>}
    </header>
  )
}
