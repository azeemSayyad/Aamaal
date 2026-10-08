import { Check, Loader2, Minus, Plane, Plus, Sparkles, X } from 'lucide-react'
import {
  useEffect,
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../lib/utils'

/* ------------------------------------------------------------------ */
/* Button                                                              */
/* ------------------------------------------------------------------ */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  loading?: boolean
  block?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  block,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600',
        {
          primary: 'bg-emerald-700 text-white shadow-sm hover:bg-emerald-800',
          secondary: 'border border-stone-300 bg-white text-stone-800 hover:bg-stone-50',
          ghost: 'text-stone-700 hover:bg-stone-200/60',
          danger: 'bg-red-600 text-white hover:bg-red-700',
          soft: 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
        }[variant],
        {
          sm: 'h-9 px-3 text-sm',
          md: 'h-11 px-4 text-[15px]',
          lg: 'h-12 px-5 text-base',
          icon: 'h-10 w-10',
        }[size],
        block && 'w-full',
        className,
      )}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Form fields                                                         */
/* ------------------------------------------------------------------ */

const fieldCls =
  'w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-stone-900 placeholder:text-stone-400 shadow-xs outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 disabled:bg-stone-100'

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: string
  hint?: string
  error?: string
  children: ReactNode
  htmlFor?: string
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-stone-700">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-stone-500">{hint}</p>
      ) : null}
    </div>
  )
}

export function Input({
  label,
  hint,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string }) {
  const id = useId()
  const input = <input id={id} {...rest} className={cn(fieldCls, className)} />
  return label ? (
    <Field label={label} hint={hint} htmlFor={id}>
      {input}
    </Field>
  ) : (
    input
  )
}

export function Textarea({
  label,
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  const id = useId()
  const el = <textarea id={id} rows={3} {...rest} className={cn(fieldCls, 'resize-none', className)} />
  return label ? (
    <Field label={label} htmlFor={id}>
      {el}
    </Field>
  ) : (
    el
  )
}

export function Select({
  label,
  hint,
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { label?: string; hint?: string }) {
  const id = useId()
  const el = (
    <select
      id={id}
      {...rest}
      className={cn(
        fieldCls,
        'appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%2378716c%22%3E%3Cpath%20d%3D%22M5.3%207.3a1%201%200%200%201%201.4%200L10%2010.6l3.3-3.3a1%201%200%201%201%201.4%201.4l-4%204a1%201%200%200%201-1.4%200l-4-4a1%201%200%200%201%200-1.4z%22/%3E%3C/svg%3E")] bg-[length:20px] bg-[right_0.75rem_center] bg-no-repeat pr-10',
        className,
      )}
    >
      {children}
    </select>
  )
  return label ? (
    <Field label={label} hint={hint} htmlFor={id}>
      {el}
    </Field>
  ) : (
    el
  )
}

export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-stone-200 bg-white px-3.5 py-3 text-left"
    >
      <span>
        <span className="block text-[15px] font-medium text-stone-800">{label}</span>
        {description && <span className="block text-xs text-stone-500">{description}</span>}
      </span>
      <span
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition',
          checked ? 'bg-emerald-600' : 'bg-stone-300',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
            checked ? 'left-[22px]' : 'left-0.5',
          )}
        />
      </span>
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Square pastel tile for Jamaat categories                            */
/* ------------------------------------------------------------------ */

// Full class strings so Tailwind can see them
const TILE_PALETTES = [
  {
    off: 'from-sky-50 to-indigo-100',
    on: 'from-sky-200 to-indigo-300',
    text: 'text-indigo-900',
    ring: 'ring-indigo-400',
  },
  {
    off: 'from-emerald-50 to-teal-100',
    on: 'from-emerald-200 to-teal-300',
    text: 'text-teal-900',
    ring: 'ring-teal-500',
  },
  {
    off: 'from-amber-50 to-orange-100',
    on: 'from-amber-200 to-orange-300',
    text: 'text-orange-900',
    ring: 'ring-orange-400',
  },
  { off: 'from-rose-50 to-pink-100', on: 'from-rose-200 to-pink-300', text: 'text-pink-900', ring: 'ring-pink-400' },
  {
    off: 'from-violet-50 to-fuchsia-100',
    on: 'from-violet-200 to-fuchsia-300',
    text: 'text-fuchsia-900',
    ring: 'ring-fuchsia-400',
  },
  {
    off: 'from-lime-50 to-green-100',
    on: 'from-lime-200 to-green-300',
    text: 'text-green-900',
    ring: 'ring-green-500',
  },
]

/** "40 Days" → { value: "40", unit: "Days" }; anything else → null */
function splitNumericLabel(label: string) {
  const m = label.match(/^(\d+)\s*(.*)$/)
  return m ? { value: m[1], unit: m[2] } : null
}

const ABROAD_RE = /bairun|abroad|foreign/i

export function CategoryTile({
  label,
  selected,
  onClick,
  colorIndex,
}: {
  label: string
  selected: boolean
  onClick: () => void
  colorIndex: number
}) {
  const palette = TILE_PALETTES[colorIndex % TILE_PALETTES.length]
  const numeric = splitNumericLabel(label)
  const Icon = ABROAD_RE.test(label) ? Plane : Sparkles

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={label}
      className={cn(
        'relative flex h-16 flex-col items-center justify-center overflow-hidden rounded-xl bg-linear-to-br px-1 text-center transition duration-200 active:scale-95',
        palette.text,
        selected ? cn(palette.on, 'shadow-md ring-2', palette.ring) : cn(palette.off, 'shadow-xs'),
      )}
    >
      {/* Selection badge */}
      <span
        aria-hidden
        className={cn(
          'absolute top-1 right-1 grid h-3 w-3 place-items-center rounded-full transition',
          selected ? 'bg-white shadow-sm' : 'border border-white/90 bg-white/40',
        )}
      >
        {selected && <Check className="h-2 w-2" strokeWidth={4} />}
      </span>

      {numeric ? (
        <>
          <span className="text-lg leading-none font-extrabold tracking-tight">{numeric.value}</span>
          <span className="mt-0.5 text-[10px] font-semibold opacity-75">{numeric.unit}</span>
        </>
      ) : (
        <>
          <Icon className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
          <span className="mt-0.5 text-[11px] leading-tight font-bold">{label}</span>
        </>
      )}
    </button>
  )
}

/** Text input with a leading icon and no label (placeholder acts as label) */
export function IconInput({ icon, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { icon: ReactNode }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 [&_svg]:h-4 [&_svg]:w-4 text-stone-400">
        {icon}
      </span>
      <input
        {...rest}
        aria-label={rest['aria-label'] ?? rest.placeholder}
        className={cn(
          'h-14 w-full rounded-2xl border border-transparent bg-stone-100/80 pr-4 pl-11 text-[17px] text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10',
          className,
        )}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Counter used for Jamaat categories                                  */
/* ------------------------------------------------------------------ */

export function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  if (value === 0) {
    return (
      <button
        type="button"
        onClick={() => onChange(1)}
        className="h-9 rounded-full border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-600 transition active:scale-95"
      >
        Add
      </button>
    )
  }
  return (
    <div className="flex items-center rounded-full bg-emerald-700 text-white shadow-sm">
      <button
        type="button"
        aria-label="Decrease"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="grid h-9 w-9 place-items-center rounded-full active:bg-emerald-800"
      >
        <Minus className="h-4 w-4" />
      </button>
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/\D/g, '') || '0', 10)
          onChange(Math.min(999, n))
        }}
        onFocus={(e) => e.target.select()}
        className="w-8 bg-transparent text-center text-[15px] font-bold outline-none"
        aria-label="Count"
      />
      <button
        type="button"
        aria-label="Increase"
        onClick={() => onChange(Math.min(999, value + 1))}
        className="grid h-9 w-9 place-items-center rounded-full active:bg-emerald-800"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Bottom sheet                                                        */
/* ------------------------------------------------------------------ */

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="animate-fade-in absolute inset-0 bg-stone-950/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="animate-sheet-up relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-stone-300 sm:hidden" />
        {title && (
          <div className="flex items-center justify-between px-5 pt-3 pb-2">
            <h2 className="text-lg font-bold text-stone-900">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 grid h-9 w-9 place-items-center rounded-full text-stone-500 hover:bg-stone-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 pb-5">{children}</div>
        {footer && (
          <div className="border-t border-stone-100 px-5 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmSheet({
  open,
  onClose,
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  loading,
}: {
  open: boolean
  onClose: () => void
  title: string
  message: ReactNode
  confirmLabel?: string
  onConfirm: () => void
  loading?: boolean
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="text-[15px] text-stone-600">{message}</div>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Sheet>
  )
}

/** A list of tappable actions inside a sheet */
export function ActionList({
  actions,
}: {
  actions: { label: string; icon: ReactNode; onClick: () => void; danger?: boolean; hidden?: boolean }[]
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200">
      {actions
        .filter((a) => !a.hidden)
        .map((a) => (
          <button
            key={a.label}
            onClick={a.onClick}
            className={cn(
              'flex w-full items-center gap-3 border-b border-stone-100 px-4 py-3.5 text-left text-[15px] font-medium last:border-0 active:bg-stone-50',
              a.danger ? 'text-red-600' : 'text-stone-800',
            )}
          >
            <span className={a.danger ? 'text-red-500' : 'text-stone-500'}>{a.icon}</span>
            {a.label}
          </button>
        ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Layout bits                                                         */
/* ------------------------------------------------------------------ */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('rounded-2xl border border-stone-200/80 bg-white shadow-xs', className)}>{children}</div>
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mt-6 mb-2 flex items-center justify-between px-1">
      <h3 className="text-xs font-semibold tracking-wider text-stone-500 uppercase">{children}</h3>
      {action}
    </div>
  )
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-6 w-6 animate-spin text-emerald-700', className)} />
}

export function PageLoader() {
  return (
    <div className="grid min-h-[50dvh] place-items-center">
      <Spinner />
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">{icon}</div>
      <p className="font-semibold text-stone-800">{title}</p>
      {description && <p className="mt-1 max-w-xs text-sm text-stone-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="m-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <p className="font-semibold">Couldn't load</p>
      <p className="mt-1">{(error as Error)?.message ?? 'Something went wrong'}</p>
      {onRetry && (
        <Button size="sm" variant="secondary" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

export function Badge({ children, tone = 'stone' }: { children: ReactNode; tone?: 'stone' | 'emerald' | 'amber' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
        {
          stone: 'bg-stone-100 text-stone-600',
          emerald: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600/15',
          amber: 'bg-amber-50 text-amber-800 ring-1 ring-amber-600/15',
        }[tone],
      )}
    >
      {children}
    </span>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  size?: 'sm' | 'md'
}) {
  return (
    <div className={cn('flex bg-stone-200/70', size === 'sm' ? 'rounded-full p-0.5' : 'rounded-xl p-1')}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            'flex-1 font-semibold transition',
            size === 'sm' ? 'rounded-full px-3 py-1 text-xs' : 'rounded-lg py-2 text-sm',
            value === o.value ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Level badge: a calm, distinct tint per level — not a ranking         */
/* ------------------------------------------------------------------ */

const LEVEL_TINTS = [
  'bg-stone-100 text-stone-600',
  'bg-sky-50 text-sky-700',
  'bg-emerald-50 text-emerald-700',
  'bg-amber-50 text-amber-700',
  'bg-violet-50 text-violet-700',
]

export function RankBadge({
  tier,
  label,
  prefix,
  count,
}: {
  /** 0 … 4 — only picks a tint so levels are easy to tell apart */
  tier: number
  label: string
  /** e.g. "Masturat" — shown small before the label */
  prefix?: string
  /** shown as ×n when > 1 */
  count?: number
}) {
  const tint = LEVEL_TINTS[Math.max(0, Math.min(LEVEL_TINTS.length - 1, tier))]
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1 rounded-full px-2 text-[11px] font-semibold whitespace-nowrap',
        tint,
      )}
    >
      {prefix && <span className="opacity-70">{prefix} ·</span>}
      {label}
      {count && count > 1 ? <span className="opacity-70">×{count}</span> : null}
    </span>
  )
}
