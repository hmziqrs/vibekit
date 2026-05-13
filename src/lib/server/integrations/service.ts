import { integration } from '$lib/server/db/schema'
import type { AppDb } from '$lib/server/services/types'
import { uuid } from '$lib/server/uuid'
import { and, desc, eq, or } from 'drizzle-orm'

import { getProvider } from './providers'
import type { IntegrationStatus } from './providers'

export async function listIntegrations(db: AppDb, userId: string, organizationId?: string) {
  const conditions = organizationId
    ? and(
        or(eq(integration.userId, userId), eq(integration.organizationId, organizationId)),
        eq(integration.status, 'active')
      )
    : and(eq(integration.userId, userId), eq(integration.status, 'active'))

  return db.select().from(integration).where(conditions).orderBy(desc(integration.createdAt))
}

export async function createIntegration(
  db: AppDb,
  input: {
    accessToken: string
    expiresAt?: Date
    externalAccountId?: string
    metadata?: Record<string, unknown>
    organizationId?: string
    provider: string
    refreshToken?: string
    scopes: string[]
    userId: string
  }
) {
  const id = uuid()

  await db.insert(integration).values({
    accessToken: input.accessToken,
    createdAt: new Date(),
    externalAccountId: input.externalAccountId ?? null,
    id,
    lastError: null,
    lastSyncedAt: null,
    metadata: input.metadata ?? null,
    organizationId: input.organizationId ?? null,
    provider: input.provider,
    refreshToken: input.refreshToken ?? null,
    scopes: input.scopes,
    status: 'active',
    tokenExpiresAt: input.expiresAt ?? null,
    updatedAt: new Date(),
    userId: input.userId,
  })

  return { id, provider: input.provider }
}

export async function updateIntegrationTokens(
  db: AppDb,
  integrationId: string,
  input: {
    accessToken: string
    expiresAt?: Date
    refreshToken?: string
  }
) {
  await db
    .update(integration)
    .set({
      accessToken: input.accessToken,
      lastSyncedAt: new Date(),
      refreshToken: input.refreshToken ?? undefined,
      status: 'active',
      tokenExpiresAt: input.expiresAt ?? null,
      updatedAt: new Date(),
    })
    .where(eq(integration.id, integrationId))
}

export async function disconnectIntegration(db: AppDb, integrationId: string, userId: string) {
  const rows = await db
    .select()
    .from(integration)
    .where(and(eq(integration.id, integrationId), eq(integration.userId, userId)))

  const existing = rows[0] as { id: string } | undefined
  if (!existing) return null

  await db
    .update(integration)
    .set({
      accessToken: '',
      lastSyncedAt: new Date(),
      refreshToken: null,
      status: 'disconnected',
      updatedAt: new Date(),
    })
    .where(eq(integration.id, integrationId))

  return { id: integrationId }
}

export async function getIntegration(db: AppDb, integrationId: string, userId: string) {
  const rows = await db
    .select()
    .from(integration)
    .where(and(eq(integration.id, integrationId), eq(integration.userId, userId)))

  return (rows[0] as Record<string, unknown> | undefined) ?? null
}

export async function checkIntegrationHealth(db: AppDb, integrationId: string) {
  const rows = await db.select().from(integration).where(eq(integration.id, integrationId))

  const record = rows[0] as
    | {
        accessToken: string
        id: string
        provider: string
        status: string
        tokenExpiresAt: Date | null
      }
    | undefined

  if (!record) return null

  let newStatus: IntegrationStatus = 'active'

  if (record.tokenExpiresAt && new Date(record.tokenExpiresAt) < new Date()) {
    newStatus = 'expired'
  }

  const provider = getProvider(record.provider)
  if (provider && record.accessToken) {
    try {
      const healthResult = await pingProvider(record.provider, record.accessToken)
      if (!healthResult) {
        newStatus = 'error'
      }
    } catch {
      newStatus = 'error'
    }
  }

  await db
    .update(integration)
    .set({
      lastSyncedAt: new Date(),
      status: newStatus,
      updatedAt: new Date(),
    })
    .where(eq(integration.id, integrationId))

  return { id: integrationId, provider: record.provider, status: newStatus }
}

async function pingProvider(provider: string, _accessToken: string): Promise<boolean> {
  switch (provider) {
    case 'github':
    case 'slack':
    case 'discord':
    case 'notion':
    case 'linear': {
      return true
    }
    default: {
      return false
    }
  }
}

export async function listAllIntegrations(
  db: AppDb,
  options?: { limit?: number; provider?: string; status?: string }
) {
  const limit = options?.limit ?? 50

  const conditions = []
  if (options?.provider) {
    conditions.push(eq(integration.provider, options.provider))
  }
  if (options?.status) {
    conditions.push(eq(integration.status, options.status))
  }

  if (conditions.length > 0) {
    return db
      .select()
      .from(integration)
      .where(and(...conditions))
      .orderBy(desc(integration.createdAt))
      .limit(limit)
  }

  return db.select().from(integration).orderBy(desc(integration.createdAt)).limit(limit)
}
