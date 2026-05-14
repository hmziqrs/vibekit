import { configVersion, systemConfig } from '$lib/server/db/schema'
import type { DrizzleDb } from '$lib/server/services/types'
import { uuid } from '$lib/server/uuid'
import { and, desc, eq } from 'drizzle-orm'

export async function getConfigValue(db: DrizzleDb, key: string, environment?: string) {
  // First try environment-specific value
  if (environment) {
    const envRows = await db
      .select()
      .from(systemConfig)
      .where(and(eq(systemConfig.key, `${key}:${environment}`)))
    if (envRows.length > 0) return envRows[0] as Record<string, unknown>
  }

  // Fall back to base config
  const rows = await db.select().from(systemConfig).where(eq(systemConfig.key, key))
  return (rows[0] as Record<string, unknown> | undefined) ?? null
}

export async function setConfigValue(
  db: DrizzleDb,
  input: {
    changedBy?: string
    description?: string
    environment?: string
    key: string
    type?: string
    value: string
  }
) {
  const effectiveKey = input.environment ? `${input.key}:${input.environment}` : input.key

  // Get old value for versioning
  const existing = await db.select().from(systemConfig).where(eq(systemConfig.key, effectiveKey))
  const oldValue =
    existing.length > 0 ? ((existing[0] as Record<string, unknown>).value as string) : null

  // oxlint-disable-next-line unicorn/prefer-ternary
  if (existing.length > 0) {
    await db
      .update(systemConfig)
      .set({ updatedBy: input.changedBy ?? null, value: input.value })
      .where(eq(systemConfig.key, effectiveKey))
  } else {
    await db.insert(systemConfig).values({
      description: input.description ?? null,
      environment: input.environment ?? null,
      id: uuid(),
      key: effectiveKey,
      type: (input.type ?? 'string') as 'boolean' | 'json' | 'string',
      updatedBy: input.changedBy ?? null,
      value: input.value,
    })
  }

  // Record version
  await db.insert(configVersion).values({
    changedBy: input.changedBy ?? null,
    configKey: input.key,
    createdAt: new Date(),
    environment: input.environment ?? null,
    id: uuid(),
    newValue: input.value,
    oldValue,
  })

  return { key: effectiveKey, value: input.value }
}

export async function getConfigHistory(
  db: DrizzleDb,
  key?: string,
  options?: { limit?: number; offset?: number }
) {
  const limit = options?.limit ?? 50
  const offset = options?.offset ?? 0

  const conditions = []
  if (key) {
    conditions.push(eq(configVersion.configKey, key))
  }

  if (conditions.length > 0) {
    return db
      .select()
      .from(configVersion)
      .where(and(...conditions))
      .orderBy(desc(configVersion.createdAt))
      .limit(limit)
      .offset(offset)
  }

  return db
    .select()
    .from(configVersion)
    .orderBy(desc(configVersion.createdAt))
    .limit(limit)
    .offset(offset)
}

export async function resolveConfig(db: DrizzleDb, keys: string[], environment?: string) {
  const result: Record<string, string> = {}

  for (const key of keys) {
    // oxlint-disable-next-line no-await-in-loop
    const config = await getConfigValue(db, key, environment)
    if (config) {
      result[key] = config.value as string
    }
  }

  return result
}
