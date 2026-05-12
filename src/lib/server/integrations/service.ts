import { integration } from '$lib/server/db/schema'
import { uuid } from '$lib/server/uuid'
import { and, desc, eq, or } from 'drizzle-orm'

import { getProvider } from './providers'
import type { IntegrationStatus } from './providers'

export async function listIntegrations(
  db: {
    select: () => {
      from: (t: typeof integration) => {
        where: (c: unknown) => Promise<unknown[]>
        orderBy: (c: unknown) => Promise<unknown[]>
      }
    }
  },
  userId: string,
  organizationId?: string
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbAny = db as any

  const conditions = organizationId
    ? and(
        or(eq(integration.userId, userId), eq(integration.organizationId, organizationId)),
        eq(integration.status, 'active')
      )
    : and(eq(integration.userId, userId), eq(integration.status, 'active'))

  return dbAny.select().from(integration).where(conditions).orderBy(desc(integration.createdAt))
}

export async function createIntegration(
  db: { insert: (t: typeof integration) => { values: (v: unknown) => Promise<void> } },
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbAny = db as any
  const id = uuid()

  await dbAny.insert(integration).values({
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
  db: {
    update: (t: typeof integration) => {
      set: (v: unknown) => { where: (c: unknown) => Promise<void> }
    }
  },
  integrationId: string,
  input: {
    accessToken: string
    expiresAt?: Date
    refreshToken?: string
  }
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbAny = db as any

  await dbAny
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

export async function disconnectIntegration(
  db: {
    select: () => { from: (t: typeof integration) => { where: (c: unknown) => Promise<unknown[]> } }
    update: (t: typeof integration) => {
      set: (v: unknown) => { where: (c: unknown) => Promise<void> }
    }
  },
  integrationId: string,
  userId: string
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbAny = db as any

  const rows = await dbAny
    .select()
    .from(integration)
    .where(and(eq(integration.id, integrationId), eq(integration.userId, userId)))

  const existing = rows[0] as { id: string } | undefined
  if (!existing) return null

  await dbAny
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

export async function getIntegration(
  db: {
    select: () => { from: (t: typeof integration) => { where: (c: unknown) => Promise<unknown[]> } }
  },
  integrationId: string,
  userId: string
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbAny = db as any

  const rows = await dbAny
    .select()
    .from(integration)
    .where(and(eq(integration.id, integrationId), eq(integration.userId, userId)))

  return (rows[0] as Record<string, unknown> | undefined) ?? null
}

export async function checkIntegrationHealth(
  db: {
    select: () => { from: (t: typeof integration) => { where: (c: unknown) => Promise<unknown[]> } }
    update: (t: typeof integration) => {
      set: (v: unknown) => { where: (c: unknown) => Promise<void> }
    }
  },
  integrationId: string
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbAny = db as any

  const rows = await dbAny.select().from(integration).where(eq(integration.id, integrationId))

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

  // Check if token is expired
  if (record.tokenExpiresAt && new Date(record.tokenExpiresAt) < new Date()) {
    newStatus = 'expired'
  }

  // Try a lightweight health check against the provider
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

  await dbAny
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
  // Lightweight health check per provider
  switch (provider) {
    case 'github':
    case 'slack':
    case 'discord':
    case 'notion':
    case 'linear':
      // These require actual API calls in production
      // For now, return true if we have a token
      return true
    default:
      return false
  }
}

export async function listAllIntegrations(
  db: {
    select: () => {
      from: (t: typeof integration) => {
        where: (c: unknown) => {
          orderBy: (c: unknown) => { limit: (n: number) => Promise<unknown[]> }
        }
        orderBy: (c: unknown) => { limit: (n: number) => Promise<unknown[]> }
      }
    }
  },
  options?: { limit?: number; provider?: string; status?: string }
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbAny = db as any
  const limit = options?.limit ?? 50

  const conditions = []
  if (options?.provider) {
    conditions.push(eq(integration.provider, options.provider))
  }
  if (options?.status) {
    conditions.push(eq(integration.status, options.status))
  }

  if (conditions.length > 0) {
    return dbAny
      .select()
      .from(integration)
      .where(and(...conditions))
      .orderBy(desc(integration.createdAt))
      .limit(limit)
  }

  return dbAny.select().from(integration).orderBy(desc(integration.createdAt)).limit(limit)
}
