import type { DrizzleDb } from '$lib/server/services/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type MockDb = DrizzleDb & {
  _insertFn: ReturnType<typeof vi.fn>
  _setFn: ReturnType<typeof vi.fn>
}

vi.mock('$lib/server/db/schema', async (importOriginal) => ({
  ...(await importOriginal()),
  uploadSession: {
    chunkSize: 'chunkSize',
    createdAt: 'createdAt',
    expiresAt: 'expiresAt',
    fileName: 'fileName',
    fileSize: 'fileSize',
    fileType: 'fileType',
    id: 'id',
    receivedChunks: 'receivedChunks',
    status: 'status',
    storageKey: 'storageKey',
    totalChunks: 'totalChunks',
    updatedAt: 'updatedAt',
    userId: 'userId',
  },
}))

vi.mock('$lib/server/uuid', () => ({
  uuid: () => 'test-uuid-session',
}))

function makeSession(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    chunkSize: 5 * 1024 * 1024,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    fileName: 'test.mp4',
    fileSize: 50 * 1024 * 1024,
    fileType: 'video/mp4',
    id: 'sess-1',
    receivedChunks: [],
    status: 'pending',
    totalChunks: 10,
    ...overrides,
  }
}

describe('upload-session service', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  function createMockDb(session: Record<string, unknown> | null = null): MockDb {
    const rows = session ? [session] : []
    const setFn = vi.fn<() => { where: ReturnType<typeof vi.fn> }>().mockReturnValue({
      where: vi.fn<() => Promise<unknown>>().mockResolvedValue(undefined),
    })

    return {
      _insertFn: vi.fn<() => { values: ReturnType<typeof vi.fn> }>().mockReturnValue({
        values: vi.fn<() => Promise<unknown>>().mockResolvedValue(undefined),
      }),
      _setFn: setFn,
      delete: vi.fn<() => { where: ReturnType<typeof vi.fn> }>().mockReturnValue({
        where: vi.fn<() => Promise<unknown>>().mockResolvedValue(undefined),
      }),
      insert: vi.fn<() => { values: ReturnType<typeof vi.fn> }>().mockReturnValue({
        values: vi.fn<() => Promise<unknown>>().mockResolvedValue(undefined),
      }),
      select: vi.fn<() => { from: ReturnType<typeof vi.fn> }>().mockReturnValue({
        from: vi
          .fn<() => { orderBy: ReturnType<typeof vi.fn>; where: ReturnType<typeof vi.fn> }>()
          .mockReturnValue({
            orderBy: vi.fn<() => Promise<unknown[]>>().mockResolvedValue(rows),
            where: vi.fn<() => Promise<unknown[]>>().mockResolvedValue(rows),
          }),
      }),
      update: vi.fn<() => { set: ReturnType<typeof vi.fn> }>().mockReturnValue({ set: setFn }),
    } as unknown as MockDb
  }

  describe('createUploadSession', () => {
    it('creates session with valid input', async () => {
      const { createUploadSession } = await import('$lib/server/upload-session')
      const db = createMockDb()
      const result = await createUploadSession(db, {
        chunkSize: 5 * 1024 * 1024,
        fileName: 'video.mp4',
        fileSize: 100 * 1024 * 1024,
        fileType: 'video/mp4',
        userId: 'user-1',
      })
      expect(result.id).toBe('test-uuid-session')
      expect(result.totalChunks).toBe(20)
      expect(result.chunkSize).toBe(5 * 1024 * 1024)
      expect(db.insert).toHaveBeenCalled()
    })

    it('rejects file size exceeding 500MB', async () => {
      const { createUploadSession } = await import('$lib/server/upload-session')
      const db = createMockDb()
      await expect(
        createUploadSession(db, {
          chunkSize: 5 * 1024 * 1024,
          fileName: 'big.zip',
          fileSize: 600 * 1024 * 1024,
          fileType: 'application/zip',
          userId: 'user-1',
        })
      ).rejects.toThrow('File size exceeds maximum')
    })

    it('rejects chunk size below minimum', async () => {
      const { createUploadSession } = await import('$lib/server/upload-session')
      const db = createMockDb()
      await expect(
        createUploadSession(db, {
          chunkSize: 512 * 1024,
          fileName: 'test.mp4',
          fileSize: 50 * 1024 * 1024,
          fileType: 'video/mp4',
          userId: 'user-1',
        })
      ).rejects.toThrow('Chunk size must be between')
    })

    it('rejects chunk size above maximum', async () => {
      const { createUploadSession } = await import('$lib/server/upload-session')
      const db = createMockDb()
      await expect(
        createUploadSession(db, {
          chunkSize: 100 * 1024 * 1024,
          fileName: 'test.mp4',
          fileSize: 50 * 1024 * 1024,
          fileType: 'video/mp4',
          userId: 'user-1',
        })
      ).rejects.toThrow('Chunk size must be between')
    })

    it('calculates correct totalChunks', async () => {
      const { createUploadSession } = await import('$lib/server/upload-session')
      const db = createMockDb()
      const result = await createUploadSession(db, {
        chunkSize: 5 * 1024 * 1024,
        fileName: 'test.mp4',
        fileSize: 15 * 1024 * 1024,
        fileType: 'video/mp4',
        userId: 'user-1',
      })
      expect(result.totalChunks).toBe(3)
    })

    it('rounds up totalChunks for partial last chunk', async () => {
      const { createUploadSession } = await import('$lib/server/upload-session')
      const db = createMockDb()
      const result = await createUploadSession(db, {
        chunkSize: 5 * 1024 * 1024,
        fileName: 'test.mp4',
        fileSize: 13 * 1024 * 1024,
        fileType: 'video/mp4',
        userId: 'user-1',
      })
      expect(result.totalChunks).toBe(3)
    })
  })

  describe('getUploadSession', () => {
    it('returns session when found', async () => {
      const { getUploadSession } = await import('$lib/server/upload-session')
      const session = makeSession()
      const db = createMockDb(session)
      const result = await getUploadSession(db, 'sess-1')
      expect(result).not.toBeNull()
      expect(result?.id).toBe('sess-1')
    })

    it('returns null when not found', async () => {
      const { getUploadSession } = await import('$lib/server/upload-session')
      const db = createMockDb(null)
      await expect(getUploadSession(db, 'missing')).resolves.toBeNull()
    })
  })

  describe('recordChunk', () => {
    it('records a chunk and returns progress', async () => {
      const { recordChunk } = await import('$lib/server/upload-session')
      const session = makeSession({ receivedChunks: [], totalChunks: 3 })
      const db = createMockDb(session)
      const result = await recordChunk(db, 'sess-1', 0)
      expect(result.complete).toBe(false)
      expect(result.receivedChunks).toStrictEqual([0])
      expect(result.totalChunks).toBe(3)
    })

    it('detects completion when all chunks received', async () => {
      const { recordChunk } = await import('$lib/server/upload-session')
      const session = makeSession({ receivedChunks: [0, 1], totalChunks: 3 })
      const db = createMockDb(session)
      const result = await recordChunk(db, 'sess-1', 2)
      expect(result.complete).toBe(true)
      expect(result.receivedChunks).toStrictEqual([0, 1, 2])
    })

    it('handles duplicate chunk submission', async () => {
      const { recordChunk } = await import('$lib/server/upload-session')
      const session = makeSession({ receivedChunks: [0, 1], totalChunks: 3 })
      const db = createMockDb(session)
      const result = await recordChunk(db, 'sess-1', 0)
      expect(result.complete).toBe(false)
      expect(result.receivedChunks).toStrictEqual([0, 1])
    })

    it('throws for missing session', async () => {
      const { recordChunk } = await import('$lib/server/upload-session')
      const db = createMockDb(null)
      await expect(recordChunk(db, 'missing', 0)).rejects.toThrow('Upload session not found')
    })

    it('throws for expired session', async () => {
      const { recordChunk } = await import('$lib/server/upload-session')
      const session = makeSession({ status: 'expired' })
      const db = createMockDb(session)
      await expect(recordChunk(db, 'sess-1', 0)).rejects.toThrow('has expired')
    })

    it('throws for completed session', async () => {
      const { recordChunk } = await import('$lib/server/upload-session')
      const session = makeSession({ status: 'complete' })
      const db = createMockDb(session)
      await expect(recordChunk(db, 'sess-1', 0)).rejects.toThrow('already completed')
    })

    it('sorts chunk indices', async () => {
      const { recordChunk } = await import('$lib/server/upload-session')
      const session = makeSession({ receivedChunks: [2], totalChunks: 3 })
      const db = createMockDb(session)
      const result = await recordChunk(db, 'sess-1', 0)
      expect(result.receivedChunks).toStrictEqual([0, 2])
    })
  })

  describe('completeUploadSession', () => {
    it('updates session with storage key', async () => {
      const { completeUploadSession } = await import('$lib/server/upload-session')
      const db = createMockDb()
      await completeUploadSession(db, 'sess-1', 'uploads/video.mp4')
      expect(db._setFn).toHaveBeenCalled()
    })
  })

  describe('failUploadSession', () => {
    it('marks session as failed', async () => {
      const { failUploadSession } = await import('$lib/server/upload-session')
      const db = createMockDb()
      await failUploadSession(db, 'sess-1')
      expect(db._setFn).toHaveBeenCalled()
    })
  })

  describe('cleanupExpiredSessions', () => {
    it('marks expired sessions', async () => {
      const { cleanupExpiredSessions } = await import('$lib/server/upload-session')
      const db = createMockDb()
      await cleanupExpiredSessions(db)
      expect(db._setFn).toHaveBeenCalled()
    })
  })

  describe('deleteUploadSession', () => {
    it('deletes session', async () => {
      const { deleteUploadSession } = await import('$lib/server/upload-session')
      const db = createMockDb()
      await deleteUploadSession(db, 'sess-1')
      expect(db.delete).toHaveBeenCalled()
    })
  })

  describe('getUploadProgress', () => {
    it('calculates progress correctly', async () => {
      const { getUploadProgress } = await import('$lib/server/upload-session')
      const result = getUploadProgress({ receivedChunks: [0, 1, 2], totalChunks: 5 })
      expect(result.percent).toBe(60)
      expect(result.receivedChunks).toBe(3)
      expect(result.totalChunks).toBe(5)
    })

    it('handles zero totalChunks', async () => {
      const { getUploadProgress } = await import('$lib/server/upload-session')
      const result = getUploadProgress({ receivedChunks: [], totalChunks: 0 })
      expect(result.percent).toBe(0)
    })

    it('handles 100% completion', async () => {
      const { getUploadProgress } = await import('$lib/server/upload-session')
      const result = getUploadProgress({ receivedChunks: [0, 1, 2, 3, 4], totalChunks: 5 })
      expect(result.percent).toBe(100)
    })

    it('handles missing receivedChunks', async () => {
      const { getUploadProgress } = await import('$lib/server/upload-session')
      const result = getUploadProgress({ totalChunks: 5 })
      expect(result.percent).toBe(0)
      expect(result.receivedChunks).toBe(0)
    })
  })
})
