import { AUTO, namazLocation, type JamaatSettings } from './namaz'

/*
 * Web Push for jamaat reminders. The device subscribes with the browser's push service and
 * sends its schedule to Supabase (shared with the Dawat app — only this table is used); the namaz-push Edge Function (run every minute by pg_cron)
 * delivers the notifications, even when the app is closed.
 */

/** Public VAPID key (safe to ship; the private key lives only in Edge Function secrets) */
const VAPID_PUBLIC_KEY = 'BMxorOClU9aKvHPWOPXI4us9RXcx-dx52J4FPvQMTrRJWnrZKelLQvLEg7Xi4z3kAsBE4_Kdu73ZXOlM87gGIZU'

export type PushSupport = 'ok' | 'ios-install' | 'unsupported'

/** iPhones only allow web push for apps added to the Home Screen (iOS 16.4+) */
export function pushSupport(): PushSupport {
  const hasApis = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  if (hasApis) return 'ok'
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches
  return ios && !standalone ? 'ios-install' : 'unsupported'
}

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

async function serviceWorker(): Promise<ServiceWorkerRegistration> {
  // In local dev there is no service worker, so don't wait forever
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Notifications work in the installed / deployed app')), 5000),
    ),
  ])
}

async function getSubscription(create: boolean): Promise<PushSubscription | null> {
  const reg = await serviceWorker()
  const existing = await reg.pushManager.getSubscription()
  if (existing || !create) return existing

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Notifications are blocked — allow them in your browser / phone settings')
  }
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  })
}

/**
 * Send the current jamaat schedule to the server.
 * `askPermission` should be true only when called from a tap (browsers require a user gesture).
 */
export async function syncJamaatPush(settings: JamaatSettings, askPermission: boolean) {
  const schedule = Object.fromEntries(
    Object.entries(settings.times).filter(([k, t]) => t && settings.notify[k as keyof JamaatSettings['notify']]),
  )

  if (Object.keys(schedule).length === 0) {
    if (pushSupport() !== 'ok') return
    const sub = await getSubscription(false).catch(() => null)
    if (sub) await rpc('delete_push_subscription', { p_endpoint: sub.endpoint })
    return
  }

  if (pushSupport() !== 'ok') throw new Error('Notifications are not supported on this browser')
  const sub = await getSubscription(askPermission)
  if (!sub) return
  const json = sub.toJSON()
  await rpc('save_push_subscription', {
    p_endpoint: sub.endpoint,
    p_p256dh: json.keys?.p256dh ?? '',
    p_auth: json.keys?.auth ?? '',
    p_tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    p_lead: settings.lead,
    p_schedule: schedule,
    ...approxLocation(schedule),
  })
}

/** Call a public Supabase RPC (no login, no SDK) */
async function rpc(name: string, args: Record<string, unknown>) {
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? `Couldn't save reminders (${res.status})`)
  }
}

/** Approximate location (~10 km) — only sent when Maghrib "auto" needs the server to know sunset */
function approxLocation(schedule: Record<string, unknown>) {
  if (!Object.values(schedule).includes(AUTO)) return { p_lat: null, p_lng: null }
  const loc = namazLocation.read()
  if (!loc) throw new Error('Set your location first')
  return { p_lat: Math.round(loc.lat * 10) / 10, p_lng: Math.round(loc.lng * 10) / 10 }
}
