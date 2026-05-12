import {
  buildImageUrl,
  buildSizesAttribute,
  buildSrcset,
  extractImageMetadata,
  getResponsiveImageHtml,
} from '$lib/server/image-processing'
import { imageResizeSchema } from '$lib/validators/image'
import { describe, expect, it } from 'vitest'

describe('Image Processing', () => {
  describe('buildImageUrl', () => {
    it('returns original URL when no options', () => {
      const url = buildImageUrl('/cdn/blog/test.jpg', {})
      expect(url).toBe('/cdn/blog/test.jpg')
    })

    it('builds resize URL with width', () => {
      const url = buildImageUrl('/cdn/blog/test.jpg', { width: 640 })
      expect(url).toContain('width=640')
      expect(url).toContain('/cdn-cgi/image/')
    })

    it('builds resize URL with format conversion', () => {
      const url = buildImageUrl('/cdn/blog/test.jpg', { format: 'webp', width: 320 })
      expect(url).toContain('format=webp')
      expect(url).toContain('width=320')
    })

    it('builds URL with all options', () => {
      const url = buildImageUrl('/cdn/blog/test.jpg', {
        fit: 'cover',
        format: 'avif',
        height: 480,
        quality: 80,
        width: 640,
      })
      expect(url).toContain('width=640')
      expect(url).toContain('height=480')
      expect(url).toContain('fit=cover')
      expect(url).toContain('format=avif')
      expect(url).toContain('quality=80')
    })
  })

  describe('buildSrcset', () => {
    it('generates srcset with default sizes', () => {
      const srcset = buildSrcset('/cdn/blog/test.jpg')
      expect(srcset).toContain('320w')
      expect(srcset).toContain('640w')
      expect(srcset).toContain('1280w')
      expect(srcset).toContain('1920w')
    })

    it('generates srcset with custom sizes', () => {
      const srcset = buildSrcset('/cdn/blog/test.jpg', [
        { descriptor: '1x', width: 320 },
        { descriptor: '2x', width: 640 },
      ])
      expect(srcset).toContain('1x')
      expect(srcset).toContain('2x')
    })

    it('includes format in srcset URLs', () => {
      const srcset = buildSrcset('/cdn/blog/test.jpg', undefined, { format: 'webp' })
      expect(srcset).toContain('format=webp')
    })
  })

  describe('buildSizesAttribute', () => {
    it('generates sizes attribute with default sizes', () => {
      const sizes = buildSizesAttribute()
      expect(sizes).toContain('(max-width: 320px)')
      expect(sizes).toContain('(max-width: 1920px)')
    })

    it('uses custom sizes', () => {
      const sizes = buildSizesAttribute([{ descriptor: '1x', width: 400 }])
      expect(sizes).toContain('(max-width: 400px) 400px')
    })
  })

  describe('extractImageMetadata', () => {
    it('extracts metadata from JPEG', () => {
      const meta = extractImageMetadata('photo.jpg', 1024 * 500)
      expect(meta.extension).toBe('jpg')
      expect(meta.mimeType).toBe('image/jpeg')
      expect(meta.sizeFormatted).toBe('500.0KB')
    })

    it('extracts metadata from PNG', () => {
      const meta = extractImageMetadata('image.png', 2048)
      expect(meta.mimeType).toBe('image/png')
      expect(meta.sizeFormatted).toBe('2.0KB')
    })

    it('extracts metadata from WebP', () => {
      const meta = extractImageMetadata('pic.webp', 5 * 1024 * 1024)
      expect(meta.mimeType).toBe('image/webp')
      expect(meta.sizeFormatted).toBe('5.0MB')
    })

    it('handles unknown extensions', () => {
      const meta = extractImageMetadata('file.xyz', 100)
      expect(meta.mimeType).toBe('application/octet-stream')
    })

    it('formats bytes correctly', () => {
      expect(extractImageMetadata('a.jpg', 500).sizeFormatted).toBe('500B')
      expect(extractImageMetadata('a.jpg', 1024).sizeFormatted).toBe('1.0KB')
      expect(extractImageMetadata('a.jpg', 1024 * 1024).sizeFormatted).toBe('1.0MB')
    })
  })

  describe('getResponsiveImageHtml', () => {
    it('generates img tag with srcset', () => {
      const html = getResponsiveImageHtml('/cdn/blog/test.jpg', 'Test image')
      expect(html).toContain('srcset=')
      expect(html).toContain('sizes=')
      expect(html).toContain('alt="Test image"')
    })

    it('includes loading attribute', () => {
      const html = getResponsiveImageHtml('/cdn/blog/test.jpg', 'Test', {
        loading: 'lazy',
      })
      expect(html).toContain('loading="lazy"')
    })

    it('includes class attribute', () => {
      const html = getResponsiveImageHtml('/cdn/blog/test.jpg', 'Test', {
        class: 'w-full',
      })
      expect(html).toContain('class="w-full"')
    })

    it('includes format in URLs', () => {
      const html = getResponsiveImageHtml('/cdn/blog/test.jpg', 'Test', {
        format: 'webp',
      })
      expect(html).toContain('format=webp')
    })
  })
})

describe('Image Resize Validator', () => {
  it('validates width only', () => {
    const result = imageResizeSchema.safeParse({ width: 640 })
    expect(result.success).toBe(true)
  })

  it('validates all options', () => {
    const result = imageResizeSchema.safeParse({
      fit: 'cover',
      format: 'webp',
      height: 480,
      quality: 80,
      width: 640,
    })
    expect(result.success).toBe(true)
  })

  it('rejects width over 4096', () => {
    const result = imageResizeSchema.safeParse({ width: 5000 })
    expect(result.success).toBe(false)
  })

  it('rejects invalid format', () => {
    const result = imageResizeSchema.safeParse({ format: 'png' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid fit', () => {
    const result = imageResizeSchema.safeParse({ fit: 'stretch' })
    expect(result.success).toBe(false)
  })

  it('rejects quality over 100', () => {
    const result = imageResizeSchema.safeParse({ quality: 101 })
    expect(result.success).toBe(false)
  })
})
