import { uuid } from '$lib/server/uuid'

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

const MEDIA_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'audio/mpeg',
])

const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024 // 50MB
const MAX_AUDIO_SIZE = 20 * 1024 * 1024 // 20MB

export function validateImageUpload(file: File): string | null {
  if (!IMAGE_TYPES.has(file.type)) {
    return `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF.`
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 5MB.`
  }
  return null
}

export function validateMediaUpload(file: File): string | null {
  if (!MEDIA_TYPES.has(file.type)) {
    return `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF, MP4, MP3.`
  }
  const maxSizes: Record<string, number> = {
    'audio/mpeg': MAX_AUDIO_SIZE,
    'video/mp4': MAX_VIDEO_SIZE,
  }
  const maxSize = maxSizes[file.type] ?? MAX_IMAGE_SIZE
  if (file.size > maxSize) {
    return `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: ${maxSize / 1024 / 1024}MB.`
  }
  return null
}

export function generateStorageKey(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg'
  return `${uuid()}.${ext}`
}
