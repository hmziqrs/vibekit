import { uuid } from '$lib/server/uuid'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export function validateImageUpload(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF.`
  }
  if (file.size > MAX_SIZE) {
    return `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 5MB.`
  }
  return null
}

export function generateStorageKey(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg'
  return `${uuid()}.${ext}`
}
