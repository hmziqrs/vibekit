import { bulkActionSchema, createTagSchema, linkPreviewSchema } from '$lib/validators/blog'
import { describe, expect, it } from 'vitest'

describe('createTagSchema', () => {
  it('accepts valid tag name', () => {
    const result = createTagSchema.safeParse({ name: 'TypeScript' })
    expect(result.success).toBe(true)
  })

  it('trims whitespace from name', () => {
    const result = createTagSchema.parse({ name: '  TypeScript  ' })
    expect(result.name).toBe('TypeScript')
  })

  it('rejects empty name', () => {
    const result = createTagSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects whitespace-only name', () => {
    const result = createTagSchema.safeParse({ name: '   ' })
    expect(result.success).toBe(false)
  })

  it('rejects name exceeding 100 chars', () => {
    const result = createTagSchema.safeParse({ name: 'a'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('accepts 100-char name', () => {
    const result = createTagSchema.safeParse({ name: 'a'.repeat(100) })
    expect(result.success).toBe(true)
  })

  it('rejects non-string name', () => {
    const result = createTagSchema.safeParse({ name: 123 })
    expect(result.success).toBe(false)
  })

  it('rejects missing name', () => {
    const result = createTagSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('bulkActionSchema', () => {
  it('accepts valid ids array', () => {
    const result = bulkActionSchema.safeParse({ ids: ['id1', 'id2'] })
    expect(result.success).toBe(true)
  })

  it('rejects empty ids array', () => {
    const result = bulkActionSchema.safeParse({ ids: [] })
    expect(result.success).toBe(false)
  })

  it('rejects missing ids', () => {
    const result = bulkActionSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects ids exceeding 100 elements', () => {
    const ids = Array.from({ length: 101 }, (_, i) => `id-${i}`)
    const result = bulkActionSchema.safeParse({ ids })
    expect(result.success).toBe(false)
  })

  it('accepts exactly 100 ids', () => {
    const ids = Array.from({ length: 100 }, (_, i) => `id-${i}`)
    const result = bulkActionSchema.safeParse({ ids })
    expect(result.success).toBe(true)
  })

  it('rejects non-string elements in ids', () => {
    const result = bulkActionSchema.safeParse({ ids: [123, null, {}] })
    expect(result.success).toBe(false)
  })

  it('rejects empty string elements', () => {
    const result = bulkActionSchema.safeParse({ ids: ['valid', '', 'also-valid'] })
    expect(result.success).toBe(false)
  })

  it('rejects non-array ids', () => {
    const result = bulkActionSchema.safeParse({ ids: 'not-an-array' })
    expect(result.success).toBe(false)
  })
})

describe('linkPreviewSchema', () => {
  it('accepts valid https URL', () => {
    const result = linkPreviewSchema.safeParse({ url: 'https://example.com/page' })
    expect(result.success).toBe(true)
  })

  it('accepts valid http URL', () => {
    const result = linkPreviewSchema.safeParse({ url: 'http://example.com/page' })
    expect(result.success).toBe(true)
  })

  it('trims whitespace from URL', () => {
    const result = linkPreviewSchema.parse({ url: '  https://example.com  ' })
    expect(result.url).toBe('https://example.com')
  })

  it('rejects empty URL', () => {
    const result = linkPreviewSchema.safeParse({ url: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing URL', () => {
    const result = linkPreviewSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects non-URL string', () => {
    const result = linkPreviewSchema.safeParse({ url: 'not-a-url' })
    expect(result.success).toBe(false)
  })

  it('rejects ftp URL', () => {
    const result = linkPreviewSchema.safeParse({ url: 'ftp://files.example.com' })
    expect(result.success).toBe(false)
  })

  it('rejects javascript: URL (SSRF prevention)', () => {
    // oxlint-disable-next-line no-script-url
    const result = linkPreviewSchema.safeParse({ url: 'javascript:alert(1)' })
    expect(result.success).toBe(false)
  })

  it('rejects file: URL (SSRF prevention)', () => {
    const result = linkPreviewSchema.safeParse({ url: 'file:///etc/passwd' })
    expect(result.success).toBe(false)
  })

  it('rejects data: URL', () => {
    const result = linkPreviewSchema.safeParse({ url: 'data:text/html,<h1>test</h1>' })
    expect(result.success).toBe(false)
  })

  it('rejects non-string URL', () => {
    const result = linkPreviewSchema.safeParse({ url: 12_345 })
    expect(result.success).toBe(false)
  })

  it('rejects whitespace-only URL', () => {
    const result = linkPreviewSchema.safeParse({ url: '   ' })
    expect(result.success).toBe(false)
  })
})
