import { datetime, number } from '$lib/paraglide/registry'
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
