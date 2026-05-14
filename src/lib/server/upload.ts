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

// oxlint-disable-next-line sort-keys
const FILE_SIGNATURES: Record<string, number[][]> = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],
  'video/mp4': [
    [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70],
    [0x00, 0x00, 0x00, 0x1c, 0x66, 0x74, 0x79, 0x70],
    [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70],
  ],
  'audio/mpeg': [
    [0xff, 0xe0],
    [0xff, 0xf0],
    [0x49, 0x44, 0x33],
  ],
}

function matchesMagicBytes(buffer: Uint8Array, mimeType: string): boolean {
  const signatures = FILE_SIGNATURES[mimeType]
  if (!signatures) return true

  return signatures.some((sig) => {
    if (buffer.length < sig.length) return false
    return sig.every((byte, i) => buffer[i] === byte)
  })
}

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

export async function validateFileSignature(file: File): Promise<string | null> {
  const signatures = FILE_SIGNATURES[file.type]
  if (!signatures) return null

  const buffer = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  if (!matchesMagicBytes(buffer, file.type)) {
    return `File content does not match declared type: ${file.type}.`
  }
  return null
}

export function generateStorageKey(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg'
  return `${uuid()}.${ext}`
}
