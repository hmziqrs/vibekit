import { trustedDevice } from '$lib/server/db/schema'
import type { DrizzleDb } from '$lib/server/services/types'
import { uuid } from '$lib/server/uuid'
import { and, eq, lte } from 'drizzle-orm'

const TRUSTED_DEVICE_DAYS = 30

export async function createTrustedDevice(
  db: DrizzleDb,
  input: {
    ipAddress?: string
    userAgent?: string
    userId: string
  }
): Promise<{ token: string }> {
  // Cleanup expired devices first
  await db.delete(trustedDevice).where(lte(trustedDevice.expiresAt, new Date())).run()

  const token = uuid()
  const tokenHash = await sha256(token)

  await db.insert(trustedDevice).values({
    expiresAt: new Date(Date.now() + TRUSTED_DEVICE_DAYS * 24 * 60 * 60 * 1000),
    id: uuid(),
    ipAddress: input.ipAddress ?? null,
    tokenHash,
    userAgent: input.userAgent ?? null,
    userId: input.userId,
  })

  return { token }
}

export async function isTrustedDevice(
  db: DrizzleDb,
  input: {
    token: string
    userId: string
  }
): Promise<boolean> {
  const tokenHash = await sha256(input.token)

  const record = await db
    .select({ expiresAt: trustedDevice.expiresAt })
    .from(trustedDevice)
    .where(and(eq(trustedDevice.userId, input.userId), eq(trustedDevice.tokenHash, tokenHash)))
    .get()

  if (!record) return false
  if (new Date(record.expiresAt) < new Date()) {
    // Expired — clean up
    await db
      .delete(trustedDevice)
      .where(and(eq(trustedDevice.userId, input.userId), eq(trustedDevice.tokenHash, tokenHash)))
    return false
  }

  return true
}

export async function revokeTrustedDevice(
  db: DrizzleDb,
  input: { deviceId: string; userId: string }
): Promise<void> {
  await db
    .delete(trustedDevice)
    .where(and(eq(trustedDevice.id, input.deviceId), eq(trustedDevice.userId, input.userId)))
}

export async function listTrustedDevices(db: DrizzleDb, userId: string) {
  // Cleanup expired first
  await db.delete(trustedDevice).where(lte(trustedDevice.expiresAt, new Date())).run()

  return db
    .select({
      createdAt: trustedDevice.createdAt,
      expiresAt: trustedDevice.expiresAt,
      id: trustedDevice.id,
      ipAddress: trustedDevice.ipAddress,
      userAgent: trustedDevice.userAgent,
    })
    .from(trustedDevice)
    .where(eq(trustedDevice.userId, userId))
}

export async function revokeAllTrustedDevices(db: DrizzleDb, userId: string): Promise<number> {
  const result = await db
    .delete(trustedDevice)
    .where(eq(trustedDevice.userId, userId))
    .returning({ id: trustedDevice.id })
  return result.length
}

const COOKIE_NAME = 'vk_trusted_device'
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 // 30 days

export function getTrustedDeviceCookie(token: string, secure: boolean) {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}${secure ? '; Secure' : ''}`
}

export function clearTrustedDeviceCookie(secure: boolean) {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`
}

export { COOKIE_NAME }

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
