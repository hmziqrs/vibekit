import { describe, expect, it } from 'vitest'

describe('validateFileSignature', () => {
  it('returns null for file types without defined signatures', async () => {
    const { validateFileSignature } = await import('$lib/server/upload')
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    expect(await validateFileSignature(file)).toBeNull()
  })

  it('rejects JPEG file with wrong magic bytes', async () => {
    const { validateFileSignature } = await import('$lib/server/upload')
    const buffer = new Uint8Array([0x00, 0x00, 0x00])
    const file = new File([buffer], 'fake.jpg', { type: 'image/jpeg' })
    const result = await validateFileSignature(file)
    expect(result).toContain('does not match declared type')
  })

  it('accepts valid JPEG file', async () => {
    const { validateFileSignature } = await import('$lib/server/upload')
    const buffer = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
    const file = new File([buffer], 'photo.jpg', { type: 'image/jpeg' })
    expect(await validateFileSignature(file)).toBeNull()
  })

  it('accepts valid PNG file', async () => {
    const { validateFileSignature } = await import('$lib/server/upload')
    const buffer = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])
    const file = new File([buffer], 'image.png', { type: 'image/png' })
    expect(await validateFileSignature(file)).toBeNull()
  })

  it('accepts valid GIF file', async () => {
    const { validateFileSignature } = await import('$lib/server/upload')
    const buffer = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
    const file = new File([buffer], 'anim.gif', { type: 'image/gif' })
    expect(await validateFileSignature(file)).toBeNull()
  })

  it('accepts valid WebP file', async () => {
    const { validateFileSignature } = await import('$lib/server/upload')
    const buffer = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45])
    const file = new File([buffer], 'photo.webp', { type: 'image/webp' })
    expect(await validateFileSignature(file)).toBeNull()
  })

  it('accepts valid MP3 file with ID3v2 tag', async () => {
    const { validateFileSignature } = await import('$lib/server/upload')
    const buffer = new Uint8Array([0x49, 0x44, 0x33, 0x03, 0x00, 0x00])
    const file = new File([buffer], 'song.mp3', { type: 'audio/mpeg' })
    expect(await validateFileSignature(file)).toBeNull()
  })

  it('rejects MP4 file with wrong magic bytes', async () => {
    const { validateFileSignature } = await import('$lib/server/upload')
    const buffer = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
    const file = new File([buffer], 'fake.mp4', { type: 'video/mp4' })
    const result = await validateFileSignature(file)
    expect(result).toContain('does not match declared type')
  })

  it('handles very small files gracefully', async () => {
    const { validateFileSignature } = await import('$lib/server/upload')
    const buffer = new Uint8Array([0xff])
    const file = new File([buffer], 'tiny.jpg', { type: 'image/jpeg' })
    const result = await validateFileSignature(file)
    expect(result).toContain('does not match declared type')
  })
})
