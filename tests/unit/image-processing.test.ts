import { describe, expect, it } from 'vitest'

describe('image-processing', () => {
  describe('buildImageUrl', () => {
    it('returns original URL when no options provided', async () => {
      const { buildImageUrl } = await import('$lib/server/image-processing')
      expect(buildImageUrl('/images/photo.jpg', {})).toBe('/images/photo.jpg')
    })

    it('builds Cloudflare image resizing URL with width', async () => {
      const { buildImageUrl } = await import('$lib/server/image-processing')
      const result = buildImageUrl('/images/photo.jpg', { width: 800 })
      expect(result).toBe('/cdn-cgi/image/width=800/images/photo.jpg')
    })

    it('builds URL with multiple options', async () => {
      const { buildImageUrl } = await import('$lib/server/image-processing')
      const result = buildImageUrl('/images/photo.jpg', {
        width: 800,
        height: 600,
        fit: 'cover',
        format: 'webp',
        quality: 80,
      })
      expect(result).toContain('width=800')
      expect(result).toContain('height=600')
      expect(result).toContain('fit=cover')
      expect(result).toContain('format=webp')
      expect(result).toContain('quality=80')
      expect(result).toContain('/images/photo.jpg')
    })

    it('strips leading slash from original URL', async () => {
      const { buildImageUrl } = await import('$lib/server/image-processing')
      const result = buildImageUrl('/images/photo.jpg', { width: 320 })
      expect(result).toBe('/cdn-cgi/image/width=320/images/photo.jpg')
    })
  })

  describe('buildSrcset', () => {
    it('builds srcset with default sizes', async () => {
      const { buildSrcset } = await import('$lib/server/image-processing')
      const result = buildSrcset('/images/photo.jpg')
      expect(result).toContain('320w')
      expect(result).toContain('640w')
      expect(result).toContain('960w')
      expect(result).toContain('1280w')
      expect(result).toContain('1920w')
      expect(result.split(', ')).toHaveLength(5)
    })

    it('builds srcset with custom sizes', async () => {
      const { buildSrcset } = await import('$lib/server/image-processing')
      const result = buildSrcset('/images/photo.jpg', [
        { descriptor: '100w', width: 100 },
        { descriptor: '200w', width: 200 },
      ])
      expect(result.split(', ')).toHaveLength(2)
      expect(result).toContain('100w')
      expect(result).toContain('200w')
    })

    it('applies format option to all srcset entries', async () => {
      const { buildSrcset } = await import('$lib/server/image-processing')
      const result = buildSrcset('/images/photo.jpg', [{ descriptor: '100w', width: 100 }], {
        format: 'webp',
      })
      expect(result).toContain('format=webp')
    })
  })

  describe('buildSizesAttribute', () => {
    it('builds sizes attribute with default sizes', async () => {
      const { buildSizesAttribute } = await import('$lib/server/image-processing')
      const result = buildSizesAttribute()
      expect(result).toContain('(max-width: 320px) 320px')
      expect(result).toContain('(max-width: 1920px) 1920px')
    })

    it('builds sizes attribute with custom sizes', async () => {
      const { buildSizesAttribute } = await import('$lib/server/image-processing')
      const result = buildSizesAttribute([{ descriptor: '500w', width: 500 }])
      expect(result).toBe('(max-width: 500px) 500px')
    })
  })

  describe('getResponsiveImageHtml', () => {
    it('generates complete img tag with srcset and sizes', async () => {
      const { getResponsiveImageHtml } = await import('$lib/server/image-processing')
      const html = getResponsiveImageHtml('/images/photo.jpg', 'A photo')
      expect(html).toContain('src=')
      expect(html).toContain('srcset=')
      expect(html).toContain('sizes=')
      expect(html).toContain('alt="A photo"')
    })

    it('includes loading attribute when specified', async () => {
      const { getResponsiveImageHtml } = await import('$lib/server/image-processing')
      const html = getResponsiveImageHtml('/images/photo.jpg', 'A photo', {
        loading: 'lazy',
      })
      expect(html).toContain('loading="lazy"')
    })

    it('includes class attribute when specified', async () => {
      const { getResponsiveImageHtml } = await import('$lib/server/image-processing')
      const html = getResponsiveImageHtml('/images/photo.jpg', 'A photo', {
        class: 'rounded-lg',
      })
      expect(html).toContain('class="rounded-lg"')
    })

    it('uses custom format for fallback and srcset', async () => {
      const { getResponsiveImageHtml } = await import('$lib/server/image-processing')
      const html = getResponsiveImageHtml('/images/photo.jpg', 'A photo', {
        format: 'avif',
      })
      expect(html).toContain('format=avif')
    })
  })

  describe('extractImageMetadata', () => {
    it('extracts metadata for jpg file', async () => {
      const { extractImageMetadata } = await import('$lib/server/image-processing')
      const meta = extractImageMetadata('photo.jpg', 1024 * 512)
      expect(meta).toEqual({
        extension: 'jpg',
        filename: 'photo.jpg',
        mimeType: 'image/jpeg',
        size: 524288,
        sizeFormatted: '512.0KB',
      })
    })

    it('extracts metadata for png file', async () => {
      const { extractImageMetadata } = await import('$lib/server/image-processing')
      const meta = extractImageMetadata('image.png', 1024 * 1024 * 3)
      expect(meta.mimeType).toBe('image/png')
      expect(meta.extension).toBe('png')
      expect(meta.sizeFormatted).toBe('3.0MB')
    })

    it('extracts metadata for webp file', async () => {
      const { extractImageMetadata } = await import('$lib/server/image-processing')
      const meta = extractImageMetadata('photo.webp', 500)
      expect(meta.mimeType).toBe('image/webp')
      expect(meta.sizeFormatted).toBe('500B')
    })

    it('extracts metadata for gif file', async () => {
      const { extractImageMetadata } = await import('$lib/server/image-processing')
      const meta = extractImageMetadata('anim.gif', 2048)
      expect(meta.mimeType).toBe('image/gif')
    })

    it('extracts metadata for avif file', async () => {
      const { extractImageMetadata } = await import('$lib/server/image-processing')
      const meta = extractImageMetadata('image.avif', 100)
      expect(meta.mimeType).toBe('image/avif')
    })

    it('returns octet-stream for unknown extensions', async () => {
      const { extractImageMetadata } = await import('$lib/server/image-processing')
      const meta = extractImageMetadata('file.xyz', 100)
      expect(meta.mimeType).toBe('application/octet-stream')
      expect(meta.extension).toBe('xyz')
    })

    it('handles file with no extension', async () => {
      const { extractImageMetadata } = await import('$lib/server/image-processing')
      const meta = extractImageMetadata('noext', 100)
      expect(meta.extension).toBe('noext')
      expect(meta.mimeType).toBe('application/octet-stream')
    })

    it('formats small sizes in bytes', async () => {
      const { extractImageMetadata } = await import('$lib/server/image-processing')
      const meta = extractImageMetadata('tiny.png', 512)
      expect(meta.sizeFormatted).toBe('512B')
    })

    it('formats KB sizes correctly', async () => {
      const { extractImageMetadata } = await import('$lib/server/image-processing')
      const meta = extractImageMetadata('mid.jpg', 1500)
      expect(meta.sizeFormatted).toBe('1.5KB')
    })
  })
})
