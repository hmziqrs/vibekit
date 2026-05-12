import { datetime, number, plural } from '$lib/paraglide/registry'
import { getLocale } from '$lib/paraglide/runtime'

export function formatDate(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string {
  const locale = getLocale()
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  return datetime(locale, d, options)
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return number(getLocale(), value, options)
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const locale = getLocale()

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  if (diffSeconds < 60) return rtf.format(-diffSeconds, 'second')
  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) return rtf.format(-diffMinutes, 'minute')
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return rtf.format(-diffHours, 'hour')
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return rtf.format(-diffDays, 'day')
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return rtf.format(-diffMonths, 'month')
  const diffYears = Math.floor(diffDays / 365)
  return rtf.format(-diffYears, 'year')
}

export function getPluralRule(count: number): string {
  const locale = getLocale()
  return plural(locale, count)
}

export function formatCurrency(value: number, currency = 'USD'): string {
  return formatNumber(value, { currency, style: 'currency' })
}
