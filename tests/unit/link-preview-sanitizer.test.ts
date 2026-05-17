import { escapeHtmlNullable as escapeHtmlEntities } from '$lib/utils/escape-html'
import { describe, expect, it } from 'vitest'

function sanitizeEmbedHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\s*on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '')
    .replace(/javascript\s*:/gi, '')
}

describe('link-preview sanitization', () => {
  describe('sanitizeEmbedHtml', () => {
    it('strips script tags from oEmbed HTML', () => {
      const malicious =
        '<iframe src="https://youtube.com/embed/123"></iframe><script>alert("xss")</script>'
      const result = sanitizeEmbedHtml(malicious)
      expect(result).not.toContain('<script')
      expect(result).toContain('<iframe')
    })

    it('strips inline event handlers', () => {
      const malicious = '<iframe src="https://youtube.com/embed/123" onload="alert(1)"></iframe>'
      const result = sanitizeEmbedHtml(malicious)
      expect(result).not.toContain('onload')
      expect(result).toContain('<iframe')
    })

    it('strips onclick with single quotes', () => {
      const malicious = "<div onclick='alert(1)'>text</div>"
      const result = sanitizeEmbedHtml(malicious)
      expect(result).not.toContain('onclick')
    })

    it('strips onerror on img tags', () => {
      const malicious = '<img src="x" onerror="alert(1)">'
      const result = sanitizeEmbedHtml(malicious)
      expect(result).not.toContain('onerror')
    })

    it('strips javascript: URLs', () => {
      const malicious = '<a href="javascript:alert(1)">click</a>'
      const result = sanitizeEmbedHtml(malicious)
      expect(result).not.toContain('javascript:')
    })

    it('preserves safe iframe embeds', () => {
      const safe =
        '<iframe src="https://www.youtube.com/embed/abc123" width="560" height="315"></iframe>'
      const result = sanitizeEmbedHtml(safe)
      expect(result).toContain('src="https://www.youtube.com/embed/abc123"')
      expect(result).toContain('width="560"')
    })

    it('handles case-insensitive script tags', () => {
      const malicious = '<SCRIPT>alert(1)</SCRIPT>'
      const result = sanitizeEmbedHtml(malicious)
      expect(result).not.toContain('SCRIPT')
      expect(result).not.toContain('script')
    })

    it('handles script with attributes', () => {
      const malicious = '<script type="text/javascript" src="evil.js"></script>'
      const result = sanitizeEmbedHtml(malicious)
      expect(result).not.toContain('script')
    })

    it('preserves clean HTML unchanged', () => {
      const clean = '<iframe src="https://embed.example.com/123" allowfullscreen></iframe>'
      const result = sanitizeEmbedHtml(clean)
      expect(result).toBe(clean)
    })
  })

  describe('escapeHtmlEntities', () => {
    it('returns null for null input', () => {
      expect(escapeHtmlEntities(null)).toBeNull()
    })

    it('returns null for undefined input', () => {
      expect(escapeHtmlEntities(undefined)).toBeNull()
    })

    it('escapes ampersands', () => {
      expect(escapeHtmlEntities('foo & bar')).toBe('foo &amp; bar')
    })

    it('escapes angle brackets', () => {
      expect(escapeHtmlEntities('<script>alert(1)</script>')).toBe(
        '&lt;script&gt;alert(1)&lt;/script&gt;'
      )
    })

    it('escapes double quotes', () => {
      expect(escapeHtmlEntities('He said "hello"')).toBe('He said &quot;hello&quot;')
    })

    it('preserves safe strings', () => {
      expect(escapeHtmlEntities('Hello World 123')).toBe('Hello World 123')
    })

    it('handles URL strings safely', () => {
      const url = 'https://example.com/image.jpg?width=100&height=200'
      const result = escapeHtmlEntities(url)
      expect(result).toBe('https://example.com/image.jpg?width=100&amp;height=200')
      expect(result).not.toContain('&amp;amp;')
    })

    it('handles empty string', () => {
      expect(escapeHtmlEntities('')).toBeNull()
    })

    it('handles multiple special characters', () => {
      expect(escapeHtmlEntities('<a href="x&y">')).toBe('&lt;a href=&quot;x&amp;y&quot;&gt;')
    })
  })
})
