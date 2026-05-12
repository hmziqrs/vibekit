import {
  chunkUploadSchema,
  createUploadSessionSchema,
  listUploadSessionsSchema,
} from '$lib/validators/upload'
import { describe, expect, it } from 'vitest'

describe('Upload Session Validators', () => {
  describe('createUploadSessionSchema', () => {
    it('validates a valid upload session', () => {
      const result = createUploadSessionSchema.safeParse({
        chunkSize: 5 * 1024 * 1024,
        fileName: 'video.mp4',
        fileSize: 100 * 1024 * 1024,
        fileType: 'video/mp4',
      })
      expect(result.success).toBe(true)
    })

    it('rejects chunk size below minimum', () => {
      const result = createUploadSessionSchema.safeParse({
        chunkSize: 1024,
        fileName: 'test.mp4',
        fileSize: 10 * 1024 * 1024,
        fileType: 'video/mp4',
      })
      expect(result.success).toBe(false)
    })

    it('rejects chunk size above maximum', () => {
      const result = createUploadSessionSchema.safeParse({
        chunkSize: 100 * 1024 * 1024,
        fileName: 'test.mp4',
        fileSize: 200 * 1024 * 1024,
        fileType: 'video/mp4',
      })
      expect(result.success).toBe(false)
    })

    it('rejects file size above 500MB', () => {
      const result = createUploadSessionSchema.safeParse({
        chunkSize: 5 * 1024 * 1024,
        fileName: 'huge.mp4',
        fileSize: 600 * 1024 * 1024,
        fileType: 'video/mp4',
      })
      expect(result.success).toBe(false)
    })

    it('rejects empty file name', () => {
      const result = createUploadSessionSchema.safeParse({
        chunkSize: 5 * 1024 * 1024,
        fileName: '',
        fileSize: 10 * 1024 * 1024,
        fileType: 'video/mp4',
      })
      expect(result.success).toBe(false)
    })

    it('rejects zero file size', () => {
      const result = createUploadSessionSchema.safeParse({
        chunkSize: 5 * 1024 * 1024,
        fileName: 'test.mp4',
        fileSize: 0,
        fileType: 'video/mp4',
      })
      expect(result.success).toBe(false)
    })

    it('trims file name whitespace', () => {
      const result = createUploadSessionSchema.safeParse({
        chunkSize: 5 * 1024 * 1024,
        fileName: '  test.mp4  ',
        fileSize: 10 * 1024 * 1024,
        fileType: 'video/mp4',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.fileName).toBe('test.mp4')
      }
    })
  })

  describe('chunkUploadSchema', () => {
    it('validates valid chunk index', () => {
      const result = chunkUploadSchema.safeParse({ chunkIndex: 0 })
      expect(result.success).toBe(true)
    })

    it('validates large chunk index', () => {
      const result = chunkUploadSchema.safeParse({ chunkIndex: 999 })
      expect(result.success).toBe(true)
    })

    it('rejects negative chunk index', () => {
      const result = chunkUploadSchema.safeParse({ chunkIndex: -1 })
      expect(result.success).toBe(false)
    })
  })

  describe('listUploadSessionsSchema', () => {
    it('validates empty params', () => {
      const result = listUploadSessionsSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('validates with status filter', () => {
      const result = listUploadSessionsSchema.safeParse({ status: 'uploading' })
      expect(result.success).toBe(true)
    })

    it('rejects invalid status', () => {
      const result = listUploadSessionsSchema.safeParse({ status: 'invalid' })
      expect(result.success).toBe(false)
    })
  })
})

describe('Upload Progress Calculation', () => {
  function getUploadProgress(session: { receivedChunks: number[]; totalChunks: number }) {
    return {
      percent:
        session.totalChunks > 0
          ? Math.round((session.receivedChunks.length / session.totalChunks) * 100)
          : 0,
      receivedChunks: session.receivedChunks.length,
      totalChunks: session.totalChunks,
    }
  }

  it('calculates 0% for no chunks received', () => {
    const progress = getUploadProgress({ receivedChunks: [], totalChunks: 10 })
    expect(progress.percent).toBe(0)
    expect(progress.receivedChunks).toBe(0)
  })

  it('calculates 50% for half chunks received', () => {
    const progress = getUploadProgress({
      receivedChunks: [0, 1, 2, 3, 4],
      totalChunks: 10,
    })
    expect(progress.percent).toBe(50)
  })

  it('calculates 100% when all chunks received', () => {
    const progress = getUploadProgress({
      receivedChunks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      totalChunks: 10,
    })
    expect(progress.percent).toBe(100)
  })

  it('handles zero total chunks', () => {
    const progress = getUploadProgress({ receivedChunks: [], totalChunks: 0 })
    expect(progress.percent).toBe(0)
  })
})

describe('Chunk Count Calculation', () => {
  it('calculates total chunks correctly', () => {
    const fileSize = 100 * 1024 * 1024 // 100MB
    const chunkSize = 5 * 1024 * 1024 // 5MB
    const totalChunks = Math.ceil(fileSize / chunkSize)
    expect(totalChunks).toBe(20)
  })

  it('handles file size exactly divisible by chunk size', () => {
    const fileSize = 10 * 1024 * 1024
    const chunkSize = 5 * 1024 * 1024
    const totalChunks = Math.ceil(fileSize / chunkSize)
    expect(totalChunks).toBe(2)
  })

  it('handles file size with remainder', () => {
    const fileSize = 11 * 1024 * 1024
    const chunkSize = 5 * 1024 * 1024
    const totalChunks = Math.ceil(fileSize / chunkSize)
    expect(totalChunks).toBe(3)
  })
})
