import { createS3Storage } from '$lib/server/adapter/s3/storage-s3'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

const mockConfig = {
  accessKeyId: 'test-access-key',
  bucket: 'test-bucket',
  endpoint: 'https://s3.example.com',
  region: 'us-east-1',
  secretAccessKey: 'test-secret-key',
}

function createStorage(publicUrl?: string) {
  return createS3Storage({ ...mockConfig, publicUrl })
}

describe('createS3Storage', () => {
  it('returns an object with all required StorageClient methods', () => {
    const storage = createStorage()
    expect(storage.put).toBeTypeOf('function')
    expect(storage.get).toBeTypeOf('function')
    expect(storage.delete).toBeTypeOf('function')
    expect(storage.list).toBeTypeOf('function')
    expect(storage.getPresignedUrl).toBeTypeOf('function')
  })

  it('uses publicUrl when provided', async () => {
    const storage = createStorage('https://cdn.example.com')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }))

    const result = await storage.put('test.txt', new Uint8Array([1, 2, 3]))

    expect(result.url).toContain('cdn.example.com')
    expect(result.url).not.toContain('s3.example.com')

    vi.unstubAllGlobals()
  })

  it('falls back to endpoint as public base when publicUrl is omitted', async () => {
    const storage = createStorage()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }))

    const result = await storage.put('test.txt', new Uint8Array([1, 2, 3]))

    expect(result.url).toContain('s3.example.com')

    vi.unstubAllGlobals()
  })

  it('strips trailing slash from endpoint', async () => {
    const storage = createS3Storage({
      ...mockConfig,
      endpoint: 'https://s3.example.com/',
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }))

    const result = await storage.put('test.txt', new Uint8Array([1, 2, 3]))

    expect(result.url).toBe('https://s3.example.com/test-bucket/test.txt')

    vi.unstubAllGlobals()
  })
})

describe('S3Storage.put', () => {
  let fetchSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchSpy)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uploads a Uint8Array body and returns PutResult', async () => {
    const storage = createStorage()
    const body = new Uint8Array([72, 101, 108, 108, 111])

    const result = await storage.put('folder/hello.txt', body)

    expect(result.key).toBe('folder/hello.txt')
    expect(result.size).toBe(5)
    expect(result.contentType).toBe('application/octet-stream')
    expect(result.url).toContain('/test-bucket/folder/hello.txt')

    expect(fetchSpy).toHaveBeenCalledOnce()
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toContain('/test-bucket/folder/hello.txt')
    expect(init.method).toBe('PUT')
    expect(init.headers['content-type']).toBe('application/octet-stream')
    expect(init.headers['content-length']).toBe('5')
    expect(init.headers.authorization).toContain('AWS4-HMAC-SHA256')
  })

  it('uploads a Blob body and returns PutResult', async () => {
    const storage = createStorage()
    const body = new Blob(['hello world'], { type: 'text/plain' })

    const result = await storage.put('blob.txt', body)

    expect(result.key).toBe('blob.txt')
    expect(result.size).toBe(11)
  })

  it('uploads a ReadableStream body', async () => {
    const storage = createStorage()
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('part1'))
        controller.enqueue(encoder.encode('part2'))
        controller.close()
      },
    })

    const result = await storage.put('stream.txt', readable)

    expect(result.key).toBe('stream.txt')
    expect(result.size).toBe(10)
  })

  it('uses provided contentType', async () => {
    const storage = createStorage()

    await storage.put('img.png', new Uint8Array([1]), {
      contentType: 'image/png',
    })

    const [_url, init] = fetchSpy.mock.calls[0]
    expect(init.headers['content-type']).toBe('image/png')
  })

  it('includes cache-control header when provided', async () => {
    const storage = createStorage()

    await storage.put('img.png', new Uint8Array([1]), {
      cacheControl: 'max-age=31536000',
    })

    const [_url, init] = fetchSpy.mock.calls[0]
    expect(init.headers['cache-control']).toBe('max-age=31536000')
  })

  it('throws on non-ok response', async () => {
    fetchSpy.mockResolvedValue({ ok: false, status: 503 })
    const storage = createStorage()

    await expect(storage.put('fail.txt', new Uint8Array([1]))).rejects.toThrow('S3 PUT failed: 503')
  })

  it('sends x-amz-content-sha256 header', async () => {
    const storage = createStorage()

    await storage.put('test.txt', new Uint8Array([1]))

    const [_url, init] = fetchSpy.mock.calls[0]
    expect(init.headers['x-amz-content-sha256']).toBe('UNSIGNED-PAYLOAD')
  })
})

describe('S3Storage.get', () => {
  let fetchSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns StoredObject for existing key', async () => {
    const body = new ReadableStream()
    fetchSpy.mockResolvedValue({
      body,
      headers: new Headers({
        'content-type': 'image/png',
        'content-length': '1024',
        'cache-control': 'max-age=3600',
      }),
      ok: true,
      status: 200,
    })

    const storage = createStorage()
    const result = await storage.get('images/photo.png')

    expect(result).not.toBeNull()
    expect(result!.contentType).toBe('image/png')
    expect(result!.size).toBe(1024)
    expect(result!.cacheControl).toBe('max-age=3600')
    expect(result!.body).toBe(body)

    expect(fetchSpy).toHaveBeenCalledOnce()
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toContain('/test-bucket/images/photo.png')
    expect(init.method ?? 'GET').toBe('GET')
    expect(init.headers.authorization).toContain('AWS4-HMAC-SHA256')
  })

  it('returns null for 404 response', async () => {
    fetchSpy.mockResolvedValue({ ok: false, status: 404 })

    const storage = createStorage()
    const result = await storage.get('missing.txt')

    expect(result).toBeNull()
  })

  it('returns default contentType when header is missing', async () => {
    fetchSpy.mockResolvedValue({
      body: new ReadableStream(),
      headers: new Headers({}),
      ok: true,
      status: 200,
    })

    const storage = createStorage()
    const result = await storage.get('no-headers.bin')

    expect(result!.contentType).toBe('application/octet-stream')
  })

  it('throws on non-ok, non-404 response', async () => {
    fetchSpy.mockResolvedValue({ ok: false, status: 500 })

    const storage = createStorage()

    await expect(storage.get('error.txt')).rejects.toThrow('S3 GET failed: 500')
  })
})

describe('S3Storage.delete', () => {
  let fetchSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 204 })
    vi.stubGlobal('fetch', fetchSpy)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends DELETE request with correct path', async () => {
    const storage = createStorage()

    await storage.delete('uploads/old-file.jpg')

    expect(fetchSpy).toHaveBeenCalledOnce()
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toContain('/test-bucket/uploads/old-file.jpg')
    expect(init.method).toBe('DELETE')
    expect(init.headers.authorization).toContain('AWS4-HMAC-SHA256')
  })

  it('does not throw on success', async () => {
    const storage = createStorage()

    await expect(storage.delete('file.txt')).resolves.toBeUndefined()
  })
})

describe('S3Storage.list', () => {
  let fetchSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <Name>test-bucket</Name>
  <Prefix>uploads/</Prefix>
  <KeyCount>2</KeyCount>
  <MaxKeys>100</MaxKeys>
  <IsTruncated>false</IsTruncated>
  <Contents>
    <Key>uploads/photo1.jpg</Key>
    <LastModified>2024-01-15T10:30:00.000Z</LastModified>
    <Size>2048</Size>
  </Contents>
  <Contents>
    <Key>uploads/photo2.png</Key>
    <LastModified>2024-01-16T14:00:00.000Z</LastModified>
    <Size>4096</Size>
  </Contents>
</ListBucketResult>`

  it('parses XML and returns items', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(sampleXml),
    })

    const storage = createStorage()
    const result = await storage.list('uploads/')

    expect(result.items).toHaveLength(2)
    expect(result.items[0].key).toBe('uploads/photo1.jpg')
    expect(result.items[0].size).toBe(2048)
    expect(result.items[0].lastModified).toBe('2024-01-15T10:30:00.000Z')
    expect(result.items[1].key).toBe('uploads/photo2.png')
    expect(result.items[1].size).toBe(4096)
    expect(result.truncated).toBe(false)
    expect(result.nextCursor).toBeUndefined()
  })

  it('sends list-type=2 query parameter', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      text: () =>
        Promise.resolve('<ListBucketResult><IsTruncated>false</IsTruncated></ListBucketResult>'),
    })

    const storage = createStorage()
    await storage.list()

    const [url] = fetchSpy.mock.calls[0]
    expect(url).toContain('list-type=2')
  })

  it('includes prefix when provided', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      text: () =>
        Promise.resolve('<ListBucketResult><IsTruncated>false</IsTruncated></ListBucketResult>'),
    })

    const storage = createStorage()
    await storage.list('assets/')

    const [url] = fetchSpy.mock.calls[0]
    expect(url).toContain('prefix=assets%2F')
  })

  it('passes custom limit', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      text: () =>
        Promise.resolve('<ListBucketResult><IsTruncated>false</IsTruncated></ListBucketResult>'),
    })

    const storage = createStorage()
    await storage.list(undefined, undefined, 50)

    const [url] = fetchSpy.mock.calls[0]
    expect(url).toContain('max-keys=50')
  })

  it('handles truncated results with next cursor', async () => {
    const truncatedXml = `<?xml version="1.0"?>
<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <IsTruncated>true</IsTruncated>
  <NextContinuationToken>abc123token</NextContinuationToken>
  <Contents>
    <Key>page1/item1.txt</Key>
    <LastModified>2024-01-01T00:00:00.000Z</LastModified>
    <Size>100</Size>
  </Contents>
</ListBucketResult>`

    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(truncatedXml),
    })

    const storage = createStorage()
    const result = await storage.list('page1/')

    expect(result.truncated).toBe(true)
    expect(result.nextCursor).toBe('abc123token')
    expect(result.items).toHaveLength(1)
  })

  it('handles empty result set', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      text: () =>
        Promise.resolve('<ListBucketResult><IsTruncated>false</IsTruncated></ListBucketResult>'),
    })

    const storage = createStorage()
    const result = await storage.list()

    expect(result.items).toHaveLength(0)
    expect(result.truncated).toBe(false)
  })

  it('handles truncated=true without NextContinuationToken', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      text: () =>
        Promise.resolve('<ListBucketResult><IsTruncated>true</IsTruncated></ListBucketResult>'),
    })

    const storage = createStorage()
    const result = await storage.list()

    expect(result.truncated).toBe(true)
    expect(result.nextCursor).toBeUndefined()
  })

  it('throws on non-ok response', async () => {
    fetchSpy.mockResolvedValue({ ok: false, status: 500 })

    const storage = createStorage()

    await expect(storage.list()).rejects.toThrow('S3 LIST failed: 500')
  })
})

describe('S3Storage.getPresignedUrl', () => {
  it('returns a URL containing required AWS4 parameters', async () => {
    const storage = createStorage()

    const url = await storage.getPresignedUrl('uploads/file.pdf')

    expect(url).toContain('X-Amz-Algorithm=AWS4-HMAC-SHA256')
    expect(url).toContain('X-Amz-Credential=')
    expect(url).toContain('X-Amz-Date=')
    expect(url).toContain('X-Amz-Expires=')
    expect(url).toContain('X-Amz-SignedHeaders=host')
    expect(url).toContain('X-Amz-Signature=')
    expect(url).toContain('/test-bucket/uploads/file.pdf')
  })

  it('uses default expiration of 3600 seconds', async () => {
    const storage = createStorage()

    const url = await storage.getPresignedUrl('file.txt')

    expect(url).toContain('X-Amz-Expires=3600')
  })

  it('uses custom expiration when provided', async () => {
    const storage = createStorage()

    const url = await storage.getPresignedUrl('file.txt', { expiresIn: 7200 })

    expect(url).toContain('X-Amz-Expires=7200')
  })

  it('includes access key in credential', async () => {
    const storage = createStorage()

    const url = await storage.getPresignedUrl('file.txt')

    expect(url).toContain('test-access-key')
  })

  it('includes region in credential', async () => {
    const storage = createStorage()

    const url = await storage.getPresignedUrl('file.txt')

    expect(url).toContain('us-east-1')
  })

  it('generates a valid signature format', async () => {
    const storage = createStorage()

    const url = await storage.getPresignedUrl('file.txt')
    const signatureMatch = url.match(/X-Amz-Signature=([^&]+)/)

    expect(signatureMatch).not.toBeNull()
    expect(signatureMatch![1]).toHaveLength(64) // SHA-256 hex digest
  })

  it('uses the base endpoint URL', async () => {
    const storage = createStorage()

    const url = await storage.getPresignedUrl('file.txt')

    expect(url.startsWith('https://s3.example.com')).toBe(true)
  })
})

describe('S3 request signing', () => {
  it('PUT request includes Authorization header', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchSpy)

    const storage = createStorage()
    await storage.put('signed.txt', new Uint8Array([1]))

    const [_url, init] = fetchSpy.mock.calls[0]
    const auth = init.headers.authorization
    expect(auth).toContain('AWS4-HMAC-SHA256')
    expect(auth).toContain('Credential=test-access-key')
    expect(auth).toContain('SignedHeaders=')
    expect(auth).toContain('Signature=')

    vi.unstubAllGlobals()
  })

  it('DELETE request includes Authorization header', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 204 })
    vi.stubGlobal('fetch', fetchSpy)

    const storage = createStorage()
    await storage.delete('del.txt')

    const [_url, init] = fetchSpy.mock.calls[0]
    const auth = init.headers.authorization
    expect(auth).toContain('AWS4-HMAC-SHA256')

    vi.unstubAllGlobals()
  })

  it('GET request includes Authorization header', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      body: new ReadableStream(),
      headers: new Headers({}),
      ok: true,
      status: 200,
    })
    vi.stubGlobal('fetch', fetchSpy)

    const storage = createStorage()
    await storage.get('get.txt')

    const [_url, init] = fetchSpy.mock.calls[0]
    const auth = init.headers.authorization
    expect(auth).toContain('AWS4-HMAC-SHA256')

    vi.unstubAllGlobals()
  })

  it('list request includes Authorization header', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () =>
        Promise.resolve('<ListBucketResult><IsTruncated>false</IsTruncated></ListBucketResult>'),
    })
    vi.stubGlobal('fetch', fetchSpy)

    const storage = createStorage()
    await storage.list()

    const [_url, init] = fetchSpy.mock.calls[0]
    const auth = init.headers.authorization
    expect(auth).toContain('AWS4-HMAC-SHA256')

    vi.unstubAllGlobals()
  })
})

describe('S3Storage edge cases', () => {
  it('handles empty ReadableStream body', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchSpy)

    const storage = createStorage()
    const emptyStream = new ReadableStream({
      start(controller) {
        controller.close()
      },
    })

    const result = await storage.put('empty.txt', emptyStream)

    expect(result.size).toBe(0)
    expect(result.key).toBe('empty.txt')

    vi.unstubAllGlobals()
  })

  it('handles keys with special characters', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchSpy)

    const storage = createStorage()
    const result = await storage.put('path with spaces/file (1).txt', new Uint8Array([1]))

    expect(result.key).toBe('path with spaces/file (1).txt')
    expect(result.url).toContain('path with spaces/file (1).txt')

    vi.unstubAllGlobals()
  })

  it('handles size missing from list XML', async () => {
    const xml = `<?xml version="1.0"?>
<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <IsTruncated>false</IsTruncated>
  <Contents>
    <Key>no-size.txt</Key>
    <LastModified>2024-01-01T00:00:00.000Z</LastModified>
  </Contents>
</ListBucketResult>`

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(xml),
    })
    vi.stubGlobal('fetch', fetchSpy)

    const storage = createStorage()
    const result = await storage.list()

    expect(result.items[0].key).toBe('no-size.txt')
    expect(result.items[0].size).toBe(0)

    vi.unstubAllGlobals()
  })

  it('handles lastModified missing from list XML', async () => {
    const xml = `<?xml version="1.0"?>
<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <IsTruncated>false</IsTruncated>
  <Contents>
    <Key>no-date.txt</Key>
    <Size>42</Size>
  </Contents>
</ListBucketResult>`

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(xml),
    })
    vi.stubGlobal('fetch', fetchSpy)

    const storage = createStorage()
    const result = await storage.list()

    expect(result.items[0].key).toBe('no-date.txt')
    expect(result.items[0].lastModified).toBeUndefined()

    vi.unstubAllGlobals()
  })
})
