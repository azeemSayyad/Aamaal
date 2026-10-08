import { CalculationMethod, Coordinates, Madhab, PrayerTimes, SunnahTimes } from 'adhan'
import { useEffect, useMemo, useState } from 'react'
import { localStore } from './localStore'

/*
 * Prayer times calculated on the device (astronomical, no API, works offline) with the
 * Adhan library. Defaults for the Indian subcontinent: Karachi method (Fajr/Isha 18°)
 * and Hanafi Asr. Users can also save their masjid's jamaat times (and get notified).
 */

export type NamazLocation = { lat: number; lng: number; label: string }
export const namazLocation = localStore<NamazLocation | null>('aamaal.namaz.location', null)

export const PRAYERS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const
export type PrayerKey = (typeof PRAYERS)[number]

export const PRAYER_NAMES: Record<PrayerKey, string> = {
  fajr: 'Fajr',
  sunrise: 'Sunrise',
  dhuhr: 'Zuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
}

/** The user's masjid jamaat times ("HH:MM", local) and which ones to be notified about */
export type JamaatSettings = {
  times: Partial<Record<SalahKey, string>>
  notify: Partial<Record<SalahKey, boolean>>
  /** Minutes before jamaat to notify (0 = at jamaat time) */
  lead: number
}
export const namazJamaat = localStore<JamaatSettings>('aamaal.namaz.jamaat', { times: {}, notify: {}, lead: 10 })

/** Minutes after sunrise for Ishraq, and the Zawal (no-salah) window before Zuhr */
const ISHRAQ_AFTER_SUNRISE_MIN = 20
const ZAWAL_BEFORE_DHUHR_MIN = 10

const addMinutes = (d: Date, m: number) => new Date(d.getTime() + m * 60_000)

export type DayTimes = {
  times: Record<PrayerKey, Date>
  /** Start of the last third of the night that follows this day's Isha */
  lastThird: Date
}

export function calculateDay(loc: NamazLocation, date: Date): DayTimes {
  const params = CalculationMethod.Karachi()
  params.madhab = Madhab.Hanafi
  const pt = new PrayerTimes(new Coordinates(loc.lat, loc.lng), date, params)
  const times = Object.fromEntries(PRAYERS.map((k) => [k, pt[k]])) as Record<PrayerKey, Date>
  return { times, lastThird: new SunnahTimes(pt).lastThirdOfTheNight }
}

/** Extra (nafl / forbidden / Ramadan) times. A missing start or end means a single moment. */
export type ExtraTime = { key: string; label: string; start?: Date; end?: Date; forbidden?: boolean }

/** Current time, re-rendering every `ms` */
export function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

export const SALAH = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const
export type SalahKey = (typeof SALAH)[number]

/** Each salah runs from its start until the next one begins (Fajr until sunrise, Isha until tomorrow's Fajr) */
export type SalahRange = { key: SalahKey; start: Date; end: Date }

/** Today's times, each salah's range, the next salah, and the one currently in progress (with its window) */
export function useNamaz(now: Date) {
  const loc = namazLocation.use()
  const dayKey = now.toDateString()

  // Full calculation only when the location or the date changes
  const days = useMemo(() => {
    if (!loc) return null
    const midnight = new Date(dayKey)
    const today = calculateDay(loc, midnight)
    const tomorrow = calculateDay(loc, addMinutes(midnight, 24 * 60 + 60))
    const yesterday = calculateDay(loc, addMinutes(midnight, -12 * 60))
    const t = today.times
    const ranges: SalahRange[] = [
      { key: 'fajr', start: t.fajr, end: t.sunrise },
      { key: 'dhuhr', start: t.dhuhr, end: t.asr },
      { key: 'asr', start: t.asr, end: t.maghrib },
      { key: 'maghrib', start: t.maghrib, end: t.isha },
      { key: 'isha', start: t.isha, end: tomorrow.times.fajr },
    ]
    return { loc, today, ranges, tomorrowFajr: tomorrow.times.fajr, yesterday }
  }, [loc, dayKey])

  if (!days) return null
  const next: { key: SalahKey; at: Date } = days.ranges
    .map((r) => ({ key: r.key, at: r.start }))
    .find((p) => p.at > now) ?? { key: 'fajr', at: days.tomorrowFajr }
  // After midnight and before Fajr, it is still last night's Isha
  const currentRange: SalahRange | null =
    days.ranges.find((r) => r.start <= now && now < r.end) ??
    (now < days.today.times.fajr && now >= days.yesterday.times.isha
      ? { key: 'isha', start: days.yesterday.times.isha, end: days.today.times.fajr }
      : null)
  const current = currentRange?.key ?? null

  // Night-time windows: before today's Fajr they belong to last night, after it to tonight
  const t = days.today.times
  const beforeFajr = now < t.fajr
  const night = beforeFajr
    ? { lastThird: days.yesterday.lastThird, fajr: t.fajr }
    : { lastThird: days.today.lastThird, fajr: days.tomorrowFajr }
  const ishraq = addMinutes(t.sunrise, ISHRAQ_AFTER_SUNRISE_MIN)
  const zawalStart = addMinutes(t.dhuhr, -ZAWAL_BEFORE_DHUHR_MIN)
  const extras: ExtraTime[] = [
    { key: 'sunrise', label: 'Sunrise (no salah)', start: t.sunrise, end: ishraq, forbidden: true },
    { key: 'ishraq', label: 'Ishraq / Chasht', start: ishraq, end: zawalStart },
    { key: 'zawal', label: 'Zawal (no salah)', start: zawalStart, end: t.dhuhr, forbidden: true },
    { key: 'tahajjud', label: 'Tahajjud', start: night.lastThird, end: night.fajr },
    { key: 'sehri', label: 'Sehri', end: night.fajr },
    { key: 'iftar', label: 'Iftar', start: t.maghrib },
  ]
  const currentExtra = extras.find((e) => e.start && e.end && e.start <= now && now < e.end)?.key ?? null

  return { ...days, next, current, currentRange, extras, currentExtra }
}

/** Always 12-hour, e.g. "4:12 PM" (regardless of the phone's 24-hour setting) */
export const formatTime = (d: Date) =>
  d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

export function formatCountdown(ms: number) {
  const mins = Math.max(0, Math.round(ms / 60_000))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h ? `${h}h ${m}m` : `${m}m`
}

/** Ask the device for its position (one-time permission prompt) */
export function locateDevice(): Promise<NamazLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Location is not available on this device'))
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: Math.round(pos.coords.latitude * 1e4) / 1e4,
          lng: Math.round(pos.coords.longitude * 1e4) / 1e4,
          label: 'Current location',
        }),
      (err) =>
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? 'Location permission denied — pick your city instead'
              : "Couldn't get your location — pick your city instead",
          ),
        ),
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 10 * 60_000 },
    )
  })
}

/** Fallback when location permission is refused */
export const CITIES: NamazLocation[] = [
  { label: 'Kothagudem', lat: 17.5508, lng: 80.6196 },
  { label: 'Bhadrachalam', lat: 17.6688, lng: 80.8936 },
  { label: 'Khammam', lat: 17.2473, lng: 80.1514 },
  { label: 'Warangal', lat: 17.9689, lng: 79.5941 },
  { label: 'Hyderabad', lat: 17.385, lng: 78.4867 },
  { label: 'Vijayawada', lat: 16.5062, lng: 80.648 },
  { label: 'Visakhapatnam', lat: 17.6868, lng: 83.2185 },
  { label: 'Nagpur', lat: 21.1458, lng: 79.0882 },
  { label: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
  { label: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { label: 'Mumbai', lat: 19.076, lng: 72.8777 },
  { label: 'Pune', lat: 18.5204, lng: 73.8567 },
  { label: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
  { label: 'Bhopal', lat: 23.2599, lng: 77.4126 },
  { label: 'Lucknow', lat: 26.8467, lng: 80.9462 },
  { label: 'Delhi', lat: 28.6139, lng: 77.209 },
  { label: 'Kolkata', lat: 22.5726, lng: 88.3639 },
]

/** "16:45" → "4:45 PM" */
export function formatHHMM(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  return formatTime(new Date(2000, 0, 1, h, m))
}

/** Date → "HH:MM" (local), for <input type="time"> bounds */
export const toHHMM = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

/* ------------------------------------------------------------------ */
/* Smart jamaat-time choices                                           */
/* ------------------------------------------------------------------ */

/** Maghrib jamaat follows the daily Maghrib start time */
export const AUTO = 'auto'

const minutesOf = (d: Date) => d.getHours() * 60 + d.getMinutes() + (d.getSeconds() > 0 ? 1 : 0)
const ceilTo = (m: number, step: number) => Math.ceil(m / step) * step
const hhmmOf = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

function steps(from: number, to: number, step: number) {
  const out: string[] = []
  for (let m = from; m <= to; m += step) out.push(hhmmOf(m))
  return out
}

/** Common Zuhr jamaat times, in time order */
const ZUHR_OPTIONS = ['12:45', '13:00', '13:15', '13:30', '13:45', '14:00']
/** Isha choices stop here */
const ISHA_LAST = 21 * 60

/**
 * Ready-made jamaat choices for a salah window ("HH:MM"), or AUTO for Maghrib.
 *  - Fajr, Asr: from start + 5 min (rounded up to :x0/:x5), every 5 min, until 10 min before the window ends
 *  - Zuhr: fixed common times
 *  - Isha: quarter hours (:00/:15/:30/:45) from the first one after Isha begins, until 9:00 PM
 */
export function jamaatOptions(range: SalahRange): string[] | typeof AUTO {
  const start = minutesOf(range.start)
  switch (range.key) {
    case 'fajr':
    case 'asr':
      return steps(ceilTo(start + 5, 5), minutesOf(range.end) - 10, 5)
    case 'dhuhr':
      return ZUHR_OPTIONS
    case 'maghrib':
      return AUTO
    case 'isha':
      return steps(ceilTo(start, 15), ISHA_LAST, 15)
  }
}

/** Display a saved jamaat value; AUTO shows today's Maghrib start */
export function formatJamaat(value: string, range?: SalahRange) {
  if (value === AUTO) return range ? formatTime(range.start) : 'Maghrib time'
  return formatHHMM(value)
}
