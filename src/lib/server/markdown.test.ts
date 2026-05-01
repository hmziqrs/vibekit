import { describe, expect, it } from 'vitest'

import { renderAndSanitize, renderMarkdown, sanitizeHtml } from './markdown'

describe(renderMarkdown, () => {
  it('renders headings', () => {
    const html = renderMarkdown('# Hello')
    expect(html).toContain('<h1')
    expect(html).toContain('Hello')
  })

  it('renders bold text', () => {
    const html = renderMarkdown('**bold**')
    expect(html).toContain('<strong>bold</strong>')
  })

  it('renders italic text', () => {
    const html = renderMarkdown('*italic*')
    expect(html).toContain('<em>italic</em>')
  })

  it('renders links', () => {
    const html = renderMarkdown('[link](https://example.com)')
    expect(html).toContain('<a href="https://example.com">link</a>')
  })

  it('renders code blocks', () => {
    const html = renderMarkdown('```\ncode\n```')
    expect(html).toContain('<pre><code>code\n</code></pre>')
  })

  it('renders inline code', () => {
    const html = renderMarkdown('Use `code` here')
    expect(html).toContain('<code>code</code>')
  })

  it('renders lists', () => {
    const html = renderMarkdown('- item 1\n- item 2')
    expect(html).toContain('<li>')
    expect(html).toContain('item 1')
  })

  it('renders GFM tables', () => {
    const html = renderMarkdown('| A | B |\n| --- | --- |\n| 1 | 2 |')
    expect(html).toContain('<table>')
    expect(html).toContain('<td>1</td>')
  })

  it('renders GFM strikethrough', () => {
    const html = renderMarkdown('~~deleted~~')
    expect(html).toContain('<del>deleted</del>')
  })

  it('returns empty string for empty input', () => {
    expect(renderMarkdown('')).toBe('')
  })
})

describe(sanitizeHtml, () => {
  it('removes script tags', () => {
    const result = sanitizeHtml('<p>Hello</p><script>alert("xss")</script>')
    expect(result).not.toContain('<script')
    expect(result).toContain('<p>Hello</p>')
  })

  it('removes event handlers', () => {
    const result = sanitizeHtml('<p onclick="alert(1)">Hello</p>')
    expect(result).not.toContain('onclick')
  })

  it('removes iframe tags', () => {
    const result = sanitizeHtml('<iframe src="evil.com"></iframe><p>Safe</p>')
    expect(result).not.toContain('<iframe')
    expect(result).toContain('<p>Safe</p>')
  })

  it('preserves safe content', () => {
    const html = '<h1>Title</h1><p>Paragraph with <a href="https://example.com">link</a></p>'
    expect(sanitizeHtml(html)).toBe(html)
  })
})

describe(renderAndSanitize, () => {
  it('renders and sanitizes markdown', () => {
    const result = renderAndSanitize('# Hello **world**')
    expect(result).toContain('<h1')
    expect(result).toContain('<strong>world</strong>')
  })

  it('sanitizes embedded scripts', () => {
    const result = renderAndSanitize('Hello\n\n<script>alert(1)</script>')
    expect(result).not.toContain('<script')
  })
})
