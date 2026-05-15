import { escapeHtml } from '$lib/server/email/templates/base'
import { describe, expect, it } from 'vitest'

describe('escapeHtml', () => {
  it('escapes ampersands', () => {
    expect(escapeHtml('foo & bar')).toBe('foo &amp; bar')
  })

  it('escapes angle brackets', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('escapes double quotes', () => {
    expect(escapeHtml('value="test"')).toBe('value=&quot;test&quot;')
  })

  it('escapes single quotes', () => {
    expect(escapeHtml("it's a test")).toBe('it&#39;s a test')
  })

  it('escapes all special characters together', () => {
    expect(escapeHtml(`<a href="x" onclick='y'>&`)).toBe(
      '&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;'
    )
  })

  it('returns plain text unchanged', () => {
    expect(escapeHtml('Hello World 123')).toBe('Hello World 123')
  })

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('')
  })

  it('handles unicode text', () => {
    expect(escapeHtml('Hello 世界')).toBe('Hello 世界')
  })
})
