import { cleanPastedHtml, sanitizeHtml } from '$lib/editor/utils/clean-paste'
import { describe, expect, it } from 'vitest'

describe(cleanPastedHtml, () => {
  it('removes Google Docs meta tags', () => {
    const input = '<meta charset="utf-8"><p>Hello</p>'
    expect(cleanPastedHtml(input)).toBe('<p>Hello</p>')
  })

  it('removes Word-specific classes', () => {
    const input = '<p class="MsoNormal">Hello</p>'
    expect(cleanPastedHtml(input)).toBe('<p>Hello</p>')
  })

  it('removes Word conditional comments', () => {
    const input = '<!--[if gte mso 9]><xml>...</xml><![endif]--><p>Hello</p>'
    expect(cleanPastedHtml(input)).toBe('<p>Hello</p>')
  })

  it('removes inline styles', () => {
    const input = '<p style="font-size: 14px; color: red;">Hello</p>'
    expect(cleanPastedHtml(input)).toBe('<p>Hello</p>')
  })

  it('removes class attributes', () => {
    const input = '<p class="some-class">Hello</p>'
    expect(cleanPastedHtml(input)).toBe('<p>Hello</p>')
  })

  it('removes empty spans', () => {
    const input = '<p>Hello <span></span>world</p>'
    expect(cleanPastedHtml(input)).toBe('<p>Hello world</p>')
  })

  it('converts divs to paragraphs', () => {
    const input = '<div>Hello</div><div>World</div>'
    expect(cleanPastedHtml(input)).toBe('<p>Hello</p><p>World</p>')
  })

  it('preserves valid formatting after cleanup', () => {
    const input = '<p style="font-size:12px"><strong>Bold</strong> and <em>italic</em></p>'
    expect(cleanPastedHtml(input)).toBe('<p><strong>Bold</strong> and <em>italic</em></p>')
  })

  it('handles complex Word paste', () => {
    const input = `<p class="MsoNormal" style="margin:0"><span style="font-family:Arial">Hello</span></p>`
    expect(cleanPastedHtml(input)).toBe('<p>Hello</p>')
  })

  it('preserves links after cleanup', () => {
    const input = '<a href="https://example.com" style="color:blue">link</a>'
    expect(cleanPastedHtml(input)).toBe('<a href="https://example.com">link</a>')
  })

  it('removes XML declarations', () => {
    const input = '<?xml version="1.0"?><p>Hello</p>'
    expect(cleanPastedHtml(input)).toBe('<p>Hello</p>')
  })
})

describe(sanitizeHtml, () => {
  it('strips script tags', () => {
    expect(sanitizeHtml('<p>Hello</p><script>alert(1)</script>')).toBe('<p>Hello</p>alert(1)')
  })

  it('preserves allowed tags', () => {
    expect(sanitizeHtml('<p><strong>Bold</strong></p>')).toBe('<p><strong>Bold</strong></p>')
  })

  it('strips disallowed attributes from links', () => {
    expect(sanitizeHtml('<a href="https://example.com" onclick="evil()">link</a>')).toBe(
      '<a href="https://example.com">link</a>'
    )
  })

  it('preserves allowed attributes on links', () => {
    expect(
      sanitizeHtml('<a href="https://example.com" target="_blank" rel="noopener">link</a>')
    ).toBe('<a href="https://example.com" target="_blank" rel="noopener">link</a>')
  })

  it('strips unknown tags', () => {
    expect(sanitizeHtml('<p>Hello</p><custom>world</custom>')).toBe('<p>Hello</p>world')
  })
})
