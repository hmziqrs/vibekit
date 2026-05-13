import { exportToMarkdown } from '$lib/editor/utils/markdown-export'
import { describe, expect, it } from 'vitest'

describe(exportToMarkdown, () => {
  it('converts basic HTML to markdown', () => {
    const result = exportToMarkdown('<h1>Title</h1><p>Hello world</p>')
    expect(result).toContain('# Title')
    expect(result).toContain('Hello world')
  })

  it('converts regular images', () => {
    const html = '<p><img src="/img/photo.jpg" alt="Photo"></p>'
    const result = exportToMarkdown(html)
    expect(result).toContain('![Photo](/img/photo.jpg)')
  })

  it('converts links', () => {
    const html = '<p><a href="https://example.com">click here</a></p>'
    const result = exportToMarkdown(html)
    expect(result).toContain('[click here](https://example.com)')
  })

  it('converts code blocks', () => {
    const html = '<pre><code class="language-js">const x = 1</code></pre>'
    const result = exportToMarkdown(html)
    expect(result).toContain('```js')
    expect(result).toContain('const x = 1')
    expect(result).toContain('```')
  })

  it('converts bold and italic', () => {
    const html = '<p><strong>bold</strong> and <em>italic</em></p>'
    const result = exportToMarkdown(html)
    expect(result).toContain('**bold**')
    // Turndown uses _ for italic in node environment
    expect(result).toMatch(/[_*]italic[_*]/)
  })

  it('converts headings atx style', () => {
    const html = '<h2>Section</h2><h3>Subsection</h3>'
    const result = exportToMarkdown(html)
    expect(result).toContain('## Section')
    expect(result).toContain('### Subsection')
  })

  it('converts unordered lists', () => {
    const html = '<ul><li>Item 1</li><li>Item 2</li></ul>'
    const result = exportToMarkdown(html)
    expect(result).toContain('Item 1')
    expect(result).toContain('Item 2')
  })

  it('converts blockquotes', () => {
    const html = '<blockquote><p>A quote</p></blockquote>'
    const result = exportToMarkdown(html)
    expect(result).toContain('> A quote')
  })

  it('returns empty string for empty input', () => {
    expect(exportToMarkdown('')).toBe('')
  })

  it('handles nested HTML structures', () => {
    const html = '<div><h2>Title</h2><p>Content with <a href="/link">link</a></p></div>'
    const result = exportToMarkdown(html)
    expect(result).toContain('## Title')
    expect(result).toContain('[link](/link)')
  })
})
