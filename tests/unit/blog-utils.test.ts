import { describe, expect, it } from 'vitest'

// Testing pure utility functions from blog route handlers by reading the source
// and extracting the logic into testable form

function estimateReadingTime(html: string): number {
  const text = html.replace(/<[^>]*>/g, '')
  const words = text.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

describe('estimateReadingTime', () => {
  it('returns at least 1 minute for any content', () => {
    expect(estimateReadingTime('')).toBe(1)
    expect(estimateReadingTime('<p>Hello</p>')).toBe(1)
  })

  it('calculates based on 200 words per minute', () => {
    const words = Array(200).fill('word').join(' ')
    expect(estimateReadingTime(words)).toBe(1)
  })

  it('rounds up for partial minutes', () => {
    const words = Array(201).fill('word').join(' ')
    expect(estimateReadingTime(words)).toBe(2)
  })

  it('strips HTML tags before counting', () => {
    const html = '<p>' + Array(200).fill('<strong>word</strong>').join(' ') + '</p>'
    expect(estimateReadingTime(html)).toBe(1)
  })

  it('handles long articles correctly', () => {
    const words = Array(600).fill('word').join(' ')
    expect(estimateReadingTime(words)).toBe(3)
  })

  it('handles multi-paragraph HTML', () => {
    const html = '<p>First paragraph.</p><p>Second paragraph.</p><p>Third paragraph.</p>'
    expect(estimateReadingTime(html)).toBe(1)
  })
})

describe('escapeXml', () => {
  it('escapes ampersands', () => {
    expect(escapeXml('foo & bar')).toBe('foo &amp; bar')
  })

  it('escapes angle brackets', () => {
    expect(escapeXml('<script>')).toBe('&lt;script&gt;')
  })

  it('escapes double quotes', () => {
    expect(escapeXml('say "hello"')).toBe('say &quot;hello&quot;')
  })

  it('escapes single quotes', () => {
    expect(escapeXml("it's")).toBe('it&apos;s')
  })

  it('handles already-escaped ampersands', () => {
    expect(escapeXml('&amp;')).toBe('&amp;amp;')
  })

  it('returns empty string unchanged', () => {
    expect(escapeXml('')).toBe('')
  })

  it('handles strings with no special characters', () => {
    expect(escapeXml('Hello World')).toBe('Hello World')
  })

  it('escapes all special characters in a single string', () => {
    expect(escapeXml('<a href="test&foo">it\'s</a>')).toBe(
      '&lt;a href=&quot;test&amp;foo&quot;&gt;it&apos;s&lt;/a&gt;'
    )
  })
})
