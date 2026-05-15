import type { StorageClient } from './services/types'

export interface ThumbnailOptions {
  height?: number
  quality?: number // 1-100 for JPEG quality
  width?: number
}

const DEFAULT_THUMBNAIL: ThumbnailOptions = {
  height: 200,
  quality: 80,
  width: 200,
}

const THUMBNAIL_PREFIX = 'thumbs/'

export function getThumbnailKey(originalKey: string, size: string): string {
  const ext = originalKey.split('.').pop() ?? 'jpg'
  const baseName = originalKey.replace(/\.[^.]+$/, '')
  return `${THUMBNAIL_PREFIX}${baseName}_${size}.${ext}`
}

export async function generateThumbnail(
  storage: StorageClient,
  originalKey: string,
  options?: ThumbnailOptions
): Promise<{ key: string; url: string } | null> {
  const opts = { ...DEFAULT_THUMBNAIL, ...options }

  const stored = await storage.get(originalKey)
  if (!stored) return null

  // Check if the content type is an image
  const contentType = stored.contentType
  if (!contentType.startsWith('image/')) return null

  // For Cloudflare Workers: use image resizing via fetch
  // For local dev: store original as thumbnail (no resize available)
  const thumbnailKey = getThumbnailKey(originalKey, `${opts.width}x${opts.height}`)

  // Read the image data
  const reader = stored.body.getReader()
  const chunks: Uint8Array[] = []
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }

  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0)
  const imageData = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    imageData.set(chunk, offset)
    offset += chunk.length
  }

  // Store as thumbnail (actual resizing requires sharp or Cloudflare Image Resizing)
  // In production, use Cloudflare Image Resizing: /cdn/cdn-cgi/image/width=200,height=200/{originalKey}
  await storage.put(thumbnailKey, imageData, {
    cacheControl: 'public, max-age=31536000',
    contentType,
  })

  return { key: thumbnailKey, url: `/cdn/blog/${thumbnailKey}` }
}

export function getResizedUrl(originalUrl: string, width: number, height: number): string {
  // Cloudflare Image Resizing URL format
  return `/cdn-cgi/image/width=${width},height=${height},fit=cover${originalUrl}`
}

export function getThumbnailSizes(): Record<string, ThumbnailOptions> {
  return {
    large: { height: 400, quality: 85, width: 400 },
    medium: { height: 200, quality: 80, width: 200 },
    small: { height: 100, quality: 75, width: 100 },
  }
}
