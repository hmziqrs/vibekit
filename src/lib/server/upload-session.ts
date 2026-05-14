import { uploadSession } from '$lib/server/db/schema'
import type { DrizzleDb } from '$lib/server/services/types'
import { uuid } from '$lib/server/uuid'
import { and, desc, eq, lt } from 'drizzle-orm'

const SESSION_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB
const MIN_CHUNK_SIZE = 1024 * 1024 // 1MB
const MAX_CHUNK_SIZE = 50 * 1024 * 1024 // 50MB

export async function createUploadSession(
  db: DrizzleDb,
  input: {
    chunkSize: number
    fileName: string
    fileSize: number
    fileType: string
    userId: string
  }
) {
  if (input.fileSize > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
  if (input.chunkSize < MIN_CHUNK_SIZE || input.chunkSize > MAX_CHUNK_SIZE) {
    throw new Error(
      `Chunk size must be between ${MIN_CHUNK_SIZE / 1024 / 1024}MB and ${MAX_CHUNK_SIZE / 1024 / 1024}MB`
    )
  }

  const totalChunks = Math.ceil(input.fileSize / input.chunkSize)
  const id = uuid()
  const now = new Date()

  await db.insert(uploadSession).values({
    chunkSize: input.chunkSize,
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
    fileName: input.fileName,
    fileSize: input.fileSize,
    fileType: input.fileType,
    id,
    status: 'pending',
    totalChunks,
    userId: input.userId,
  })

  return {
    chunkSize: input.chunkSize,
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
    id,
    totalChunks,
  }
}

export async function getUploadSession(db: DrizzleDb, sessionId: string) {
  const rows = await db.select().from(uploadSession).where(eq(uploadSession.id, sessionId))
  return (rows[0] as Record<string, unknown> | undefined) ?? null
}

export async function recordChunk(db: DrizzleDb, sessionId: string, chunkIndex: number) {
  const session = await getUploadSession(db, sessionId)
  if (!session) throw new Error('Upload session not found')
  if (session.status === 'expired') throw new Error('Upload session has expired')
  if (session.status === 'complete') throw new Error('Upload session already completed')

  const receivedChunks = (session.receivedChunks as number[]) ?? []
  if (receivedChunks.includes(chunkIndex)) {
    return { complete: false, receivedChunks, totalChunks: session.totalChunks as number }
  }

  const updatedChunks = [...receivedChunks, chunkIndex].toSorted((a, b) => a - b)
  const totalChunks = session.totalChunks as number
  const isComplete = updatedChunks.length === totalChunks

  await db
    .update(uploadSession)
    .set({
      receivedChunks: updatedChunks,
      status: isComplete ? 'complete' : 'uploading',
      updatedAt: new Date(),
    })
    .where(eq(uploadSession.id, sessionId))

  return { complete: isComplete, receivedChunks: updatedChunks, totalChunks }
}

export async function completeUploadSession(db: DrizzleDb, sessionId: string, storageKey: string) {
  await db
    .update(uploadSession)
    .set({ status: 'complete', storageKey, updatedAt: new Date() })
    .where(eq(uploadSession.id, sessionId))
}

export async function failUploadSession(db: DrizzleDb, sessionId: string) {
  await db
    .update(uploadSession)
    .set({ status: 'failed', updatedAt: new Date() })
    .where(eq(uploadSession.id, sessionId))
}

export async function listUploadSessions(
  db: DrizzleDb,
  userId: string,
  options?: { status?: string }
) {
  const conditions = [eq(uploadSession.userId, userId)]
  if (options?.status) {
    conditions.push(
      eq(
        uploadSession.status,
        options.status as 'complete' | 'expired' | 'failed' | 'pending' | 'uploading'
      )
    )
  }
  return db
    .select()
    .from(uploadSession)
    .where(and(...conditions))
    .orderBy(desc(uploadSession.createdAt))
}

export async function cleanupExpiredSessions(db: DrizzleDb) {
  const now = new Date()
  await db
    .update(uploadSession)
    .set({ status: 'expired', updatedAt: new Date() })
    .where(lt(uploadSession.expiresAt, now))
}

export async function deleteUploadSession(db: DrizzleDb, sessionId: string) {
  await db.delete(uploadSession).where(eq(uploadSession.id, sessionId))
}

export function getUploadProgress(session: Record<string, unknown>) {
  const received = (session.receivedChunks as number[]) ?? []
  const total = session.totalChunks as number
  return {
    percent: total > 0 ? Math.round((received.length / total) * 100) : 0,
    receivedChunks: received.length,
    totalChunks: total,
  }
}
