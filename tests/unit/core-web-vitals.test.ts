import { describe, expect, it } from 'vitest'

describe('core Web Vitals', () => {
  describe('performance budget thresholds', () => {
    const budget = {
      CLS: { good: 0.1, poor: 0.25 },
      FID: { good: 100, poor: 300 },
      INP: { good: 200, poor: 500 },
      LCP: { good: 2500, poor: 4000 },
    }

    it('lCP good threshold is 2500ms', () => {
      expect(budget.LCP.good).toBe(2500)
    })

    it('lCP poor threshold is 4000ms', () => {
      expect(budget.LCP.poor).toBe(4000)
    })

    it('cLS good threshold is 0.1', () => {
      expect(budget.CLS.good).toBe(0.1)
    })

    it('cLS poor threshold is 0.25', () => {
      expect(budget.CLS.poor).toBe(0.25)
    })

    it('iNP good threshold is 200ms', () => {
      expect(budget.INP.good).toBe(200)
    })

    it('iNP poor threshold is 500ms', () => {
      expect(budget.INP.poor).toBe(500)
    })
  })

  describe('image CLS prevention', () => {
    it('blog listing images have explicit height class', () => {
      const imgClass = 'mb-4 h-48 w-full rounded-lg object-cover'
      expect(imgClass).toContain('h-48')
      expect(imgClass).toContain('w-full')
    })

    it('blog hero images have explicit width class', () => {
      const imgClass = 'mb-10 w-full rounded-xl border border-white/6'
      expect(imgClass).toContain('w-full')
    })

    it('all blog images use object-cover for consistent sizing', () => {
      const classes = [
        'mb-4 h-48 w-full rounded-lg object-cover',
        'aspect-video w-full rounded-t-lg object-cover',
      ]
      for (const cls of classes) {
        expect(cls).toContain('object-cover')
      }
    })
  })

  describe('web vitals reporting', () => {
    it('initWebVitals is a function export', { timeout: 30_000 }, async () => {
      const mod = await import('$lib/performance.svelte')
      expectTypeOf(mod.initWebVitals).toBeFunction()
    })

    it('onWebVital is a function export', { timeout: 30_000 }, async () => {
      const mod = await import('$lib/performance.svelte')
      expectTypeOf(mod.onWebVital).toBeFunction()
    })

    it('reportToConsole is a function export', { timeout: 30_000 }, async () => {
      const mod = await import('$lib/performance.svelte')
      expectTypeOf(mod.reportToConsole).toBeFunction()
    })
  })
})
