import { getEmbedUrl, detectEmbedProvider } from '$lib/editor/utils/detect-embed-provider'
import { describe, expect, it } from 'vitest'

describe(detectEmbedProvider, () => {
  it('detects YouTube URLs', () => {
    const result = detectEmbedProvider('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(result?.name).toBe('youtube')
  })

  it('detects YouTube short URLs', () => {
    const result = detectEmbedProvider('https://youtu.be/dQw4w9WgXcQ')
    expect(result?.name).toBe('youtube')
  })

  it('detects Vimeo URLs', () => {
    const result = detectEmbedProvider('https://vimeo.com/123456789')
    expect(result?.name).toBe('vimeo')
  })

  it('detects Twitter/X URLs', () => {
    expect(detectEmbedProvider('https://twitter.com/user/status/123456')?.name).toBe('twitter')
  })

  it('detects X.com URLs', () => {
    expect(detectEmbedProvider('https://x.com/user/status/123456')?.name).toBe('twitter')
  })

  it('returns null for unknown URLs', () => {
    expect(detectEmbedProvider('https://example.com/page')).toBeNull()
  })

  it('returns null for empty input', () => {
    expect(detectEmbedProvider('')).toBeNull()
  })

  it('detects Facebook URLs', () => {
    expect(detectEmbedProvider('https://www.facebook.com/posts/123456')?.name).toBe('facebook')
  })

  it('detects Instagram post URLs', () => {
    expect(detectEmbedProvider('https://www.instagram.com/p/ABC123/')?.name).toBe('instagram')
  })

  it('detects Instagram reel URLs', () => {
    expect(detectEmbedProvider('https://www.instagram.com/reel/ABC123/')?.name).toBe('instagram')
  })

  it('detects TikTok URLs', () => {
    expect(detectEmbedProvider('https://www.tiktok.com/@user/video/7123456789')?.name).toBe(
      'tiktok'
    )
  })

  it('detects Reddit URLs', () => {
    expect(detectEmbedProvider('https://www.reddit.com/r/news/comments/abc123/title/')?.name).toBe(
      'reddit'
    )
  })
})

describe(getEmbedUrl, () => {
  it('converts YouTube watch URL to embed URL', () => {
    const result = getEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(result).toContain('youtube.com/embed/dQw4w9WgXcQ')
  })

  it('converts YouTube short URL to embed URL', () => {
    const result = getEmbedUrl('https://youtu.be/dQw4w9WgXcQ')
    expect(result).toContain('youtube.com/embed/dQw4w9WgXcQ')
  })

  it('converts Vimeo URL to embed URL', () => {
    const result = getEmbedUrl('https://vimeo.com/123456789')
    expect(result).toContain('player.vimeo.com/video/123456789')
  })

  it('returns original URL for unknown providers', () => {
    const url = 'https://example.com/page'
    expect(getEmbedUrl(url)).toBe(url)
  })
})
