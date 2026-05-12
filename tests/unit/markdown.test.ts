import { renderAndSanitize } from '$lib/markdown'
import { describe, expect, it } from 'vitest'

describe(renderAndSanitize, () => {
  it('renders headings', () => {
    const result = renderAndSanitize('# Hello')
    expect(result).toContain('<h1')
    expect(result).toContain('Hello')
  })

  it('renders bold text', () => {
    const result = renderAndSanitize('**bold**')
    expect(result).toContain('<strong>bold</strong>')
  })

  it('renders italic text', () => {
    const result = renderAndSanitize('*italic*')
    expect(result).toContain('<em>italic</em>')
  })

  it('renders links', () => {
    const result = renderAndSanitize('[link](https://example.com)')
    expect(result).toContain('<a href="https://example.com">link</a>')
  })

  it('renders code blocks with syntax highlighting', () => {
    const result = renderAndSanitize('```\ncode\n```')
    expect(result).toContain('<pre><code')
    expect(result).toContain('hljs')
    expect(result).toContain('code')
  })

  it('renders inline code', () => {
    const result = renderAndSanitize('Use `code` here')
    expect(result).toContain('<code>code</code>')
  })

  it('renders lists', () => {
    const result = renderAndSanitize('- item 1\n- item 2')
    expect(result).toContain('<li>')
    expect(result).toContain('item 1')
  })

  it('renders GFM tables', () => {
    const result = renderAndSanitize('| A | B |\n| --- | --- |\n| 1 | 2 |')
    expect(result).toContain('<table>')
    expect(result).toContain('<td>1</td>')
  })

  it('renders GFM strikethrough', () => {
    const result = renderAndSanitize('~~deleted~~')
    expect(result).toContain('<del>deleted</del>')
  })

  it('returns empty string for empty input', () => {
    expect(renderAndSanitize('')).toBe('')
  })

  it('sanitizes embedded scripts', () => {
    const result = renderAndSanitize('Hello\n\n<script>alert(1)</script>')
    expect(result).not.toContain('<script')
  })
})
