import {
  getResizedUrl,
  getThumbnailKey,
  getThumbnailSizes,
  generateThumbnail,
} from '$lib/server/thumbnail'
import { describe, expect, it, vi } from 'vitest'

describe('thumbnail utilities', () => {
  describe('getThumbnailKey', () => {
    it('generates correct thumbnail key for jpg', () => {
      const result = getThumbnailKey('blog/my-photo.jpg', '200x200')
      expect(result).toBe('thumbs/blog/my-photo_200x200.jpg')
    })

    it('generates correct thumbnail key for png', () => {
      const result = getThumbnailKey('uploads/image.png', '100x100')
      expect(result).toBe('thumbs/uploads/image_100x100.png')
    })

    it('handles keys with multiple dots', () => {
      const result = getThumbnailKey('blog/my.photo.v2.webp', '400x400')
      expect(result).toBe('thumbs/blog/my.photo.v2_400x400.webp')
    })

    it('defaults to jpg extension when no dot present', () => {
      const result = getThumbnailKey('blog/photo', '200x200')
      expect(result).toBe('thumbs/blog/photo_200x200.jpg')
    })

    it('handles nested paths', () => {
      const result = getThumbnailKey('a/b/c/image.jpeg', '200x200')
      expect(result).toBe('thumbs/a/b/c/image_200x200.jpeg')
    })
  })

  describe('getResizedUrl', () => {
    it('generates Cloudflare Image Resizing URL', () => {
      const result = getResizedUrl('/cdn/blog/uploads/photo.jpg', 200, 200)
      expect(result).toBe(
        '/cdn-cgi/image/width=200,height=200,fit=cover/cdn/blog/uploads/photo.jpg'
      )
    })

    it('preserves the original URL path', () => {
      const result = getResizedUrl('/images/test.png', 400, 300)
      expect(result).toContain('width=400')
      expect(result).toContain('height=300')
      expect(result).toContain('/images/test.png')
    })
  })

  describe('getThumbnailSizes', () => {
    it('returns three sizes with correct defaults', () => {
      const sizes = getThumbnailSizes()
      expect(sizes).toHaveProperty('small')
      expect(sizes).toHaveProperty('medium')
      expect(sizes).toHaveProperty('large')
    })

    it('small size is 100x100', () => {
      const sizes = getThumbnailSizes()
      expect(sizes.small).toEqual({ height: 100, quality: 75, width: 100 })
    })

    it('medium size is 200x200', () => {
      const sizes = getThumbnailSizes()
      expect(sizes.medium).toEqual({ height: 200, quality: 80, width: 200 })
    })

    it('large size is 400x400', () => {
      const sizes = getThumbnailSizes()
      expect(sizes.large).toEqual({ height: 400, quality: 85, width: 400 })
    })
  })

  describe('generateThumbnail', () => {
    function createMockStorage(data: { contentType: string; body: Uint8Array }): {
      storage: ReturnType<typeof createMockStorage>['storage']
      putMock: ReturnType<typeof vi.fn>
    } {
      const putMock = vi.fn().mockResolvedValue(undefined)
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(data.body)
          controller.close()
        },
      })

      const storage = {
        delete: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockResolvedValue({
          body: stream,
          contentType: data.contentType,
          size: data.body.length,
        }),
        head: vi.fn().mockResolvedValue({ contentType: data.contentType, size: data.body.length }),
        list: vi.fn().mockResolvedValue([]),
        put: putMock,
      }

      return { putMock, storage }
    }

    it('returns null when file does not exist', async () => {
      const storage = {
        delete: vi.fn(),
        get: vi.fn().mockResolvedValue(null),
        head: vi.fn(),
        list: vi.fn(),
        put: vi.fn(),
      }

      const result = await generateThumbnail(storage, 'nonexistent.jpg')
      expect(result).toBeNull()
    })

    it('returns null for non-image content types', async () => {
      const { storage } = createMockStorage({
        body: new Uint8Array([1, 2, 3]),
        contentType: 'application/pdf',
      })

      const result = await generateThumbnail(storage, 'document.pdf')
      expect(result).toBeNull()
    })

    it('generates thumbnail for image/jpeg', async () => {
      const { storage, putMock } = createMockStorage({
        body: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
        contentType: 'image/jpeg',
      })

      const result = await generateThumbnail(storage, 'blog/photo.jpg')

      expect(result).not.toBeNull()
      expect(result?.key).toBe('thumbs/blog/photo_200x200.jpg')
      expect(result?.url).toBe('/cdn/blog/thumbs/blog/photo_200x200.jpg')
      expect(putMock).toHaveBeenCalledOnce()
      expect(putMock).toHaveBeenCalledWith(
        'thumbs/blog/photo_200x200.jpg',
        expect.any(Uint8Array),
        expect.objectContaining({ contentType: 'image/jpeg' })
      )
    })

    it('respects custom options', async () => {
      const { storage, putMock } = createMockStorage({
        body: new Uint8Array([1, 2, 3, 4, 5]),
        contentType: 'image/png',
      })

      const result = await generateThumbnail(storage, 'uploads/img.png', {
        height: 300,
        width: 400,
      })

      expect(result?.key).toBe('thumbs/uploads/img_400x300.png')
      expect(putMock).toHaveBeenCalledOnce()
    })

    it('stores with long cache control', async () => {
      const { storage, putMock } = createMockStorage({
        body: new Uint8Array([1, 2, 3]),
        contentType: 'image/webp',
      })

      await generateThumbnail(storage, 'photo.webp')

      const putCall = putMock.mock.calls[0]
      expect(putCall[2].cacheControl).toBe('public, max-age=31536000')
    })

    it('reads entire body stream before storing', async () => {
      const chunks = [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6]), new Uint8Array([7, 8])]
      const stream = new ReadableStream({
        start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(chunk)
          }
          controller.close()
        },
      })

      const putMock = vi.fn().mockResolvedValue(undefined)
      const storage = {
        delete: vi.fn(),
        get: vi.fn().mockResolvedValue({
          body: stream,
          contentType: 'image/jpeg',
          size: 8,
        }),
        head: vi.fn(),
        list: vi.fn(),
        put: putMock,
      }

      await generateThumbnail(storage, 'multi-chunk.jpg')

      const storedData = putMock.mock.calls[0][1] as Uint8Array
      expect(storedData.length).toBe(8)
      expect(Array.from(storedData)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    })
  })
})
