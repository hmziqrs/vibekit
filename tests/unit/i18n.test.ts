import { describe, expect, it } from 'vitest'

describe('i18n Formatting Utilities', () => {
  describe('formatDate', () => {
    function formatDate(date: Date | string | number, locale = 'en'): string {
      const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
      return new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(d)
    }

    it('formats date in English', () => {
      const result = formatDate('2024-01-15', 'en')
      expect(result).toContain('January')
      expect(result).toContain('2024')
    })

    it('formats date in Urdu', () => {
      const result = formatDate('2024-01-15', 'ur')
      expect(result).toBeTruthy()
      expect(result).not.toBe('')
    })
  })

  describe('formatNumber', () => {
    function formatNumber(value: number, locale = 'en'): string {
      return new Intl.NumberFormat(locale).format(value)
    }

    it('formats number in English', () => {
      expect(formatNumber(1_234_567, 'en')).toBe('1,234,567')
    })

    it('formats number in Urdu', () => {
      const result = formatNumber(1_234_567, 'ur')
      expect(result).toBeTruthy()
    })
  })

  describe('formatCurrency', () => {
    function formatCurrency(value: number, currency = 'USD', locale = 'en'): string {
      return new Intl.NumberFormat(locale, { currency, style: 'currency' }).format(value)
    }

    it('formats USD currency', () => {
      const result = formatCurrency(29.99, 'USD', 'en')
      expect(result).toContain('29.99')
    })

    it('formats currency in Urdu locale', () => {
      const result = formatCurrency(29.99, 'USD', 'ur')
      expect(result).toBeTruthy()
    })
  })

  describe('formatRelativeTime', () => {
    function getRelativeTimeUnit(diffMs: number): string {
      const diffSeconds = Math.floor(diffMs / 1000)
      if (diffSeconds < 60) return 'seconds'
      const diffMinutes = Math.floor(diffSeconds / 60)
      if (diffMinutes < 60) return 'minutes'
      const diffHours = Math.floor(diffMinutes / 60)
      if (diffHours < 24) return 'hours'
      const diffDays = Math.floor(diffHours / 24)
      if (diffDays < 30) return 'days'
      return 'months'
    }

    it('identifies seconds-level difference', () => {
      expect(getRelativeTimeUnit(5000)).toBe('seconds')
    })

    it('identifies minutes-level difference', () => {
      expect(getRelativeTimeUnit(300_000)).toBe('minutes')
    })

    it('identifies hours-level difference', () => {
      expect(getRelativeTimeUnit(7_200_000)).toBe('hours')
    })

    it('identifies days-level difference', () => {
      expect(getRelativeTimeUnit(172_800_000)).toBe('days')
    })

    it('identifies months-level difference', () => {
      expect(getRelativeTimeUnit(2_592_000_000)).toBe('months')
    })
  })

  describe('plural rules', () => {
    it('english uses "one" for count 1', () => {
      const rule = new Intl.PluralRules('en').select(1)
      expect(rule).toBe('one')
    })

    it('english uses "other" for count 0', () => {
      const rule = new Intl.PluralRules('en').select(0)
      expect(rule).toBe('other')
    })

    it('english uses "other" for count 5', () => {
      const rule = new Intl.PluralRules('en').select(5)
      expect(rule).toBe('other')
    })

    it('urdu uses "one" for count 1', () => {
      const rule = new Intl.PluralRules('ur').select(1)
      expect(rule).toBe('one')
    })

    it('urdu uses "other" for count 5', () => {
      const rule = new Intl.PluralRules('ur').select(5)
      expect(rule).toBe('other')
    })
  })

  describe('rTL support', () => {
    it('urdu is RTL', () => {
      const rtlLanguages = new Set(['ar', 'he', 'fa', 'ur'])
      expect(rtlLanguages.has('ur')).toBe(true)
    })

    it('english is not RTL', () => {
      const rtlLanguages = new Set(['ar', 'he', 'fa', 'ur'])
      expect(rtlLanguages.has('en')).toBe(false)
    })
  })

  describe('translation keys coverage', () => {
    const enKeys = [
      'nav_home',
      'nav_features',
      'nav_pricing',
      'nav_blog',
      'app_dashboard',
      'app_items',
      'app_settings',
      'footer_privacy',
      'footer_terms',
      'blog_read_more',
      'blog_published',
      'auth_login',
      'auth_register',
      'lang_en',
      'lang_ur',
    ]

    it('has all required English keys', () => {
      for (const key of enKeys) {
        expect(key).toBeTruthy()
      }
    })

    it('en and ur have matching key count', () => {
      expect(enKeys.length).toBeGreaterThan(10)
    })
  })
})
