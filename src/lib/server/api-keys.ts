import { apiKey, apiKeyUsageLog } from '$lib/server/db/schema'
import { uuid } from '$lib/server/uuid'
import { and, desc, eq, isNull, sql } from 'drizzle-orm'

const KEY_PREFIX = 'vk_live_'

function generateKey(): { fullKey: string; keyPrefix: string } {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  const random = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  const fullKey = `${KEY_PREFIX}${random}`
  return { fullKey, keyPrefix: fullKey.slice(0, 12) }
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function createApiKey(
  db: {
    delete: (typeof import('$lib/server/db/schema'))['apiKey'] extends undefined
      ? never
      : (table: typeof apiKey) => { where: (cond: unknown) => Promise<void> }
    insert: (table: typeof apiKey) => { values: (vals: unknown) => Promise<void> }
    select: () => {
      from: (table: typeof apiKey) => {
        where: (cond: unknown) => Promise<{ keyHash: string }[]>
      }
    }
  },
  userId: string,
  input: { expiresAt?: number; name: string; rateLimit?: number; scopes: string[] }
) {
  const { fullKey, keyPrefix } = generateKey()
  const keyHash = await hashKey(fullKey)
  const id = uuid()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbAny = db as any

  await dbAny.insert(apiKey).values({
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    id,
    keyHash,
    keyPrefix,
    name: input.name,
    rateLimit: input.rateLimit ?? null,
    requestCount: 0,
    revokedAt: null,
    scopes: input.scopes,
    userId,
  })

  return { id, key: fullKey, keyPrefix, name: input.name, scopes: input.scopes }
}

export async function validateApiKey(
  db: {
    select: () => {
      from: (table: typeof apiKey) => {
        where: (cond: unknown) => Promise<unknown[]>
      }
    }
  },
  bearerToken: string
): Promise<{
  id: string
  keyPrefix: string
  name: string
  rateLimit: number | null
  requestCount: number
  scopes: string[]
  userId: string
} | null> {
  const keyHash = await hashKey(bearerToken)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbAny = db as any

  const rows = await dbAny
    .select()
    .from(apiKey)
    .where(and(eq(apiKey.keyHash, keyHash), isNull(apiKey.revokedAt)))

  const key = rows[0] as
    | {
        expiresAt: Date | null
        id: string
        keyPrefix: string
        name: string
        rateLimit: number | null
        requestCount: number
        scopes: string[]
        userId: string
      }
    | undefined

  if (!key) return null

  if (key.expiresAt && new Date(key.expiresAt) < new Date()) return null

  return {
    id: key.id,
    keyPrefix: key.keyPrefix,
    name: key.name,
    rateLimit: key.rateLimit,
    requestCount: key.requestCount,
    scopes: key.scopes,
    userId: key.userId,
  }
}

export async function touchApiKey(
  db: {
    update: (table: typeof apiKey) => {
      set: (vals: unknown) => { where: (cond: unknown) => Promise<void> }
    }
  },
  keyId: string
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbAny = db as any

  await dbAny
    .update(apiKey)
    .set({
      lastUsedAt: new Date(),
      requestCount: sql`${apiKey.requestCount} + 1`,
    })
    .where(eq(apiKey.id, keyId))
}

export async function logApiKeyUsage(
  db: {
    insert: (table: typeof apiKeyUsageLog) => { values: (vals: unknown) => Promise<void> }
  },
  input: {
    apiKeyId: string
    endpoint: string
    ipAddress?: string
    method: string
    statusCode: number
    userAgent?: string
  }
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbAny = db as any

  await dbAny.insert(apiKeyUsageLog).values({
    apiKeyId: input.apiKeyId,
    createdAt: new Date(),
    endpoint: input.endpoint,
    id: uuid(),
    ipAddress: input.ipAddress ?? null,
    method: input.method,
    statusCode: input.statusCode,
    userAgent: input.userAgent ?? null,
  })
}

export async function listApiKeys(
  db: {
    select: () => {
      from: (table: typeof apiKey) => {
        where: (cond: unknown) => Promise<unknown[]>
        orderBy: (col: unknown) => Promise<unknown[]>
      }
    }
  },
  userId: string
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbAny = db as any

  return dbAny
    .select({
      createdAt: apiKey.createdAt,
      expiresAt: apiKey.expiresAt,
      id: apiKey.id,
      keyPrefix: apiKey.keyPrefix,
      lastUsedAt: apiKey.lastUsedAt,
      name: apiKey.name,
      rateLimit: apiKey.rateLimit,
      requestCount: apiKey.requestCount,
      revokedAt: apiKey.revokedAt,
      scopes: apiKey.scopes,
    })
    .from(apiKey)
    .where(eq(apiKey.userId, userId))
    .orderBy(desc(apiKey.createdAt))
}

export async function rotateApiKey(
  db: {
    select: () => {
      from: (table: typeof apiKey) => {
        where: (cond: unknown) => Promise<unknown[]>
      }
    }
    update: (table: typeof apiKey) => {
      set: (vals: unknown) => { where: (cond: unknown) => Promise<void> }
    }
  },
  keyId: string,
  userId: string
): Promise<{ id: string; key: string; keyPrefix: string } | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbAny = db as any

  const rows = await dbAny
    .select()
    .from(apiKey)
    .where(and(eq(apiKey.id, keyId), eq(apiKey.userId, userId), isNull(apiKey.revokedAt)))

  const existing = rows[0] as { id: string } | undefined
  if (!existing) return null

  const { fullKey, keyPrefix } = generateKey()
  const keyHash = await hashKey(fullKey)

  await dbAny
    .update(apiKey)
    .set({ keyHash, keyPrefix, requestCount: 0 })
    .where(eq(apiKey.id, keyId))

  return { id: keyId, key: fullKey, keyPrefix }
}

export async function revokeApiKey(
  db: {
    update: (table: typeof apiKey) => {
      set: (vals: unknown) => { where: (cond: unknown) => Promise<void> }
    }
  },
  keyId: string,
  userId: string
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbAny = db as any

  await dbAny
    .update(apiKey)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKey.id, keyId), eq(apiKey.userId, userId), isNull(apiKey.revokedAt)))

  return true
}

export async function deleteApiKey(
  db: {
    delete: (table: typeof apiKey) => { where: (cond: unknown) => Promise<void> }
  },
  keyId: string,
  userId: string
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbAny = db as any

  await dbAny.delete(apiKey).where(and(eq(apiKey.id, keyId), eq(apiKey.userId, userId)))
}

export async function updateApiKey(
  db: {
    update: (table: typeof apiKey) => {
      set: (vals: unknown) => { where: (cond: unknown) => Promise<void> }
    }
  },
  keyId: string,
  userId: string,
  input: { name?: string; rateLimit?: number | null; scopes?: string[] }
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbAny = db as any

  const updates: Record<string, unknown> = {}
  if (input.name !== undefined) updates.name = input.name
  if (input.rateLimit !== undefined) updates.rateLimit = input.rateLimit
  if (input.scopes !== undefined) updates.scopes = input.scopes

  if (Object.keys(updates).length === 0) return

  await dbAny
    .update(apiKey)
    .set(updates)
    .where(and(eq(apiKey.id, keyId), eq(apiKey.userId, userId), isNull(apiKey.revokedAt)))
}

export async function getApiKeyUsage(
  db: {
    select: () => {
      from: (table: typeof apiKeyUsageLog) => {
        where: (cond: unknown) => Promise<unknown[]>
        orderBy: (col: unknown) => { limit: (n: number) => Promise<unknown[]> }
      }
    }
  },
  keyId: string,
  limit = 50
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbAny = db as any

  return dbAny
    .select()
    .from(apiKeyUsageLog)
    .where(eq(apiKeyUsageLog.apiKeyId, keyId))
    .orderBy(desc(apiKeyUsageLog.createdAt))
    .limit(limit)
}

export function hasScope(keyScopes: string[], requiredScope: string): boolean {
  if (keyScopes.includes('admin')) return true
  if (keyScopes.includes(requiredScope)) return true

  const [action, resource] = requiredScope.split(':')
  if (action === 'read') return keyScopes.includes(`write:${resource}`)
  return false
}

export { hashKey }
