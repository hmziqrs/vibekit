import { createHash } from 'node:crypto'

const HIBP_API = 'https://api.pwnedpasswords.com/range'
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

const cache = new Map<string, { breached: boolean; expiresAt: number }>()

function sha1(input: string): string {
  return createHash('sha1').update(input).digest('hex').toUpperCase()
}

function cleanupCache() {
  const now = Date.now()
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) {
      cache.delete(key)
    }
  }
}

export function clearBreachedCache() {
  cache.clear()
}

export async function isBreachedPassword(password: string): Promise<boolean> {
  const hash = sha1(password)
  const prefix = hash.slice(0, 5)
  const suffix = hash.slice(5)

  cleanupCache()
  const cached = cache.get(hash)
  if (cached) {
    return cached.breached
  }

  try {
    const response = await fetch(`${HIBP_API}/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
    })

    if (!response.ok) {
      return false
    }

    const text = await response.text()
    const breached = text.split('\n').some((line) => {
      const [hashSuffix] = line.trim().split(':')
      return hashSuffix === suffix
    })

    cache.set(hash, { breached, expiresAt: Date.now() + CACHE_TTL_MS })

    return breached
  } catch {
    return false
  }
}
