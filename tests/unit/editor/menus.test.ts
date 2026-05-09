import { sanitizeHtml } from '$lib/editor/utils/clean-paste'
import { describe, expect, it } from 'vitest'

describe(sanitizeHtml, () => {
  it('allows basic formatting tags', () => {
    const input = '<p>Hello <strong>world</strong></p>'
    expect(sanitizeHtml(input)).toBe(input)
  })

  it('strips script tags but preserves text content', () => {
    const input = '<p>Hello</p><script>alert("xss")</script>'
    expect(sanitizeHtml(input)).toBe('<p>Hello</p>alert("xss")')
  })

  it('strips style tags but preserves text content', () => {
    const input = '<p>Hello</p><style>body{color:red}</style>'
    expect(sanitizeHtml(input)).toBe('<p>Hello</p>body{color:red}')
  })

  it('preserves link href and target', () => {
    const input = '<a href="https://example.com" target="_blank">link</a>'
    expect(sanitizeHtml(input)).toBe(input)
  })

  it('strips link onclick', () => {
    const input = '<a href="https://example.com" onclick="evil()">link</a>'
    expect(sanitizeHtml(input)).toBe('<a href="https://example.com">link</a>')
  })

  it('strips img onerror', () => {
    const input = '<img onerror="alert(1)">'
    expect(sanitizeHtml(input)).toBe('<img>')
  })

  it('preserves table colspan/rowspan', () => {
    const input = '<td colspan="2" rowspan="3">cell</td>'
    expect(sanitizeHtml(input)).toBe(input)
  })

  it('strips unknown tags completely', () => {
    const input = '<div><marquee>text</marquee></div>'
    expect(sanitizeHtml(input)).toBe('<div>text</div>')
  })

  it('preserves headings, lists, blockquotes', () => {
    const input = '<h2>Title</h2><ul><li>item</li></ul><blockquote>quote</blockquote>'
    expect(sanitizeHtml(input)).toBe(input)
  })

  it('handles empty input', () => {
    expect(sanitizeHtml('')).toBe('')
  })

  it('preserves allowed img attrs', () => {
    const input = '<img src="photo.jpg">'
    expect(sanitizeHtml(input)).toBe(input)
  })
})
