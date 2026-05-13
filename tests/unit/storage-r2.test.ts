import { describe, expect, it, vi } from 'vitest'

function createMockR2Bucket() {
  return {
    createSignedUrl: vi
      .fn<() => Promise<string>>()
      .mockResolvedValue('https://r2.example.com/signed-url'),
    delete: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    get: vi.fn<() => Promise<unknown>>().mockResolvedValue(null),
    list: vi.fn<() => Promise<unknown>>().mockResolvedValue({
      cursor: 'next-cursor',
      objects: [],
      truncated: true,
    }),
    put: vi
      .fn<() => Promise<unknown>>()
      .mockResolvedValue({ etag: 'etag-123', size: 100, uploaded: new Date() }),
  }
}

describe('createCloudflareStorage', () => {
  it('deletes a key from the bucket', async () => {
    const { createCloudflareStorage } = await import('$lib/server/adapter/cloudflare/storage-r2')
    const bucket = createMockR2Bucket()
    const storage = createCloudflareStorage(bucket as unknown as R2Bucket)

    await storage.delete('test-key')
    expect(bucket.delete).toHaveBeenCalledWith('test-key')
  })

  it('returns null when object does not exist', async () => {
    const { createCloudflareStorage } = await import('$lib/server/adapter/cloudflare/storage-r2')
    const bucket = createMockR2Bucket()
    const storage = createCloudflareStorage(bucket as unknown as R2Bucket)

    const result = await storage.get('nonexistent')
    expect(result).toBeNull()
  })

  it('returns stored object when it exists', async () => {
    const { createCloudflareStorage } = await import('$lib/server/adapter/cloudflare/storage-r2')
    const bucket = createMockR2Bucket()
    const body = new ReadableStream()
    bucket.get.mockResolvedValue({
      body,
      etag: 'abc123',
      httpMetadata: { cacheControl: 'max-age=3600', contentType: 'image/png' },
      size: 2048,
    })
    const storage = createCloudflareStorage(bucket as unknown as R2Bucket)

    const result = await storage.get('images/photo.png')
    expect(result).toStrictEqual({
      body,
      cacheControl: 'max-age=3600',
      contentType: 'image/png',
      etag: 'abc123',
      size: 2048,
    })
  })

  it('defaults content type to application/octet-stream', async () => {
    const { createCloudflareStorage } = await import('$lib/server/adapter/cloudflare/storage-r2')
    const bucket = createMockR2Bucket()
    bucket.get.mockResolvedValue({
      body: new ReadableStream(),
      etag: 'abc',
      httpMetadata: {},
      size: 100,
    })
    const storage = createCloudflareStorage(bucket as unknown as R2Bucket)

    const result = await storage.get('some-file')
    expect(result?.contentType).toBe('application/octet-stream')
  })

  it('lists objects with prefix and pagination', async () => {
    const { createCloudflareStorage } = await import('$lib/server/adapter/cloudflare/storage-r2')
    const bucket = createMockR2Bucket()
    bucket.list.mockResolvedValue({
      cursor: 'page-2',
      objects: [
        {
          httpMetadata: { contentType: 'image/png' },
          key: 'images/a.png',
          size: 100,
          uploaded: new Date('2026-01-01'),
        },
        { httpMetadata: {}, key: 'images/b.png', size: 200, uploaded: new Date('2026-01-02') },
      ],
      truncated: false,
    })
    const storage = createCloudflareStorage(bucket as unknown as R2Bucket)

    const result = await storage.list('images/', 'page-1', 10)
    expect(bucket.list).toHaveBeenCalledWith({
      cursor: 'page-1',
      limit: 10,
      prefix: 'images/',
    })
    expect(result.items).toHaveLength(2)
    expect(result.items[0].key).toBe('images/a.png')
    expect(result.items[1].contentType).toBeUndefined()
    expect(result.truncated).toBe(false)
    expect(result.nextCursor).toBeUndefined()
  })

  it('returns nextCursor when truncated', async () => {
    const { createCloudflareStorage } = await import('$lib/server/adapter/cloudflare/storage-r2')
    const bucket = createMockR2Bucket()
    bucket.list.mockResolvedValue({
      cursor: 'page-2',
      objects: [],
      truncated: true,
    })
    const storage = createCloudflareStorage(bucket as unknown as R2Bucket)

    const result = await storage.list('prefix/')
    expect(result.truncated).toBe(true)
    expect(result.nextCursor).toBe('page-2')
  })

  it('defaults list limit to 100', async () => {
    const { createCloudflareStorage } = await import('$lib/server/adapter/cloudflare/storage-r2')
    const bucket = createMockR2Bucket()
    bucket.list.mockResolvedValue({ cursor: null, objects: [], truncated: false })
    const storage = createCloudflareStorage(bucket as unknown as R2Bucket)

    await storage.list()
    expect(bucket.list).toHaveBeenCalledWith({
      cursor: undefined,
      limit: 100,
      prefix: undefined,
    })
  })

  it('puts an object with metadata', async () => {
    const { createCloudflareStorage } = await import('$lib/server/adapter/cloudflare/storage-r2')
    const bucket = createMockR2Bucket()
    const storage = createCloudflareStorage(bucket as unknown as R2Bucket)
    const body = new Uint8Array([1, 2, 3])

    const result = await storage.put('test/file.txt', body, {
      contentType: 'text/plain',
      metadata: { author: 'test' },
    })

    expect(bucket.put).toHaveBeenCalledWith('test/file.txt', body, {
      customMetadata: { author: 'test' },
      httpMetadata: { cacheControl: undefined, contentType: 'text/plain' },
    })
    expect(result.key).toBe('test/file.txt')
    expect(result.contentType).toBe('text/plain')
    expect(result.url).toBe('/cdn/blog/test/file.txt')
  })

  it('creates a signed URL with default expiry', async () => {
    const { createCloudflareStorage } = await import('$lib/server/adapter/cloudflare/storage-r2')
    const bucket = createMockR2Bucket()
    const storage = createCloudflareStorage(bucket as unknown as R2Bucket)

    const url = await storage.getPresignedUrl('private/file.pdf')
    expect(bucket.createSignedUrl).toHaveBeenCalledWith('private/file.pdf', {
      expiresIn: 3600,
    })
    expect(url).toBe('https://r2.example.com/signed-url')
  })

  it('creates a signed URL with custom expiry', async () => {
    const { createCloudflareStorage } = await import('$lib/server/adapter/cloudflare/storage-r2')
    const bucket = createMockR2Bucket()
    const storage = createCloudflareStorage(bucket as unknown as R2Bucket)

    await storage.getPresignedUrl('file.pdf', { expiresIn: 7200 })
    expect(bucket.createSignedUrl).toHaveBeenCalledWith('file.pdf', {
      expiresIn: 7200,
    })
  })
})
