import { apiKey, apiKeyUsageLog } from '$lib/server/db/schema'
import type { DrizzleDb } from '$lib/server/services/types'
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
  db: DrizzleDb,
  userId: string,
  input: { expiresAt?: number; name: string; rateLimit?: number; scopes: string[] }
) {
  const { fullKey, keyPrefix } = generateKey()
  const keyHash = await hashKey(fullKey)
  const id = uuid()

  await db.insert(apiKey).values({
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
  db: DrizzleDb,
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

  const rows = await db
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

export async function touchApiKey(db: DrizzleDb, keyId: string) {
  await db
    .update(apiKey)
    .set({
      lastUsedAt: new Date(),
      requestCount: sql`${apiKey.requestCount} + 1`,
    })
    .where(eq(apiKey.id, keyId))
}

export async function logApiKeyUsage(
  db: DrizzleDb,
  input: {
    apiKeyId: string
    endpoint: string
    ipAddress?: string
    method: string
    statusCode: number
    userAgent?: string
  }
) {
  await db.insert(apiKeyUsageLog).values({
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

export async function listApiKeys(db: DrizzleDb, userId: string) {
  return db
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
  db: DrizzleDb,
  keyId: string,
  userId: string
): Promise<{ id: string; key: string; keyPrefix: string } | null> {
  const rows = await db
    .select()
    .from(apiKey)
    .where(and(eq(apiKey.id, keyId), eq(apiKey.userId, userId), isNull(apiKey.revokedAt)))

  const existing = rows[0] as { id: string } | undefined
  if (!existing) return null

  const { fullKey, keyPrefix } = generateKey()
  const keyHash = await hashKey(fullKey)

  await db.update(apiKey).set({ keyHash, keyPrefix, requestCount: 0 }).where(eq(apiKey.id, keyId))

  return { id: keyId, key: fullKey, keyPrefix }
}

export async function revokeApiKey(db: DrizzleDb, keyId: string, userId: string): Promise<boolean> {
  const result = await db
    .update(apiKey)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKey.id, keyId), eq(apiKey.userId, userId), isNull(apiKey.revokedAt)))

  return (result.rowsAffected ?? 0) > 0
}

export async function deleteApiKey(db: DrizzleDb, keyId: string, userId: string) {
  await db.delete(apiKey).where(and(eq(apiKey.id, keyId), eq(apiKey.userId, userId)))
}

// oxlint-disable-next-line max-params
export async function updateApiKey(
  db: DrizzleDb,
  keyId: string,
  userId: string,
  input: { name?: string; rateLimit?: number | null; scopes?: string[] }
) {
  const updates: Record<string, unknown> = {}
  if (input.name !== undefined) updates.name = input.name
  if (input.rateLimit !== undefined) updates.rateLimit = input.rateLimit
  if (input.scopes !== undefined) updates.scopes = input.scopes

  if (Object.keys(updates).length === 0) return

  await db
    .update(apiKey)
    .set(updates)
    .where(and(eq(apiKey.id, keyId), eq(apiKey.userId, userId), isNull(apiKey.revokedAt)))
}

export async function getApiKeyUsage(db: DrizzleDb, keyId: string, limit = 50) {
  return db
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
