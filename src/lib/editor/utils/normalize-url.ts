export function normalizeUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ''

  // Add https:// if no protocol
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`
  }

  return trimmed
}

export function isValidUrl(url: string): boolean {
  const trimmed = url.trim()
  if (!trimmed) return false

  try {
    // Reject non-http protocols before normalizing
    if (/^\w+:\/\//i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
      return false
    }
    const parsed = new URL(normalizeUrl(trimmed))
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch (e) {
    console.error('Failed to validate URL', e)
    return false
  }
}
