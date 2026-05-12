import { featureFlag } from '$lib/server/db/schema'
import type { AppDb } from '$lib/server/services/types'
import { uuid } from '$lib/server/uuid'
import { and, desc, eq, sql } from 'drizzle-orm'

export interface FlagEvaluationContext {
  environment?: string
  userId?: string
}

export async function listFeatureFlags(
  db: AppDb,
  options?: { enabled?: boolean; environment?: string }
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbAny = db as any

  const conditions = []
  if (options?.enabled !== undefined) {
    conditions.push(eq(featureFlag.enabled, options.enabled))
  }
  if (options?.environment) {
    conditions.push(
      sql`(${featureFlag.environment} = ${options.environment} OR ${featureFlag.environment} IS NULL)`
    )
  }

  if (conditions.length > 0) {
    return dbAny
      .select()
      .from(featureFlag)
      .where(and(...conditions))
      .orderBy(desc(featureFlag.createdAt))
  }

  return dbAny.select().from(featureFlag).orderBy(desc(featureFlag.createdAt))
}

export async function getFeatureFlag(db: AppDb, key: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbAny = db as any

  const rows = await dbAny.select().from(featureFlag).where(eq(featureFlag.key, key))
  return (rows[0] as Record<string, unknown> | undefined) ?? null
}

export async function createFeatureFlag(
  db: AppDb,
  input: {
    cohortRules?: Record<string, unknown>
    dependencies?: string[]
    description?: string
    enabled?: boolean
    environment?: string
    key: string
    killSwitch?: boolean
    name: string
    rolloutPercentage?: number
  }
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbAny = db as any
  const id = uuid()

  await dbAny.insert(featureFlag).values({
    cohortRules: input.cohortRules ?? {},
    createdAt: new Date(),
    dependencies: input.dependencies ?? [],
    description: input.description ?? null,
    enabled: input.enabled ?? false,
    environment: input.environment ?? null,
    id,
    key: input.key,
    killSwitch: input.killSwitch ?? false,
    name: input.name,
    rolloutPercentage: input.rolloutPercentage ?? 0,
    updatedAt: new Date(),
  })

  return { id, key: input.key }
}

export async function updateFeatureFlag(
  db: AppDb,
  key: string,
  input: {
    cohortRules?: Record<string, unknown>
    dependencies?: string[]
    description?: string
    enabled?: boolean
    environment?: string
    killSwitch?: boolean
    name?: string
    rolloutPercentage?: number
  }
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbAny = db as any

  const existing = await getFeatureFlag(db, key)
  if (!existing) return null

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (input.name !== undefined) updates.name = input.name
  if (input.description !== undefined) updates.description = input.description
  if (input.enabled !== undefined) updates.enabled = input.enabled
  if (input.killSwitch !== undefined) updates.killSwitch = input.killSwitch
  if (input.rolloutPercentage !== undefined) updates.rolloutPercentage = input.rolloutPercentage
  if (input.cohortRules !== undefined) updates.cohortRules = input.cohortRules
  if (input.dependencies !== undefined) updates.dependencies = input.dependencies
  if (input.environment !== undefined) updates.environment = input.environment

  await dbAny.update(featureFlag).set(updates).where(eq(featureFlag.key, key))
  return { key }
}

export async function deleteFeatureFlag(db: AppDb, key: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbAny = db as any
  await dbAny.delete(featureFlag).where(eq(featureFlag.key, key))
}

export async function toggleFeatureFlag(db: AppDb, key: string, enabled: boolean) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbAny = db as any

  const existing = await getFeatureFlag(db, key)
  if (!existing) return null

  await dbAny
    .update(featureFlag)
    .set({ enabled, killSwitch: false, updatedAt: new Date() })
    .where(eq(featureFlag.key, key))

  return { enabled, key }
}

export async function activateKillSwitch(db: AppDb, key: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbAny = db as any

  const existing = await getFeatureFlag(db, key)
  if (!existing) return null

  await dbAny
    .update(featureFlag)
    .set({ enabled: false, killSwitch: true, updatedAt: new Date() })
    .where(eq(featureFlag.key, key))

  return { key, killSwitch: true }
}

export async function evaluateFeatureFlag(
  db: AppDb,
  key: string,
  context?: FlagEvaluationContext
): Promise<boolean> {
  const flag = await getFeatureFlag(db, key)
  if (!flag) return false

  // Kill switch overrides everything
  if (flag.killSwitch) return false

  // Must be enabled
  if (!flag.enabled) return false

  // Environment check
  if (flag.environment && context?.environment && flag.environment !== context.environment) {
    return false
  }

  // Dependencies check — all dependency flags must also be enabled
  const deps = (flag.dependencies as string[]) ?? []
  if (deps.length > 0) {
    for (const depKey of deps) {
      const depResult = await evaluateFeatureFlag(db, depKey, context)
      if (!depResult) return false
    }
  }

  // Rollout percentage
  const percentage = (flag.rolloutPercentage as number) ?? 0
  if (percentage >= 100) return true
  if (percentage <= 0) return false

  // Hash userId for deterministic rollout
  if (context?.userId) {
    const hash = simpleHash(context.userId + key)
    return hash % 100 < percentage
  }

  // No user context — use percentage as probability
  return Math.random() * 100 < percentage
}

function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0
  }
  return Math.abs(hash)
}

export async function evaluateMultipleFlags(
  db: AppDb,
  keys: string[],
  context?: FlagEvaluationContext
): Promise<Record<string, boolean>> {
  const result: Record<string, boolean> = {}
  for (const key of keys) {
    result[key] = await evaluateFeatureFlag(db, key, context)
  }
  return result
}
