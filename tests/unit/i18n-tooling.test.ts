import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('i18n Tooling', () => {
  const messagesDir = resolve(import.meta.dirname, '..', '..', 'messages')

  function loadKeys(locale: string): string[] {
    const raw = readFileSync(resolve(messagesDir, `${locale}.json`), 'utf-8')
    const json = JSON.parse(raw)
    const { $schema: _, ...messages } = json
    return Object.keys(messages)
  }

  describe('key parity between locales', () => {
    const enKeys = loadKeys('en')
    const urKeys = loadKeys('ur')

    it('ur.json has all keys from en.json', () => {
      const missing = enKeys.filter((k) => !urKeys.includes(k))
      expect(missing).toEqual([])
    })

    it('en.json has all keys from ur.json', () => {
      const extra = urKeys.filter((k) => !enKeys.includes(k))
      expect(extra).toEqual([])
    })

    it('both locales have the same key count', () => {
      expect(enKeys.length).toBe(urKeys.length)
    })

    it('has at least 50 translation keys', () => {
      expect(enKeys.length).toBeGreaterThanOrEqual(50)
    })
  })

  describe('message format validation', () => {
    it('all parameterized messages have matching params between locales', () => {
      const enRaw = readFileSync(resolve(messagesDir, 'en.json'), 'utf-8')
      const urRaw = readFileSync(resolve(messagesDir, 'ur.json'), 'utf-8')
      const en = JSON.parse(enRaw)
      const ur = JSON.parse(urRaw)

      const paramRegex = /\{(\w+)\}/g

      for (const [key, value] of Object.entries(en)) {
        if (key === '$schema') continue
        const enParams = [...((value as string).matchAll(paramRegex) ?? [])].map(
          (m) => m[1],
        )
        const urValue = ur[key] as string | undefined
        if (!urValue) continue

        const urParams = [...(urValue.matchAll(paramRegex) ?? [])].map((m) => m[1])
        expect(urParams.sort()).toEqual(
          enParams.sort(),
          `Key "${key}": params mismatch between en and ur`,
        )
      }
    })
  })

  describe('script validation', () => {
    it('i18n-check script exists', () => {
      const scriptPath = resolve(import.meta.dirname, '..', '..', 'scripts', 'i18n-check.ts')
      const content = readFileSync(scriptPath, 'utf-8')
      expect(content).toContain('loadMessages')
      expect(content).toContain('missingInUr')
    })
  })
})
