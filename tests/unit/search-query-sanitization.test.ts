import { describe, expect, it } from 'vitest'

// Replicate the sanitization logic from search/adapter-d1.ts
function sanitizeSearchQuery(query: string): string {
  return query
    .replace(/["*()^]/g, '')
    .replace(/\b(AND|OR|NOT|NEAR)\b/gi, '')
    .trim()
}

describe('search query sanitization', () => {
  it('strips double quotes', () => {
    expect(sanitizeSearchQuery('hello "world"')).toBe('hello world')
  })

  it('strips asterisks', () => {
    expect(sanitizeSearchQuery('test*')).toBe('test')
  })

  it('strips parentheses', () => {
    expect(sanitizeSearchQuery('(hello)')).toBe('hello')
  })

  it('strips caret', () => {
    expect(sanitizeSearchQuery('^hello')).toBe('hello')
  })

  it('strips FTS AND operator', () => {
    expect(sanitizeSearchQuery('hello AND world')).toBe('hello  world')
  })

  it('strips FTS OR operator', () => {
    expect(sanitizeSearchQuery('hello OR world')).toBe('hello  world')
  })

  it('strips FTS NOT operator', () => {
    expect(sanitizeSearchQuery('NOT hello')).toBe('hello')
  })

  it('strips FTS NEAR operator', () => {
    expect(sanitizeSearchQuery('hello NEAR world')).toBe('hello  world')
  })

  it('strips case-insensitive operators', () => {
    expect(sanitizeSearchQuery('hello and world')).toBe('hello  world')
    expect(sanitizeSearchQuery('hello or World')).toBe('hello  World')
    expect(sanitizeSearchQuery('hello not test')).toBe('hello  test')
    expect(sanitizeSearchQuery('hello near test')).toBe('hello  test')
  })

  it('strips complex injection attempts', () => {
    expect(sanitizeSearchQuery('hello" AND "world')).toBe('hello  world')
    expect(sanitizeSearchQuery('(test OR other)')).toBe('test  other')
    expect(sanitizeSearchQuery('NEAR (hello AND world)')).toBe('hello  world')
  })

  it('strips all special FTS characters together', () => {
    expect(sanitizeSearchQuery('"^test*" (AND) OR')).toBe('test')
  })

  it('preserves normal words', () => {
    expect(sanitizeSearchQuery('hello world')).toBe('hello world')
    expect(sanitizeSearchQuery('svelte kit tutorial')).toBe('svelte kit tutorial')
  })

  it('preserves words containing operator substrings', () => {
    expect(sanitizeSearchQuery('android')).toBe('android')
    expect(sanitizeSearchQuery('norway')).toBe('norway')
    expect(sanitizeSearchQuery('organ')).toBe('organ')
    expect(sanitizeSearchQuery('nearby')).toBe('nearby')
  })

  it('trims whitespace', () => {
    expect(sanitizeSearchQuery('  hello  ')).toBe('hello')
    expect(sanitizeSearchQuery(' ')).toBe('')
  })

  it('returns empty for queries that become empty after sanitization', () => {
    expect(sanitizeSearchQuery('AND OR NOT')).toBe('')
    expect(sanitizeSearchQuery('""')).toBe('')
    expect(sanitizeSearchQuery('***')).toBe('')
  })
})
