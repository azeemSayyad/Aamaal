import { Bell, BellOff, BellRing, ChevronDown, LocateFixed, MapPin } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { BottomNav, NAV_SPACE, PageHeader } from '../components/layout'
import { Button, Card, EmptyState, Sheet } from '../components/ui'
import {
  CITIES,
  formatCountdown,
  AUTO,
  formatHHMM,
  formatJamaat,
  jamaatOptions,
  formatTime,
  locateDevice,
  namazJamaat,
  namazLocation,
  PRAYER_NAMES,
  useNamaz,
  useNow,
  type JamaatSettings,
  type SalahKey,
  type SalahRange,
} from '../lib/namaz'
import { pushSupport, syncJamaatPush } from '../lib/push'
import { errMsg } from '../lib/utils'
import { cn } from '../lib/utils'

/** Full day of prayer times for the saved location (/namaz). Works offline, no login needed. */
export function NamazPage() {
  const now = useNow()
  const namaz = useNamaz(now)
  const [sheet, setSheet] = useState<'location' | 'jamaat' | null>(null)
  const jamaat = namazJamaat.use()
  const [showExtras, setShowExtras] = useState(true)

  return (
    <div className={cn('mx-auto min-h-dvh max-w-lg bg-stone-50 sm:border-x sm:border-stone-200', NAV_SPACE)}>
      <PageHeader
        title="Namaz times"
        subtitle={
          namaz ? `${namaz.loc.label} · ${now.toLocaleDateString([], { day: 'numeric', month: 'short' })}` : undefined
        }

        actions={
          namaz && (
            <>
              <Button size="icon" variant="ghost" aria-label="Change location" onClick={() => setSheet('location')}>
                <MapPin className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Jamaat times & reminders"
                onClick={() => setSheet('jamaat')}
              >
                <Bell className="h-5 w-5" />
              </Button>
            </>
          )
        }
      />

      {!namaz ? (
        <div className="px-4 pt-6">
          <EmptyState
            icon={<MapPin className="h-6 w-6" />}
            title="Set your location"
            description="Times are calculated for your exact place, on this phone."
            action={<Button onClick={() => setSheet('location')}>Choose location</Button>}
          />
        </div>
      ) : (
        <div className="space-y-4 px-4 pt-4 pb-8">
          <NowCard namaz={namaz} now={now} jamaat={jamaat} />

          {/* Today */}
          <Card className="divide-y divide-stone-100 overflow-hidden">
            {namaz.ranges.map((r) => (
              <TimeRow
                key={r.key}
                name={PRAYER_NAMES[r.key]}
                value={`${formatTime(r.start)} – ${formatTime(r.end)}`}
                active={namaz.current === r.key}
                jamaat={jamaat.times[r.key] ? formatJamaat(jamaat.times[r.key]!, r) : undefined}
                notify={!!jamaat.notify[r.key]}
              />
            ))}
          </Card>
          <button
            onClick={() => setSheet('jamaat')}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-stone-300 py-3 text-sm font-semibold text-stone-500 active:bg-stone-100"
          >
            <Bell className="h-4 w-4" />
            {Object.values(jamaat.times).some(Boolean)
              ? 'Edit jamaat times & reminders'
              : 'Set your masjid jamaat times'}
          </button>

          {/* Extras, collapsed by default */}
          <Card className="overflow-hidden">
            <button
              onClick={() => setShowExtras((v) => !v)}
              aria-expanded={showExtras}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-stone-700"
            >
              <span>
                More times
                {!showExtras && namaz.currentExtra && (
                  <span
                    className={cn(
                      'ml-2 rounded-full px-2 py-0.5 text-xs font-semibold',
                      namaz.extras.find((e) => e.key === namaz.currentExtra)?.forbidden
                        ? 'bg-orange-50 text-orange-700'
                        : 'bg-emerald-50 text-emerald-700',
                    )}
                  >
                    {namaz.extras.find((e) => e.key === namaz.currentExtra)?.label} now
                  </span>
                )}
              </span>
              <ChevronDown className={cn('h-4 w-4 text-stone-400 transition-transform', showExtras && 'rotate-180')} />
            </button>
            {showExtras && (
              <div className="divide-y divide-stone-100 border-t border-stone-100">
                {namaz.extras.map((e) => (
                  <TimeRow
                    key={e.key}
                    name={e.label}
                    value={
                      e.start && e.end
                        ? `${formatTime(e.start)} – ${formatTime(e.end)}`
                        : e.end
                          ? `until ${formatTime(e.end)}`
                          : `at ${formatTime(e.start!)}`
                    }
                    active={namaz.currentExtra === e.key}
                    warn={e.forbidden}
                  />
                ))}
              </div>
            )}
          </Card>

          <p className="text-center text-[11px] text-stone-400">Hanafi Asr · Karachi method (Fajr &amp; Isha 18°)</p>
        </div>
      )}

      {sheet === 'location' && <LocationSheet onClose={() => setSheet(null)} />}
      {sheet === 'jamaat' && <JamaatSheet ranges={namaz?.ranges ?? []} onClose={() => setSheet(null)} />}
      <BottomNav />
    </div>
  )
}

/**
 * The time it is now: the salah in progress with its window, or between Sunrise and Zuhr the
 * current window (Sunrise / Ishraq / Zawal) with the next salah underneath.
 */
function NowCard({
  namaz,
  now,
  jamaat,
}: {
  namaz: NonNullable<ReturnType<typeof useNamaz>>
  now: Date
  jamaat: JamaatSettings
}) {
  const salah = namaz.currentRange
  const extra = salah ? undefined : namaz.extras.find((e) => e.key === namaz.currentExtra)
  const title = salah ? PRAYER_NAMES[salah.key] : (extra?.label ?? PRAYER_NAMES[namaz.next.key])
  const start = salah?.start ?? extra?.start
  const end = salah?.end ?? extra?.end
  const forbidden = !!extra?.forbidden
  const jamaatText = salah && jamaat.times[salah.key] ? `Jamaat ${formatJamaat(jamaat.times[salah.key]!, salah)}` : null

  return (
    <div
      className={cn(
        'rounded-3xl bg-linear-to-br p-5 text-white shadow-lg',
        // No salah allowed now (Sunrise, Zawal): warning colours
        forbidden
          ? 'from-orange-500 via-orange-600 to-red-700 shadow-orange-900/20'
          : 'from-emerald-600 via-emerald-700 to-teal-800 shadow-emerald-900/20',
      )}
    >
      <div
        className={cn(
          'text-xs font-semibold tracking-wider uppercase',
          forbidden ? 'text-orange-100' : 'text-emerald-100/90',
        )}
      >
        Now
      </div>
      {/* Long names (e.g. "Sunrise (no salah)") push the time range onto its own line */}
      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="text-3xl font-extrabold">{title}</span>
        {start && end && (
          <span className="shrink-0 text-lg font-bold tabular-nums">
            {formatTime(start)} – {formatTime(end)}
          </span>
        )}
      </div>
      <div className={cn('mt-1 text-sm', forbidden ? 'text-orange-100' : 'text-emerald-100')}>
        {salah ? (
          <>
            ends in {formatCountdown(salah.end.getTime() - now.getTime())}
            {jamaatText && ` · ${jamaatText}`}
          </>
        ) : (
          <>
            {PRAYER_NAMES[namaz.next.key]} at {formatTime(namaz.next.at)} · in{' '}
            {formatCountdown(namaz.next.at.getTime() - now.getTime())}
          </>
        )}
      </div>
    </div>
  )
}

function TimeRow({
  name,
  time,
  value,
  muted,
  active,
  warn,
  jamaat,
  notify,
}: {
  name: string
  time?: Date
  value?: string
  muted?: boolean
  active?: boolean
  /** No-salah window: highlighted in orange when active */
  warn?: boolean
  /** masjid jamaat time, already formatted */
  jamaat?: string
  notify?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-3',
        active && 'shadow-[inset_3px_0_0]',
        active && (warn ? 'bg-orange-50 shadow-orange-500' : 'bg-emerald-50 shadow-emerald-600'),
      )}
    >
      <span className="min-w-0">
        <span className={cn('block text-[15px] font-semibold', muted ? 'text-stone-400' : 'text-stone-800')}>
          {name}
        </span>
        {jamaat && (
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
            {notify && <BellRing className="h-3 w-3" aria-label="Reminder on" />}
            Jamaat {jamaat}
          </span>
        )}
      </span>
      <span className={cn('text-[15px] font-bold tabular-nums', muted ? 'text-stone-400' : 'text-stone-900')}>
        {value ?? (time ? formatTime(time) : '')}
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function LocationSheet({ onClose }: { onClose: () => void }) {
  const [locating, setLocating] = useState(false)

  const useDevice = async () => {
    setLocating(true)
    try {
      namazLocation.write(await locateDevice())
      toast.success('Location saved')
      onClose()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLocating(false)
    }
  }

  return (
    <Sheet open onClose={onClose} title="Location">
      <div className="space-y-4">
        <Button block size="lg" onClick={useDevice} loading={locating}>
          {!locating && <LocateFixed className="h-5 w-5" />} Use my current location
        </Button>
        <div className="text-center text-xs font-semibold text-stone-400 uppercase">or pick a city</div>
        <ul className="max-h-[45dvh] divide-y divide-stone-100 overflow-y-auto rounded-xl border border-stone-200">
          {CITIES.map((c) => (
            <li key={c.label}>
              <button
                onClick={() => {
                  namazLocation.write(c)
                  onClose()
                }}
                className="w-full px-4 py-3 text-left text-[15px] font-medium text-stone-800 active:bg-stone-50"
              >
                {c.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  )
}

/** Upper limit for "notify before" (minutes) — matches the server check */
const MAX_LEAD_MIN = 120

/**
 * Jamaat times: tap a salah to pick from ready-made times (or Custom); Maghrib follows its start time.
 * Bells are optimistic — they switch instantly and sync in the background, reverting only on error.
 */
function JamaatSheet({ ranges, onClose }: { ranges: SalahRange[]; onClose: () => void }) {
  const settings = namazJamaat.use()
  const support = pushSupport()
  const [open, setOpen] = useState<SalahKey | null>(null)

  /** Save locally at once, then sync the server copy if reminders are (or were) involved */
  const save = (next: JamaatSettings, opts: { askPermission?: boolean; revertTo?: JamaatSettings } = {}) => {
    const prev = settings
    namazJamaat.write(next)
    const hasReminders = (s: JamaatSettings) => Object.entries(s.notify).some(([k, on]) => on && s.times[k as SalahKey])
    if (!hasReminders(next) && !hasReminders(prev)) return
    syncJamaatPush(next, !!opts.askPermission).catch((e) => {
      if (opts.revertTo) namazJamaat.write(opts.revertTo)
      toast.error(errMsg(e))
    })
  }

  const pick = (k: SalahKey, value: string | undefined) => {
    const times = { ...settings.times, [k]: value }
    const notify = value ? settings.notify : { ...settings.notify, [k]: false }
    save({ ...settings, times, notify })
    setOpen(null)
  }

  const toggleNotify = (r: SalahRange) => {
    const k = r.key
    const isAuto = jamaatOptions(r) === AUTO
    const time = settings.times[k] ?? (isAuto ? AUTO : undefined)
    if (!time) {
      setOpen(k)
      return toast('Pick a jamaat time first')
    }
    if (support === 'ios-install') return toast('On iPhone, add Aamaal to your Home Screen first')
    if (support === 'unsupported') return toast("This browser can't show notifications")
    const on = !settings.notify[k]
    const next = { ...settings, times: { ...settings.times, [k]: time }, notify: { ...settings.notify, [k]: on } }
    save(next, { askPermission: on, revertTo: on ? settings : undefined })
  }

  return (
    <Sheet open onClose={onClose} title="Jamaat times">
      <div className="space-y-4">
        <div className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200">
          {ranges.map((r) => {
            const options = jamaatOptions(r)
            const isAuto = options === AUTO
            const value = settings.times[r.key] ?? (isAuto ? AUTO : undefined)
            const on = !!settings.notify[r.key] && !!value
            const expanded = open === r.key && !isAuto
            return (
              <div key={r.key}>
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <button
                    onClick={() => !isAuto && setOpen(expanded ? null : r.key)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    aria-expanded={isAuto ? undefined : expanded}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold text-stone-800">{PRAYER_NAMES[r.key]}</span>
                      <span className="block text-[11px] text-stone-400">
                        {formatTime(r.start)} – {formatTime(r.end)}
                      </span>
                    </span>
                    {isAuto ? (
                      <span className="text-right text-xs font-semibold text-stone-500">
                        At start · {formatTime(r.start)}
                      </span>
                    ) : (
                      <span
                        className={cn(
                          'flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-bold',
                          value ? 'bg-emerald-50 text-emerald-800' : 'bg-stone-100 text-stone-500',
                        )}
                      >
                        {value ? formatJamaat(value, r) : 'Choose'}
                        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} />
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => toggleNotify(r)}
                    aria-pressed={on}
                    aria-label={
                      on ? `Turn off ${PRAYER_NAMES[r.key]} reminder` : `Remind me for ${PRAYER_NAMES[r.key]}`
                    }
                    className={cn(
                      'grid h-10 w-10 shrink-0 place-items-center rounded-full transition active:scale-90',
                      on ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-500',
                    )}
                  >
                    {on ? <BellRing className="h-[18px] w-[18px]" /> : <BellOff className="h-[18px] w-[18px]" />}
                  </button>
                </div>

                {expanded && Array.isArray(options) && (
                  <TimeChoices
                    options={options}
                    value={value}
                    onPick={(v) => pick(r.key, v)}
                    onClear={value ? () => pick(r.key, undefined) : undefined}
                  />
                )}
              </div>
            )
          })}
        </div>

        <label className="flex items-center justify-between gap-3 rounded-2xl bg-stone-50 px-3 py-2.5">
          <span>
            <span className="block text-sm font-semibold text-stone-700">Notify before jamaat</span>
            <span className="block text-[11px] text-stone-400">Time you need to reach your masjid</span>
          </span>
          <LeadInput value={settings.lead} onCommit={(v) => save({ ...settings, lead: v })} />
        </label>

        {support === 'ios-install' && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
            On iPhone, add Aamaal to your Home Screen (Share → Add to Home Screen) to get reminders.
          </p>
        )}
      </div>
    </Sheet>
  )
}

/** Scrollable grid of ready-made times, then "Custom" (native time picker) below it */
function TimeChoices({
  options,
  value,
  onPick,
  onClear,
}: {
  options: string[]
  value?: string
  onPick: (v: string) => void
  onClear?: () => void
}) {
  const [custom, setCustom] = useState(!!value && !options.includes(value))
  // Long lists scroll inside their box; start with the chosen time in view
  const list = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const box = list.current
    const chosen = box?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (box && chosen) box.scrollTop = chosen.offsetTop - box.clientHeight / 2 + chosen.offsetHeight / 2
  }, [])
  return (
    <div className="bg-stone-50 px-3 pt-1 pb-3">
      <div ref={list} className="relative grid max-h-52 grid-cols-4 gap-1.5 overflow-y-auto overscroll-contain p-0.5">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onPick(o)}
            aria-pressed={value === o}
            className={cn(
              'h-9 rounded-lg text-[13px] font-semibold tabular-nums transition active:scale-95',
              value === o ? 'bg-emerald-600 text-white' : 'bg-white text-stone-700 ring-1 ring-stone-200',
            )}
          >
            {formatHHMM(o).replace(' ', '\u00a0')}
          </button>
        ))}
      </div>
      <button
        onClick={() => setCustom((c) => !c)}
        className={cn(
          'mt-1.5 h-9 w-full rounded-lg text-[13px] font-semibold transition active:scale-95',
          custom ? 'bg-stone-800 text-white' : 'bg-white text-stone-700 ring-1 ring-stone-200',
        )}
      >
        Custom
      </button>
      {custom && (
        <input
          type="time"
          // Open the picker on a tap anywhere in the box, not only on the small clock icon
          onClick={(e) => {
            try {
              e.currentTarget.showPicker()
            } catch {
              /* older browsers: the native control still works */
            }
          }}
          defaultValue={value && !options.includes(value) ? value : undefined}
          onChange={(e) => e.target.value && onPick(e.target.value)}
          aria-label="Custom jamaat time"
          className="mt-2 h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-center text-base font-bold tabular-nums outline-none focus:border-emerald-600"
        />
      )}
      {onClear && (
        <button onClick={onClear} className="mt-2 w-full text-center text-xs font-semibold text-stone-400">
          Clear jamaat time
        </button>
      )}
    </div>
  )
}

/** Typable minutes (0–120); saves on blur or Enter so typing "15" doesn't save "1" first */
function LeadInput({ value, onCommit }: { value: number; onCommit: (v: number) => void }) {
  const [text, setText] = useState(String(value))
  const commit = () => {
    const n = Math.round(Number(text))
    if (text.trim() === '' || Number.isNaN(n)) return setText(String(value))
    const v = Math.max(0, Math.min(MAX_LEAD_MIN, n))
    setText(String(v))
    if (v !== value) onCommit(v)
  }
  return (
    <span className="flex h-10 shrink-0 items-center rounded-xl border border-stone-300 bg-white pr-2.5 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/15">
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={MAX_LEAD_MIN}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
        onFocus={(e) => e.target.select()}
        aria-label="Minutes before jamaat"
        className="w-12 [appearance:textfield] bg-transparent text-center text-base font-bold tabular-nums outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <span className="text-xs text-stone-400">min</span>
    </span>
  )
}
