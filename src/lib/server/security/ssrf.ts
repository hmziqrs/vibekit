const BLOCKED_HOSTS = new Set([
  '0.0.0.0',
  '127.0.0.1',
  '::1',
  '169.254.169.254',
  'localhost',
  'metadata.google.internal',
])

const PRIVATE_IP_V4 = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.)/
const BLOCKED_TLDS = /\.(internal|local)$/

export function isSafeUrl(url: string, options?: { allowHttp?: boolean }): boolean {
  try {
    const parsed = new URL(url)
    if (!options?.allowHttp && parsed.protocol !== 'https:') {
      return false
    }
    if (options?.allowHttp && parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false
    }

    const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '')

    if (BLOCKED_HOSTS.has(hostname)) {
      return false
    }
    if (PRIVATE_IP_V4.test(hostname)) {
      return false
    }
    if (BLOCKED_TLDS.test(hostname)) {
      return false
    }
    if (hostname.startsWith('fc') || hostname.startsWith('fd')) {
      return false
    }
    if (hostname.startsWith('fe80')) {
      return false
    }
    if (hostname.includes('ffff:')) {
      return false
    }

    return true
  } catch {
    return false
  }
}
