import { formatTimeAgo, notificationTypeColor } from '$lib/notification-utils'
import { describe, expect, it } from 'vitest'

describe('formatTimeAgo', () => {
  it('returns "just now" for less than 1 minute ago', () => {
    const now = new Date().toISOString()
    expect(formatTimeAgo(now)).toBe('just now')
  })

  it('returns minutes for less than 60 minutes', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString()
    expect(formatTimeAgo(fiveMinAgo)).toBe('5m ago')
  })

  it('returns hours for less than 24 hours', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60_000).toISOString()
    expect(formatTimeAgo(twoHoursAgo)).toBe('2h ago')
  })

  it('returns days for less than 30 days', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60_000).toISOString()
    expect(formatTimeAgo(threeDaysAgo)).toBe('3d ago')
  })

  it('returns formatted date for 30+ days', () => {
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60_000).toISOString()
    const result = formatTimeAgo(sixtyDaysAgo)
    expect(result).not.toContain('ago')
    // Should be a locale date string
    expect(result.length).toBeGreaterThan(0)
  })

  it('handles exactly 1 minute ago', () => {
    const oneMinAgo = new Date(Date.now() - 60_000).toISOString()
    expect(formatTimeAgo(oneMinAgo)).toBe('1m ago')
  })

  it('handles exactly 60 minutes (1 hour) ago', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60_000).toISOString()
    expect(formatTimeAgo(oneHourAgo)).toBe('1h ago')
  })

  it('handles exactly 24 hours (1 day) ago', () => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60_000).toISOString()
    expect(formatTimeAgo(oneDayAgo)).toBe('1d ago')
  })
})

describe('notificationTypeColor', () => {
  it('returns success color for success type', () => {
    expect(notificationTypeColor('success')).toBe('text-success')
  })

  it('returns warning color for warning type', () => {
    expect(notificationTypeColor('warning')).toBe('text-warning')
  })

  it('returns destructive color for error type', () => {
    expect(notificationTypeColor('error')).toBe('text-destructive')
  })

  it('returns brand color for info type', () => {
    expect(notificationTypeColor('info')).toBe('text-brand')
  })

  it('returns brand color for unknown type', () => {
    expect(notificationTypeColor('unknown')).toBe('text-brand')
  })
})
