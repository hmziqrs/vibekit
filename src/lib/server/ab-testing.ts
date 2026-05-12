import { abAssignment, abEvent, abExperiment, abVariant } from '$lib/server/db/schema'
import { uuid } from '$lib/server/uuid'
import { and, desc, eq, sql } from 'drizzle-orm'

export interface ExperimentResult {
  conversions: number
  conversionRate: number
  exposureCount: number
  isControl: boolean
  isWinner: boolean
  name: string
  pValue: number | null
  variantId: string
  zScore: number | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbClient = any

export async function listExperiments(db: DbClient, options?: { status?: string }) {
  const conditions = []
  if (options?.status) {
    conditions.push(
      eq(
        abExperiment.status,
        options.status as 'draft' | 'running' | 'paused' | 'completed' | 'archived'
      )
    )
  }
  if (conditions.length > 0) {
    return db
      .select()
      .from(abExperiment)
      .where(and(...conditions))
      .orderBy(desc(abExperiment.createdAt))
  }
  return db.select().from(abExperiment).orderBy(desc(abExperiment.createdAt))
}

export async function getExperiment(db: DbClient, key: string) {
  const rows = await db.select().from(abExperiment).where(eq(abExperiment.key, key))
  return (rows[0] as Record<string, unknown> | undefined) ?? null
}

export async function createExperiment(
  db: DbClient,
  input: {
    description?: string
    key: string
    name: string
    targetMetric: string
    variants: {
      description?: string
      isControl?: boolean
      name: string
      payload?: Record<string, unknown>
      trafficPercentage: number
    }[]
  }
) {
  const id = uuid()

  await db.insert(abExperiment).values({
    description: input.description ?? null,
    id,
    key: input.key,
    name: input.name,
    targetMetric: input.targetMetric,
  })

  for (const variant of input.variants) {
    await db.insert(abVariant).values({
      description: variant.description ?? null,
      experimentId: id,
      id: uuid(),
      isControl: variant.isControl ?? false,
      name: variant.name,
      payload: variant.payload ?? {},
      trafficPercentage: variant.trafficPercentage,
    })
  }

  return { id, key: input.key }
}

export async function updateExperiment(
  db: DbClient,
  key: string,
  input: {
    description?: string
    endDate?: Date
    name?: string
    startDate?: Date
    status?: string
    winningVariantId?: string | null
  }
) {
  const existing = await getExperiment(db, key)
  if (!existing) return null

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (input.name !== undefined) updates.name = input.name
  if (input.description !== undefined) updates.description = input.description
  if (input.status !== undefined) updates.status = input.status
  if (input.startDate !== undefined) updates.startDate = input.startDate
  if (input.endDate !== undefined) updates.endDate = input.endDate
  if (input.winningVariantId !== undefined) updates.winningVariantId = input.winningVariantId

  await db.update(abExperiment).set(updates).where(eq(abExperiment.key, key))
  return { key }
}

export async function deleteExperiment(db: DbClient, key: string) {
  await db.delete(abExperiment).where(eq(abExperiment.key, key))
}

export async function getExperimentVariants(db: DbClient, experimentId: string) {
  return db.select().from(abVariant).where(eq(abVariant.experimentId, experimentId))
}

export async function assignVariant(
  db: DbClient,
  experimentKey: string,
  input: { sessionId?: string; userId?: string }
) {
  const experiment = await getExperiment(db, experimentKey)
  if (!experiment || experiment.status !== 'running') return null

  const experimentId = experiment.id as string

  // Check existing assignment
  const existingConditions = [eq(abAssignment.experimentId, experimentId)]
  if (input.userId) {
    existingConditions.push(eq(abAssignment.userId, input.userId))
  } else if (input.sessionId) {
    existingConditions.push(eq(abAssignment.sessionId, input.sessionId))
  }

  const existing = await db
    .select()
    .from(abAssignment)
    .where(and(...existingConditions))

  if (existing.length > 0) {
    const assignment = existing[0] as Record<string, unknown>
    const variants = await getExperimentVariants(db, experimentId)
    const variant = variants.find((v: Record<string, unknown>) => v.id === assignment.variantId)
    return {
      assignment,
      experiment,
      variant: variant ?? null,
    }
  }

  // Get variants and assign based on traffic percentage
  const variants = await getExperimentVariants(db, experimentId)
  if (variants.length === 0) return null

  const hash = simpleHash((input.userId ?? input.sessionId ?? 'random') + experimentKey)
  const bucket = hash % 100

  let cumulative = 0
  let selectedVariant: Record<string, unknown> | null = null
  for (const variant of variants) {
    cumulative += variant.trafficPercentage as number
    if (bucket < cumulative) {
      selectedVariant = variant
      break
    }
  }
  if (!selectedVariant) {
    selectedVariant = variants[variants.length - 1]
  }
  if (!selectedVariant) return null

  const assignmentId = uuid()
  await db.insert(abAssignment).values({
    assignedAt: new Date(),
    experimentId,
    id: assignmentId,
    sessionId: input.sessionId ?? null,
    userId: input.userId ?? null,
    variantId: selectedVariant.id,
  })

  return {
    assignment: { id: assignmentId, variantId: selectedVariant.id },
    experiment,
    variant: selectedVariant,
  }
}

export async function recordEvent(
  db: DbClient,
  input: {
    eventName: string
    eventType: string
    eventValue?: number
    experimentId: string
    metadata?: Record<string, unknown>
    sessionId?: string
    userId?: string
    variantId: string
  }
) {
  await db.insert(abEvent).values({
    createdAt: new Date(),
    eventName: input.eventName,
    eventType: input.eventType,
    eventValue: input.eventValue ?? null,
    experimentId: input.experimentId,
    id: uuid(),
    metadata: input.metadata ?? {},
    sessionId: input.sessionId ?? null,
    userId: input.userId ?? null,
    variantId: input.variantId,
  })
}

export async function getExperimentResults(
  db: DbClient,
  experimentKey: string
): Promise<ExperimentResult[]> {
  const experiment = await getExperiment(db, experimentKey)
  if (!experiment) return []

  const experimentId = experiment.id as string
  const variants = await getExperimentVariants(db, experimentId)

  const results: ExperimentResult[] = []
  for (const variant of variants) {
    const variantId = variant.id as string

    const exposureRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(abEvent)
      .where(
        and(
          eq(abEvent.experimentId, experimentId),
          eq(abEvent.variantId, variantId),
          eq(abEvent.eventType, 'exposure')
        )
      )
    const exposureCount = exposureRows[0]?.count ?? 0

    const conversionRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(abEvent)
      .where(
        and(
          eq(abEvent.experimentId, experimentId),
          eq(abEvent.variantId, variantId),
          eq(abEvent.eventType, 'conversion')
        )
      )
    const conversions = conversionRows[0]?.count ?? 0

    const conversionRate = exposureCount > 0 ? conversions / exposureCount : 0

    results.push({
      conversionRate,
      conversions,
      exposureCount,
      isControl: variant.isControl as boolean,
      isWinner: experiment.winningVariantId === variantId,
      name: variant.name as string,
      pValue: null,
      variantId,
      zScore: null,
    })
  }

  // Calculate statistical significance using z-test
  if (results.length >= 2) {
    const control = results.find((r) => r.isControl)
    if (control && control.exposureCount > 0) {
      for (const result of results) {
        if (result.isControl) continue
        if (result.exposureCount === 0) continue

        const { pValue, zScore } = calculateZTest(
          control.conversionRate,
          control.exposureCount,
          result.conversionRate,
          result.exposureCount
        )
        result.zScore = zScore
        result.pValue = pValue
      }
    }
  }

  return results
}

export function calculateZTest(
  p1: number,
  n1: number,
  p2: number,
  n2: number
): { pValue: number; zScore: number } {
  if (n1 === 0 || n2 === 0) return { pValue: 1, zScore: 0 }

  const pooled = (p1 * n1 + p2 * n2) / (n1 + n2)
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2))
  if (se === 0) return { pValue: 1, zScore: 0 }

  const zScore = (p2 - p1) / se
  const pValue = twoTailedNormalP(Math.abs(zScore))
  return { pValue, zScore }
}

function twoTailedNormalP(z: number): number {
  // Approximation using the error function
  return 2 * (1 - normalCDF(z))
}

function normalCDF(z: number): number {
  // Abramowitz and Stegun approximation
  const a1 = 0.254_829_592
  const a2 = -0.284_496_736
  const a3 = 1.421_413_741
  const a4 = -1.453_152_027
  const a5 = 1.061_405_429
  const p = 0.327_591_1

  const sign = z < 0 ? -1 : 1
  const x = Math.abs(z) / Math.sqrt(2)

  const t = 1 / (1 + p * x)
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)

  return 0.5 * (1 + sign * y)
}

function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0
  }
  return Math.abs(hash)
}
