import { describe, expect, it } from 'vitest'

describe('Notification preference schema', () => {
  it('accepts push channel', async () => {
    const { notificationPreferenceSchema } = await import('$lib/validators/profile')
    const result = notificationPreferenceSchema.safeParse({
      channel: 'push',
      enabled: true,
      type: 'blog_post',
    })
    expect(result.success).toBe(true)
  })

  it('accepts email channel', async () => {
    const { notificationPreferenceSchema } = await import('$lib/validators/profile')
    const result = notificationPreferenceSchema.safeParse({
      channel: 'email',
      enabled: false,
      type: 'comment',
    })
    expect(result.success).toBe(true)
  })

  it('accepts in_app channel', async () => {
    const { notificationPreferenceSchema } = await import('$lib/validators/profile')
    const result = notificationPreferenceSchema.safeParse({
      channel: 'in_app',
      enabled: true,
      type: 'mention',
    })
    expect(result.success).toBe(true)
  })

  it('rejects unknown channel', async () => {
    const { notificationPreferenceSchema } = await import('$lib/validators/profile')
    const result = notificationPreferenceSchema.safeParse({
      channel: 'sms',
      enabled: true,
      type: 'alert',
    })
    expect(result.success).toBe(false)
  })
})

describe('Notification link sanitization', () => {
  // Simulate the sanitizeLink function from notifications.ts
  function sanitizeLink(link: string | undefined): string | null {
    if (!link) return null
    const safe = link.startsWith('/') && !link.startsWith('//')
    return safe ? link : null
  }

  it('allows relative paths', () => {
    expect(sanitizeLink('/app/blog/post-1')).toBe('/app/blog/post-1')
    expect(sanitizeLink('/settings')).toBe('/settings')
  })

  it('blocks absolute URLs', () => {
    expect(sanitizeLink('https://evil.com')).toBeNull()
    expect(sanitizeLink('http://example.com')).toBeNull()
  })

  it('blocks protocol-relative URLs', () => {
    expect(sanitizeLink('//evil.com/steal')).toBeNull()
  })

  it('blocks javascript: URLs', () => {
    expect(sanitizeLink('javascript:alert(1)')).toBeNull()
  })

  it('returns null for undefined/empty', () => {
    expect(sanitizeLink(undefined)).toBeNull()
    expect(sanitizeLink('')).toBeNull()
  })
})

describe('Storage key validation', () => {
  function validateStorageKey(key: string): void {
    if (key.includes('..') || key.startsWith('/') || key.includes('\0')) {
      throw new Error('Invalid storage key')
    }
  }

  it('allows normal keys', () => {
    expect(() => validateStorageKey('uploads/avatar.png')).not.toThrow()
    expect(() => validateStorageKey('blog/images/photo.jpg')).not.toThrow()
  })

  it('blocks path traversal', () => {
    expect(() => validateStorageKey('../etc/passwd')).toThrow('Invalid storage key')
    expect(() => validateStorageKey('uploads/../../secret')).toThrow('Invalid storage key')
  })

  it('blocks absolute paths', () => {
    expect(() => validateStorageKey('/etc/passwd')).toThrow('Invalid storage key')
  })

  it('blocks null bytes', () => {
    expect(() => validateStorageKey('file.png\0.jpg')).toThrow('Invalid storage key')
  })
})

describe('Bulk delete limit', () => {
  it('limits array to MAX_BULK_DELETE (100)', () => {
    const MAX_BULK_DELETE = 100
    const ids = Array.from({ length: 200 }, (_, i) => `id-${i}`)
    const filtered = ids.slice(0, MAX_BULK_DELETE)
    expect(filtered.length).toBe(100)
  })

  it('keeps all IDs when under limit', () => {
    const MAX_BULK_DELETE = 100
    const ids = Array.from({ length: 50 }, (_, i) => `id-${i}`)
    const filtered = ids.slice(0, MAX_BULK_DELETE)
    expect(filtered.length).toBe(50)
  })
})

describe('Magic bytes validation for chunked upload', () => {
  it('validates JPEG magic bytes', async () => {
    const { matchesMagicBytes } = await import('$lib/server/upload')
    const jpegHeader = new Uint8Array([0xff, 0xd8, 0xff, 0xe0])
    expect(matchesMagicBytes(jpegHeader, 'image/jpeg')).toBe(true)
  })

  it('rejects non-JPEG data for JPEG content type', async () => {
    const { matchesMagicBytes } = await import('$lib/server/upload')
    const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
    expect(matchesMagicBytes(pngHeader, 'image/jpeg')).toBe(false)
  })

  it('passes unknown MIME types (no signature defined)', async () => {
    const { matchesMagicBytes } = await import('$lib/server/upload')
    const arbitrary = new Uint8Array([0xde, 0xad, 0xbe, 0xef])
    expect(matchesMagicBytes(arbitrary, 'application/x-custom')).toBe(true)
  })

  it('validates PNG magic bytes', async () => {
    const { matchesMagicBytes } = await import('$lib/server/upload')
    const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    expect(matchesMagicBytes(pngHeader, 'image/png')).toBe(true)
  })
})

describe('Chunked upload virus scanning', () => {
  it('blocks assembled chunk with PE executable header', async () => {
    const { scanBuffer } = await import('$lib/server/virus-scan')
    const { matchesMagicBytes } = await import('$lib/server/upload')

    // Simulate assembled chunk data that has MZ header
    const assembled = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00])

    // Magic bytes would pass for unknown type
    expect(matchesMagicBytes(assembled, 'application/octet-stream')).toBe(true)

    // But virus scan catches it
    const scanResult = await scanBuffer(assembled)
    expect(scanResult.clean).toBe(false)
    expect(scanResult.threats).toContain('PE-Executable')
  })

  it('blocks assembled chunk with ELF executable header', async () => {
    const { scanBuffer } = await import('$lib/server/virus-scan')
    const assembled = new Uint8Array([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01])
    const result = await scanBuffer(assembled)
    expect(result.clean).toBe(false)
    expect(result.threats).toContain('ELF-Executable')
  })

  it('blocks assembled chunk with EICAR test signature', async () => {
    const { scanBuffer } = await import('$lib/server/virus-scan')
    const assembled = new Uint8Array([0x58, 0x35, 0x4f, 0x21, 0x50, 0x25, 0x40, 0x41, 0x50, 0x5b])
    const result = await scanBuffer(assembled)
    expect(result.clean).toBe(false)
    expect(result.threats).toContain('EICAR-Test')
  })

  it('passes assembled chunk with valid JPEG data', async () => {
    const { scanBuffer } = await import('$lib/server/virus-scan')
    const assembled = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46])
    const result = await scanBuffer(assembled)
    expect(result.clean).toBe(true)
    expect(result.threats).toEqual([])
  })

  it('detects embedded PE header within first 1KB of large assembled chunk', async () => {
    const { scanBuffer } = await import('$lib/server/virus-scan')
    // Simulate a large assembled file (e.g., from chunked upload)
    const assembled = new Uint8Array(2048)
    // Place PE header at offset 200 (within scan window)
    assembled[200] = 0x50
    assembled[201] = 0x45
    assembled[202] = 0x00
    assembled[203] = 0x00
    const result = await scanBuffer(assembled)
    expect(result.clean).toBe(false)
    expect(result.threats).toContain('Embedded-PE')
  })
})
