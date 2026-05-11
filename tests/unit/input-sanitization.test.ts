import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { renderAndSanitize } from '$lib/markdown'
import { describe, expect, it } from 'vitest'

describe('markdown sanitizer uses DOMPurify', () => {
  it('strips script tags from rendered markdown', async () => {
    const result = renderAndSanitize('Hello <script>alert("xss")</script> world')
    expect(result).not.toContain('<script')
  })

  it('strips iframe tags', async () => {
    const result = renderAndSanitize('Click <iframe src="evil.com"></iframe>')
    expect(result).not.toContain('<iframe')
  })

  it('strips form tags', async () => {
    const result = renderAndSanitize('Fill <form action="/steal"><input></form>')
    expect(result).not.toContain('<form')
    expect(result).not.toContain('<input')
  })

  it('strips onclick handlers', async () => {
    const result = renderAndSanitize('[click](javascript:alert(1))')
    expect(result).not.toContain('javascript:')
  })

  it('preserves safe HTML like links and bold', async () => {
    const result = renderAndSanitize('**bold** and [link](https://example.com)')
    expect(result).toContain('<strong>bold</strong>')
    expect(result).toContain('https://example.com')
  })

  it('preserves images with valid sources', async () => {
    const result = renderAndSanitize('![alt](https://example.com/image.png)')
    expect(result).toContain('<img')
    expect(result).toContain('https://example.com/image.png')
  })

  it('markdown.ts imports isomorphic-dompurify', async () => {
    const source = readFileSync(resolve(process.cwd(), 'src/lib/markdown.ts'), 'utf8')
    expect(source).toContain('isomorphic-dompurify')
  })
})

describe('blog preview page sanitization', () => {
  it('imports isomorphic-dompurify', async () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/routes/(admin)/admin/blog/[id]/preview/+page.svelte'),
      'utf8'
    )
    expect(source).toContain('isomorphic-dompurify')
  })

  it('sanitizes TipTap HTML output with DOMPurify', async () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/routes/(admin)/admin/blog/[id]/preview/+page.svelte'),
      'utf8'
    )
    expect(source).toContain('purify.sanitize(raw')
  })

  it('sanitizes contentHtml passthrough with DOMPurify', async () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/routes/(admin)/admin/blog/[id]/preview/+page.svelte'),
      'utf8'
    )
    expect(source).toContain('purify.sanitize(post.contentHtml')
  })

  it('has PURIFY_OPTS with forbidden tags and attrs', async () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/routes/(admin)/admin/blog/[id]/preview/+page.svelte'),
      'utf8'
    )
    expect(source).toContain('FORBID_TAGS')
    expect(source).toContain('FORBID_ATTR')
    expect(source).toContain('ADD_ATTR')
  })
})
