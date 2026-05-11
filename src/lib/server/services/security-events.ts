import { securityEvent } from '$lib/server/db/schema'
import { eq, desc } from 'drizzle-orm'

import type { AppDb } from './types'

export type SecurityEventType =
  | 'account_locked'
  | 'account_unlocked'
  | 'login'
  | 'login_failed'
  | 'logout'
  | 'new_device'
  | 'passkey_added'
  | 'passkey_removed'
  | 'password_change'
  | 'social_account_linked'
  | 'social_account_unlinked'
  | 'suspicious_login'
  | 'two_factor_disabled'
  | 'two_factor_enabled'

export interface SecurityEventInput {
  eventType: SecurityEventType
  ipAddress?: string
  metadata?: Record<string, unknown>
  userAgent?: string
  userId?: string
}

export async function writeSecurityEvent(db: AppDb, input: SecurityEventInput): Promise<void> {
  await db.insert(securityEvent).values({
    eventType: input.eventType,
    ipAddress: input.ipAddress ?? null,
    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    userAgent: input.userAgent ?? null,
    userId: input.userId ?? null,
  })
}

export async function getSecurityEvents(
  db: AppDb,
  userId: string,
  limit = 20
): Promise<
  {
    createdAt: Date | null
    eventType: string
    id: string
    ipAddress: string | null
    metadata: string | null
    userAgent: string | null
    userId: string | null
  }[]
> {
  return db
    .select()
    .from(securityEvent)
    .where(eq(securityEvent.userId, userId))
    .orderBy(desc(securityEvent.createdAt))
    .limit(limit)
}

export function isNewDevice(knownIPs: string[], currentIP: string): boolean {
  if (!currentIP) return false
  return !knownIPs.includes(currentIP)
}
