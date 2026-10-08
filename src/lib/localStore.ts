import { useSyncExternalStore } from 'react'

/**
 * Tiny reactive per-device store backed by localStorage.
 * `use()` re-renders subscribers when `write()` is called; reads return a stable reference
 * until the stored value changes. Storage may be unavailable (private mode), so it never throws.
 */
export function localStore<T>(key: string, fallback: T) {
  const listeners = new Set<() => void>()
  let cache: { raw: string | null; value: T } | undefined

  const read = (): T => {
    let raw: string | null = null
    try {
      raw = localStorage.getItem(key)
    } catch {
      /* storage unavailable */
    }
    if (cache && cache.raw === raw) return cache.value // stable reference for useSyncExternalStore
    let value = fallback
    try {
      if (raw !== null) value = JSON.parse(raw) as T
    } catch {
      /* corrupt value: use fallback */
    }
    cache = { raw, value }
    return value
  }

  const write = (value: T) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* storage unavailable */
    }
    listeners.forEach((l) => l())
  }

  const subscribe = (l: () => void) => {
    listeners.add(l)
    return () => listeners.delete(l)
  }

  return { read, write, use: () => useSyncExternalStore(subscribe, read, () => fallback) }
}
