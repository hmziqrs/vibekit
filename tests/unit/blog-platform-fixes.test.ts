import { sanitizeHtml } from '$lib/markdown'
import { updateTagSchema } from '$lib/validators/blog'
import { describe, expect, it, vi } from 'vitest'

// Mock the D1 search adapter so the server module can be imported in tests
vi.mock('$lib/server/search/adapter-d1', () => ({
  createD1SearchAdapter: () => ({
    delete: vi.fn().mockResolvedValue(undefined),
    index: vi.fn().mockResolvedValue(undefined),
  }),
}))

// ---------------------------------------------------------------------------
// Fix 1: contentBody sanitization at write time
// ---------------------------------------------------------------------------
describe('sanitizeHtml — contentBody write-time sanitization', () => {
  // -- Dangerous tag removal ------------------------------------------------

  it('strips <script> tags', () => {
    const input = '<p>Hello</p><script>alert("xss")</script>'
    const result = sanitizeHtml(input)
    expect(result).not.toContain('<script')
    expect(result).not.toContain('alert')
    expect(result).toContain('<p>Hello</p>')
  })

  it('strips <iframe> tags', () => {
    const input = '<iframe src="https://evil.com"></iframe><p>safe</p>'
    const result = sanitizeHtml(input)
    expect(result).not.toContain('<iframe')
    expect(result).toContain('<p>safe</p>')
  })

  it('strips <style> tags and style attributes', () => {
    const input = '<style>body{display:none}</style><p style="color:red">text</p>'
    const result = sanitizeHtml(input)
    expect(result).not.toContain('<style')
    expect(result).not.toContain('body{display:none}')
    // DOMPurify removes the style attribute entirely when FORBID_ATTR includes 'style'
    expect(result).not.toMatch(/style="[^"]*"/)
    expect(result).toContain('<p>text</p>')
  })

  it('strips form-related tags: form, input, textarea, select, button', () => {
    const tags = ['form', 'input', 'textarea', 'select', 'button']
    for (const tag of tags) {
      const input = `<${tag}>content</${tag}><p>safe</p>`
      const result = sanitizeHtml(input)
      expect(result).not.toContain(`<${tag}`)
      expect(result).toContain('<p>safe</p>')
    }
  })

  it('strips formaction and xlink:href attributes', () => {
    const input =
      '<a href="/safe" formaction="/evil">link</a>' +
      '<svg><use xlink:href="data:image/svg+xml,<svg onload=alert(1)>"/></svg>'
    const result = sanitizeHtml(input)
    expect(result).not.toContain('formaction')
    // xlink:href is stripped by DOMPurify's default sanitization
    expect(result).not.toContain('xlink:href')
  })

  // -- Safe content preservation --------------------------------------------

  it('preserves safe HTML tags: p, a, h1, strong, em, code, pre, ul, li, img', () => {
    const input =
      '<h1>Title</h1>' +
      '<p>paragraph with <strong>bold</strong> and <em>italic</em></p>' +
      '<ul><li>item</li></ul>' +
      '<a href="https://example.com">link</a>' +
      '<code>inline code</code>' +
      '<pre>block code</pre>' +
      '<img src="photo.jpg" alt="photo" />'

    const result = sanitizeHtml(input)
    expect(result).toContain('<h1>Title</h1>')
    expect(result).toContain('<p>')
    expect(result).toContain('<strong>bold</strong>')
    expect(result).toContain('<em>italic</em>')
    expect(result).toContain('<ul><li>item</li></ul>')
    expect(result).toContain('<a href="https://example.com">link</a>')
    expect(result).toContain('<code>inline code</code>')
    expect(result).toContain('<pre>block code</pre>')
    expect(result).toContain('<img')
  })

  it('preserves target attribute on links', () => {
    const input = '<a href="https://example.com" target="_blank">external</a>'
    const result = sanitizeHtml(input)
    expect(result).toContain('target="_blank"')
    expect(result).toContain('href="https://example.com"')
    expect(result).toContain('external')
  })

  // -- Edge cases -----------------------------------------------------------

  it('handles empty string', () => {
    const result = sanitizeHtml('')
    expect(result).toBe('')
  })

  it('handles input with only whitespace', () => {
    const result = sanitizeHtml('   ')
    expect(result).toBe('   ')
  })

  it('strips nested malicious content inside safe tags', () => {
    const input = '<p>hello <script>alert(1)</script> world</p>'
    const result = sanitizeHtml(input)
    expect(result).not.toContain('<script')
    expect(result).toContain('<p>')
    expect(result).toContain('hello')
    expect(result).toContain('world')
  })

  it('strips event handler attributes like onclick', () => {
    const input = '<p onclick="alert(1)">click me</p>'
    const result = sanitizeHtml(input)
    expect(result).not.toContain('onclick')
    expect(result).toContain('<p>click me</p>')
  })

  it('strips javascript: URLs in href', () => {
    const input = '<a href="javascript:alert(1)">evil link</a>'
    const result = sanitizeHtml(input)
    // DOMPurify sanitizes javascript: URIs by default
    expect(result).not.toContain('javascript:')
  })
})

// ---------------------------------------------------------------------------
// Fix 2: updateTagSchema validator
// ---------------------------------------------------------------------------
describe('updateTagSchema validator', () => {
  it('accepts a valid name', () => {
    const result = updateTagSchema.safeParse({ name: 'JavaScript' })
    expect(result.success).toBeTruthy()
    if (result.success) {
      expect(result.data.name).toBe('JavaScript')
    }
  })

  it('rejects empty string after trim', () => {
    const result = updateTagSchema.safeParse({ name: '   ' })
    expect(result.success).toBeFalsy()
  })

  it('rejects name exceeding 100 characters', () => {
    const longName = 'a'.repeat(101)
    const result = updateTagSchema.safeParse({ name: longName })
    expect(result.success).toBeFalsy()
  })

  it('accepts name at exactly 100 characters', () => {
    const name = 'a'.repeat(100)
    const result = updateTagSchema.safeParse({ name })
    expect(result.success).toBeTruthy()
  })

  it('trims leading and trailing whitespace', () => {
    const result = updateTagSchema.safeParse({ name: '  Svelte  ' })
    expect(result.success).toBeTruthy()
    if (result.success) {
      expect(result.data.name).toBe('Svelte')
    }
  })

  it('rejects missing name field', () => {
    const result = updateTagSchema.safeParse({})
    expect(result.success).toBeFalsy()
  })

  it('rejects null name', () => {
    const result = updateTagSchema.safeParse({ name: null })
    expect(result.success).toBeFalsy()
  })

  it('rejects non-string name', () => {
    const result = updateTagSchema.safeParse({ name: 123 })
    expect(result.success).toBeFalsy()
  })

  it('provides error message for empty name', () => {
    const result = updateTagSchema.safeParse({ name: '' })
    expect(result.success).toBeFalsy()
    if (!result.success) {
      const nameIssue = result.error.issues.find((i) => i.path.includes('name'))
      expect(nameIssue).toBeDefined()
    }
  })
})

// ---------------------------------------------------------------------------
// Fix 3: Scheduled publish cron indexes posts
// ---------------------------------------------------------------------------
describe('indexBlogPost export', () => {
  it('is a callable function', async () => {
    // Verify the module exports indexBlogPost as a function so the cron
    // endpoint can call it after auto-publishing scheduled posts.
    const mod = await import('$lib/server/search/indexer')
    expect(typeof mod.indexBlogPost).toBe('function')
  })
})
