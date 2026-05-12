import { escapeHtml, highlightCodeBlocks, renderAndSanitize } from '$lib/markdown'
import { describe, expect, it } from 'vitest'

describe('syntax highlighting', () => {
  it('highlights JavaScript code blocks', () => {
    const md = '```js\nconst x = 42\n```'
    const result = renderAndSanitize(md)
    expect(result).toContain('hljs')
    expect(result).toContain('language-js')
    expect(result).toContain('const')
  })

  it('highlights TypeScript code blocks', () => {
    const md = '```typescript\ninterface Foo { bar: string }\n```'
    const result = renderAndSanitize(md)
    expect(result).toContain('language-typescript')
    expect(result).toContain('hljs')
  })

  it('highlights Python code blocks', () => {
    const md = '```python\ndef hello():\n    print("hi")\n```'
    const result = renderAndSanitize(md)
    expect(result).toContain('language-python')
    expect(result).toContain('hljs')
  })

  it('auto-detects language when not specified', () => {
    const md = '```\nfunction test() { return true }\n```'
    const result = renderAndSanitize(md)
    expect(result).toContain('hljs')
  })

  it('preserves language class on highlighted output', () => {
    const md = '```bash\necho hello\n```'
    const result = renderAndSanitize(md)
    expect(result).toContain('language-bash')
  })

  it('highlights code blocks within longer markdown content', () => {
    const md = `# Title

Some text here.

\`\`\`js
const answer = 42
\`\`\`

More text after.`
    const result = renderAndSanitize(md)
    expect(result).toContain('<h1')
    expect(result).toContain('<p>')
    expect(result).toContain('hljs')
    expect(result).toContain('const')
  })

  it('handles multiple code blocks', () => {
    const md = '```js\nconst a = 1\n```\n\nText\n\n```python\nb = 2\n```'
    const result = renderAndSanitize(md)
    expect(result).toContain('language-js')
    expect(result).toContain('language-python')
  })

  it('produces colored spans for syntax tokens', () => {
    const md = '```js\nconst x = "hello"\n```'
    const result = renderAndSanitize(md)
    expect(result).toContain('<span class="hljs-')
  })
})

describe(escapeHtml, () => {
  it('escapes ampersands', () => {
    expect(escapeHtml('foo&bar')).toBe('foo&amp;bar')
  })

  it('escapes angle brackets', () => {
    expect(escapeHtml('<div>')).toBe('&lt;div&gt;')
  })

  it('escapes quotes', () => {
    expect(escapeHtml('say "hi"')).toBe('say &quot;hi&quot;')
  })
})

describe(highlightCodeBlocks, () => {
  it('highlights a code block with language', () => {
    const html = '<pre><code class="language-javascript">const x = 1</code></pre>'
    const result = highlightCodeBlocks(html)
    expect(result).toContain('hljs')
    expect(result).toContain('const')
  })

  it('handles code block without language', () => {
    const html = '<pre><code>plain text</code></pre>'
    const result = highlightCodeBlocks(html)
    expect(result).toContain('hljs')
    expect(result).toContain('plain')
  })

  it('preserves non-code-block content', () => {
    const html = '<p>Hello</p><pre><code class="language-js">x</code></pre><p>World</p>'
    const result = highlightCodeBlocks(html)
    expect(result).toContain('<p>Hello</p>')
    expect(result).toContain('<p>World</p>')
  })
})
