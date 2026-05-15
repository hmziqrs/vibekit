import { importMarkdown } from '$lib/editor/utils/markdown-import'
import { describe, expect, it } from 'vitest'

describe(importMarkdown, () => {
  it('converts basic markdown to clean HTML', async () => {
    const result = await importMarkdown('# Hello\n\nWorld')
    expect(result).toContain('Hello')
    expect(result).toContain('World')
  })

  it('converts bold and italic', async () => {
    const result = await importMarkdown('**bold** and *italic*')
    expect(result).toContain('<strong>bold</strong>')
    expect(result).toContain('<em>italic</em>')
  })

  it('converts links', async () => {
    const result = await importMarkdown('[click](https://example.com)')
    expect(result).toContain('href="https://example.com"')
    expect(result).toContain('click')
  })

  it('converts images with multi-word alt text', async () => {
    const result = await importMarkdown('![alt text](/img/photo.jpg)')
    expect(result).toContain('src="/img/photo.jpg"')
    expect(result).toContain('alt="alt text"')
  })

  it('converts unordered lists', async () => {
    const result = await importMarkdown('- one\n- two\n- three')
    expect(result).toContain('<li>one</li>')
    expect(result).toContain('<li>two</li>')
    expect(result).toContain('<li>three</li>')
  })

  it('converts code blocks', async () => {
    const result = await importMarkdown('```\nconst x = 1\n```')
    expect(result).toContain('const x = 1')
  })

  it('handles empty input', async () => {
    const result = await importMarkdown('')
    expect(result).toBeDefined()
    expect(typeof result).toBe('string')
  })

  it('cleans pasted HTML through cleanPastedHtml', async () => {
    const result = await importMarkdown('<script>alert("xss")</script>\n\nHello')
    expect(result).not.toContain('<script>')
    expect(result).toContain('Hello')
  })
})
