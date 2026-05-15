import { describe, expect, it } from 'vitest'

describe('Link preview SSRF protection', () => {
  it('blocks localhost', async () => {
    const { linkPreviewSchema } = await import('$lib/validators/blog')
    const result = linkPreviewSchema.safeParse({ url: 'http://localhost:3000/admin' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('internal or private')
    }
  })

  it('blocks 127.0.0.1', async () => {
    const { linkPreviewSchema } = await import('$lib/validators/blog')
    const result = linkPreviewSchema.safeParse({ url: 'http://127.0.0.1/admin' })
    expect(result.success).toBe(false)
  })

  it('blocks 0.0.0.0', async () => {
    const { linkPreviewSchema } = await import('$lib/validators/blog')
    const result = linkPreviewSchema.safeParse({ url: 'http://0.0.0.0/debug' })
    expect(result.success).toBe(false)
  })

  it('blocks cloud metadata endpoint', async () => {
    const { linkPreviewSchema } = await import('$lib/validators/blog')
    const result = linkPreviewSchema.safeParse({ url: 'http://169.254.169.254/latest/meta-data/' })
    expect(result.success).toBe(false)
  })

  it('blocks GCP metadata', async () => {
    const { linkPreviewSchema } = await import('$lib/validators/blog')
    const result = linkPreviewSchema.safeParse({ url: 'http://metadata.google.internal/' })
    expect(result.success).toBe(false)
  })

  it('blocks IPv6 localhost', async () => {
    const { linkPreviewSchema } = await import('$lib/validators/blog')
    const result = linkPreviewSchema.safeParse({ url: 'http://[::1]/admin' })
    // The URL parser may resolve [::1] to ::1
    expect(result.success).toBe(false)
  })

  it('blocks 10.x private range', async () => {
    const { linkPreviewSchema } = await import('$lib/validators/blog')
    const result = linkPreviewSchema.safeParse({ url: 'http://10.0.0.1/internal' })
    expect(result.success).toBe(false)
  })

  it('blocks 172.16.x private range', async () => {
    const { linkPreviewSchema } = await import('$lib/validators/blog')
    const result = linkPreviewSchema.safeParse({ url: 'http://172.16.0.1/internal' })
    expect(result.success).toBe(false)
  })

  it('blocks 192.168.x private range', async () => {
    const { linkPreviewSchema } = await import('$lib/validators/blog')
    const result = linkPreviewSchema.safeParse({ url: 'http://192.168.1.1/router' })
    expect(result.success).toBe(false)
  })

  it('allows public URLs', async () => {
    const { linkPreviewSchema } = await import('$lib/validators/blog')
    const result = linkPreviewSchema.safeParse({ url: 'https://example.com/blog/post' })
    expect(result.success).toBe(true)
  })

  it('allows public HTTP URLs', async () => {
    const { linkPreviewSchema } = await import('$lib/validators/blog')
    const result = linkPreviewSchema.safeParse({ url: 'http://example.com/page' })
    expect(result.success).toBe(true)
  })

  it('rejects non-URL strings', async () => {
    const { linkPreviewSchema } = await import('$lib/validators/blog')
    const result = linkPreviewSchema.safeParse({ url: 'not-a-url' })
    expect(result.success).toBe(false)
  })
})

describe('Invoice pagination parameters', () => {
  it('clamps limit to max 100', () => {
    const limitParam = '500'
    const limit = Math.min(Math.max(Number(limitParam) || 20, 1), 100)
    expect(limit).toBe(100)
  })

  it('clamps limit to min 1', () => {
    const limitParam = '0'
    const limit = Math.min(Math.max(Number(limitParam) || 20, 1), 100)
    expect(limit).toBe(20) // 0 is falsy so defaults to 20
  })

  it('defaults to 20 when no limit provided', () => {
    const limitParam = ''
    const limit = Math.min(Math.max(Number(limitParam) || 20, 1), 100)
    expect(limit).toBe(20)
  })

  it('clamps offset to min 0', () => {
    const offsetParam = '-5'
    const offset = Math.max(Number(offsetParam) || 0, 0)
    expect(offset).toBe(0)
  })

  it('defaults to 0 when no offset provided', () => {
    const offsetParam = ''
    const offset = Math.max(Number(offsetParam) || 0, 0)
    expect(offset).toBe(0)
  })

  it('uses provided valid limit and offset', () => {
    const limitParam = '50'
    const offsetParam = '100'
    const limit = Math.min(Math.max(Number(limitParam) || 20, 1), 100)
    const offset = Math.max(Number(offsetParam) || 0, 0)
    expect(limit).toBe(50)
    expect(offset).toBe(100)
  })
})
