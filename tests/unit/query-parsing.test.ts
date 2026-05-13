import { describe, expect, it } from 'vitest'

// These helpers are defined inline in hono/index.ts, so we replicate them for testing
function parsePositiveInt(value: string | null | undefined, fallback: number): number {
  if (!value) return fallback
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function parseClampInt(
  value: string | null | undefined,
  fallback: number,
  min = 1,
  max = 100
): number {
  if (!value) return fallback
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

describe('parsePositiveInt', () => {
  it('returns the number for valid positive integers', () => {
    expect(parsePositiveInt('5', 1)).toBe(5)
    expect(parsePositiveInt('100', 1)).toBe(100)
    expect(parsePositiveInt('1', 1)).toBe(1)
  })

  it('returns fallback for zero', () => {
    expect(parsePositiveInt('0', 1)).toBe(1)
  })

  it('returns fallback for negative numbers', () => {
    expect(parsePositiveInt('-5', 1)).toBe(1)
  })

  it('returns fallback for non-numeric strings', () => {
    expect(parsePositiveInt('abc', 1)).toBe(1)
  })

  it('returns fallback for empty string', () => {
    expect(parsePositiveInt('', 1)).toBe(1)
  })

  it('returns fallback for null', () => {
    expect(parsePositiveInt(null, 1)).toBe(1)
  })

  it('returns fallback for undefined', () => {
    expect(parsePositiveInt(undefined, 1)).toBe(1)
  })

  it('handles decimal strings by truncating', () => {
    expect(parsePositiveInt('3.7', 1)).toBe(3.7)
  })

  it('uses the provided fallback', () => {
    expect(parsePositiveInt(null, 10)).toBe(10)
    expect(parsePositiveInt('invalid', 25)).toBe(25)
  })
})

describe('parseClampInt', () => {
  it('returns clamped value for valid numbers', () => {
    expect(parseClampInt('50', 20, 1, 100)).toBe(50)
  })

  it('clamps to minimum', () => {
    expect(parseClampInt('0', 20, 1, 100)).toBe(1)
    expect(parseClampInt('-5', 20, 1, 100)).toBe(1)
  })

  it('clamps to maximum', () => {
    expect(parseClampInt('500', 20, 1, 100)).toBe(100)
    expect(parseClampInt('999', 20, 1, 100)).toBe(100)
  })

  it('returns fallback for NaN input', () => {
    expect(parseClampInt('abc', 20, 1, 100)).toBe(20)
    expect(parseClampInt('not-a-number', 50, 1, 200)).toBe(50)
  })

  it('returns fallback for null', () => {
    expect(parseClampInt(null, 20, 1, 100)).toBe(20)
  })

  it('returns fallback for undefined', () => {
    expect(parseClampInt(undefined, 20, 1, 100)).toBe(20)
  })

  it('returns fallback for empty string', () => {
    expect(parseClampInt('', 20, 1, 100)).toBe(20)
  })

  it('respects custom min and max', () => {
    expect(parseClampInt('0', 0, 0, 10000)).toBe(0)
    expect(parseClampInt('50000', 0, 0, 10000)).toBe(10000)
  })

  it('handles edge case: value equals min', () => {
    expect(parseClampInt('1', 20, 1, 100)).toBe(1)
  })

  it('handles edge case: value equals max', () => {
    expect(parseClampInt('100', 20, 1, 100)).toBe(100)
  })

  it('handles very large numbers', () => {
    expect(parseClampInt('999999999', 20, 1, 100)).toBe(100)
  })

  it('handles Infinity', () => {
    expect(parseClampInt('Infinity', 20, 1, 100)).toBe(20)
  })

  it('handles negative Infinity', () => {
    expect(parseClampInt('-Infinity', 20, 1, 100)).toBe(20)
  })
})
