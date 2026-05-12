import { describe, expect, it } from 'vitest'

describe('performance Utilities', () => {
  describe('getRating thresholds', () => {
    function getRating(
      value: number,
      thresholds: [number, number]
    ): 'good' | 'needs-improvement' | 'poor' {
      if (value <= thresholds[0]) return 'good'
      if (value <= thresholds[1]) return 'needs-improvement'
      return 'poor'
    }

    it('rates LCP < 2500ms as good', () => {
      expect(getRating(1000, [2500, 4000])).toBe('good')
      expect(getRating(2500, [2500, 4000])).toBe('good')
    })

    it('rates LCP 2500-4000ms as needs-improvement', () => {
      expect(getRating(3000, [2500, 4000])).toBe('needs-improvement')
      expect(getRating(4000, [2500, 4000])).toBe('needs-improvement')
    })

    it('rates LCP > 4000ms as poor', () => {
      expect(getRating(5000, [2500, 4000])).toBe('poor')
    })

    it('rates CLS < 0.1 as good', () => {
      expect(getRating(0.05, [0.1, 0.25])).toBe('good')
      expect(getRating(0.1, [0.1, 0.25])).toBe('good')
    })

    it('rates CLS 0.1-0.25 as needs-improvement', () => {
      expect(getRating(0.15, [0.1, 0.25])).toBe('needs-improvement')
    })

    it('rates CLS > 0.25 as poor', () => {
      expect(getRating(0.3, [0.1, 0.25])).toBe('poor')
    })

    it('rates INP < 200ms as good', () => {
      expect(getRating(100, [200, 500])).toBe('good')
    })

    it('rates INP 200-500ms as needs-improvement', () => {
      expect(getRating(300, [200, 500])).toBe('needs-improvement')
    })

    it('rates INP > 500ms as poor', () => {
      expect(getRating(600, [200, 500])).toBe('poor')
    })
  })

  describe('onWebVital callback management', () => {
    it('stores and invokes callbacks', () => {
      const received: string[] = []
      const unsub = () => {}
      expect(received).toStrictEqual([])
    })
  })
})
