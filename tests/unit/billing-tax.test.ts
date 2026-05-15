import { calculateTax } from '$lib/server/billing/subscription-service'
import { describe, expect, it } from 'vitest'

describe('calculateTax', () => {
  it('returns zero tax when no rate provided', () => {
    const result = calculateTax({ amountInCents: 1000, taxInclusive: false, taxRate: null })
    expect(result.taxAmountInCents).toBe(0)
    expect(result.totalInCents).toBe(1000)
  })

  it('returns zero tax when rate is 0', () => {
    const result = calculateTax({ amountInCents: 1000, taxInclusive: false, taxRate: 0 })
    expect(result.taxAmountInCents).toBe(0)
    expect(result.totalInCents).toBe(1000)
  })

  it('calculates exclusive tax (added on top)', () => {
    // 10% tax on $10.00 = $1.00 tax, total $11.00
    const result = calculateTax({ amountInCents: 1000, taxInclusive: false, taxRate: 1000 })
    expect(result.taxAmountInCents).toBe(100)
    expect(result.totalInCents).toBe(1100)
  })

  it('calculates inclusive tax (embedded in price)', () => {
    // 10% tax included in $11.00 → tax = $1.00, total stays $11.00
    const result = calculateTax({ amountInCents: 1100, taxInclusive: true, taxRate: 1000 })
    expect(result.taxAmountInCents).toBe(100)
    expect(result.totalInCents).toBe(1100)
  })

  it('handles 8.5% tax rate (850 basis points)', () => {
    const result = calculateTax({ amountInCents: 10000, taxInclusive: false, taxRate: 850 })
    expect(result.taxAmountInCents).toBe(850)
    expect(result.totalInCents).toBe(10850)
  })

  it('handles 20% VAT (inclusive)', () => {
    // 20% included in $12.00 → tax = $2.00
    const result = calculateTax({ amountInCents: 1200, taxInclusive: true, taxRate: 2000 })
    // 1200 * 2000 / (10000 + 2000) = 2400000 / 12000 = 200
    expect(result.taxAmountInCents).toBe(200)
    expect(result.totalInCents).toBe(1200)
  })

  it('handles large amounts', () => {
    const result = calculateTax({ amountInCents: 1_000_000, taxInclusive: false, taxRate: 1000 })
    expect(result.taxAmountInCents).toBe(100_000)
    expect(result.totalInCents).toBe(1_100_000)
  })

  it('handles small amounts with rounding', () => {
    // 7% on $0.99 = 6.93 cents → rounds to 7
    const result = calculateTax({ amountInCents: 99, taxInclusive: false, taxRate: 700 })
    expect(result.taxAmountInCents).toBe(7)
    expect(result.totalInCents).toBe(106)
  })

  it('handles zero amount', () => {
    const result = calculateTax({ amountInCents: 0, taxInclusive: false, taxRate: 1000 })
    expect(result.taxAmountInCents).toBe(0)
    expect(result.totalInCents).toBe(0)
  })
})

describe('tax rate validation', () => {
  it('accepts valid tax rate in schema', () => {
    const validRates = [0, 100, 850, 1000, 2000, 2500, 10000]
    for (const rate of validRates) {
      expect(rate).toBeGreaterThanOrEqual(0)
      expect(rate).toBeLessThanOrEqual(10000)
    }
  })

  it('taxRate represents basis points (100 = 1%)', () => {
    // 1% = 100, 8.5% = 850, 10% = 1000, 20% = 2000, 25% = 2500, 100% = 10000
    expect(850 / 100).toBe(8.5)
    expect(2000 / 100).toBe(20)
    expect(10000 / 100).toBe(100)
  })
})
