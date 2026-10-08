import { clsx, type ClassValue } from 'clsx'

export const cn = (...inputs: ClassValue[]) => clsx(inputs)

export function errMsg(e: unknown): string {
  if (!e) return 'Something went wrong'
  const m = (e as { message?: string }).message ?? String(e)
  if (/failed to fetch|network/i.test(m)) return 'No internet connection'
  return m
}
