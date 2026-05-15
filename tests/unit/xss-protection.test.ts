import { describe, expect, it } from 'vitest'

// Replicate the escapeHtml + highlightMatch logic from the search page
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function highlightMatch(text: string, term: string): string {
  const escaped = escapeHtml(text)
  if (!term) return escaped
  const escapedTerm = escapeHtml(term)
  const regex = new RegExp(`(${escapedTerm.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)})`, 'gi')
  return escaped.replace(
    regex,
    '<mark class="bg-brand/20 text-text-primary rounded px-0.5">$1</mark>'
  )
}

describe('XSS protection in search highlight', () => {
  it('escapes HTML tags in search text', () => {
    const result = highlightMatch('<script>alert(1)</script>', 'script')
    expect(result).not.toContain('<script>')
    expect(result).toContain('&lt;')
    expect(result).toContain('&gt;')
    expect(result).toContain('<mark')
  })

  it('escapes HTML tags in text even when query is present', () => {
    const result = highlightMatch('hello <img> world', 'hello')
    expect(result).not.toContain('<img>')
    expect(result).toContain('&lt;img&gt;')
    expect(result).toContain('<mark')
  })

  it('escapes both text and query when both contain HTML', () => {
    const result = highlightMatch('bold text', '<b>')
    // The escaped query &lt;b&gt; won't match in "bold text", so no highlighting
    // but the text is still properly escaped
    expect(result).not.toContain('<b>')
  })

  it('does not inject unescaped HTML from text', () => {
    const malicious = '<img src=x onerror=alert(1)>'
    const result = highlightMatch(malicious, 'x')
    expect(result).not.toContain('<img')
    expect(result).not.toContain('<script')
    expect(result).toContain('&lt;img')
    expect(result).toContain('&gt;')
  })

  it('returns escaped text when no term provided', () => {
    const result = highlightMatch('<script>alert(1)</script>', '')
    expect(result).toBe('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('preserves normal text highlighting', () => {
    const result = highlightMatch('hello world', 'world')
    expect(result).toBe(
      'hello <mark class="bg-brand/20 text-text-primary rounded px-0.5">world</mark>'
    )
  })

  it('escapes ampersands in text', () => {
    const result = highlightMatch('foo & bar', '&')
    expect(result).toContain('&amp;')
    expect(result).toContain('<mark')
  })

  it('escapes double quotes in text', () => {
    const result = highlightMatch('say "hello"', '"hello"')
    expect(result).toContain('&quot;')
  })
})
