import { describe, expect, it, vi } from 'vitest'

describe('Adapter layer — node/cache', () => {
  it('createNodeCache returns a CacheClient with purgeBlog and purgePatterns', async () => {
    const { createNodeCache } = await import('$lib/server/adapter/node/cache')
    const cache = createNodeCache()
    expect(cache).toBeDefined()
    expect(typeof cache.purgeBlog).toBe('function')
    expect(typeof cache.purgePatterns).toBe('function')
  })

  it('purgeBlog resolves without error', async () => {
    const { createNodeCache } = await import('$lib/server/adapter/node/cache')
    const cache = createNodeCache()
    await expect(cache.purgeBlog('test-slug')).resolves.toBeUndefined()
  })

  it('purgePatterns resolves without error', async () => {
    const { createNodeCache } = await import('$lib/server/adapter/node/cache')
    const cache = createNodeCache()
    await expect(cache.purgePatterns(['/blog/*'])).resolves.toBeUndefined()
  })
})

describe('Adapter layer — cloudflare/cache', () => {
  it('createCloudflareCache returns a CacheClient', async () => {
    const { createCloudflareCache } = await import('$lib/server/adapter/cloudflare/cache')
    const cache = createCloudflareCache(undefined)
    expect(cache).toBeDefined()
    expect(typeof cache.purgeBlog).toBe('function')
    expect(typeof cache.purgePatterns).toBe('function')
  })

  it('purgeBlog resolves when no platform caches', async () => {
    const { createCloudflareCache } = await import('$lib/server/adapter/cloudflare/cache')
    const cache = createCloudflareCache(undefined)
    await expect(cache.purgeBlog('test')).resolves.toBeUndefined()
  })

  it('purgePatterns resolves when no platform caches', async () => {
    const { createCloudflareCache } = await import('$lib/server/adapter/cloudflare/cache')
    const cache = createCloudflareCache({ caches: undefined })
    await expect(cache.purgePatterns(['/blog/*'])).resolves.toBeUndefined()
  })
})

describe('Adapter layer — cloudflare/email-binding', () => {
  it('createCloudflareEmail returns an EmailClient', async () => {
    const { createCloudflareEmail } = await import('$lib/server/adapter/cloudflare/email-binding')
    const client = createCloudflareEmail(undefined)
    expect(client).toBeDefined()
    expect(typeof client.send).toBe('function')
  })

  it('send returns fallback when no binding', async () => {
    const { createCloudflareEmail } = await import('$lib/server/adapter/cloudflare/email-binding')
    const client = createCloudflareEmail(undefined)
    const result = await client.send({
      html: '<p>Test</p>',
      subject: 'Test',
      text: 'Test',
      to: 'test@example.com',
    })
    expect(result).toBeDefined()
  })

  it('send delegates to binding when provided', async () => {
    const { createCloudflareEmail } = await import('$lib/server/adapter/cloudflare/email-binding')
    const mockSend = vi.fn().mockResolvedValue(undefined)
    const client = createCloudflareEmail({ send: mockSend })
    await client.send({
      html: '<p>Hello</p>',
      subject: 'Sub',
      text: 'Text',
      to: 'user@test.com',
    })
    expect(mockSend).toHaveBeenCalledOnce()
  })
})

describe('Adapter layer — node/email-rest', () => {
  it('createNodeEmail returns an EmailClient', async () => {
    const { createNodeEmail } = await import('$lib/server/adapter/node/email-rest')
    const client = createNodeEmail()
    expect(client).toBeDefined()
    expect(typeof client.send).toBe('function')
  })

  it('send returns result in no-config mode', async () => {
    const { createNodeEmail } = await import('$lib/server/adapter/node/email-rest')
    const client = createNodeEmail()
    const result = await client.send({
      html: '<p>Test</p>',
      subject: 'Test',
      text: 'Test',
      to: 'test@example.com',
    })
    expect(result).toBeDefined()
  })
})
