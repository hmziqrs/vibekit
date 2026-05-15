import {
  chunkUploadSchema,
  createUploadSessionSchema,
  listUploadSessionsSchema,
  storagePresignGetSchema,
  storagePresignPutSchema,
  storageThumbnailSchema,
} from '$lib/validators/upload'
import { describe, expect, it } from 'vitest'

// ---------------------------------------------------------------------------
// createUploadSessionSchema
// ---------------------------------------------------------------------------
describe('createUploadSessionSchema', () => {
  const validInput = {
    chunkSize: 5_242_880,
    fileName: 'document.pdf',
    fileSize: 10_485_760,
    fileType: 'application/pdf',
  }

  // -- Valid inputs ---------------------------------------------------------

  it('validates valid input', () => {
    const result = createUploadSessionSchema.safeParse(validInput)
    expect(result.success).toBeTruthy()
  })

  it('accepts fileName at minimum length (1 char)', () => {
    const result = createUploadSessionSchema.safeParse({ ...validInput, fileName: 'a' })
    expect(result.success).toBeTruthy()
  })

  it('accepts fileName at maximum length (255 chars)', () => {
    const result = createUploadSessionSchema.safeParse({
      ...validInput,
      fileName: 'a'.repeat(255),
    })
    expect(result.success).toBeTruthy()
  })

  it('accepts fileSize at minimum (1 byte)', () => {
    const result = createUploadSessionSchema.safeParse({ ...validInput, fileSize: 1 })
    expect(result.success).toBeTruthy()
  })

  it('accepts fileSize at maximum (524 288 000 bytes = 500 MB)', () => {
    const result = createUploadSessionSchema.safeParse({
      ...validInput,
      fileSize: 524_288_000,
    })
    expect(result.success).toBeTruthy()
  })

  it('accepts chunkSize at minimum (1 048 576 bytes = 1 MB)', () => {
    const result = createUploadSessionSchema.safeParse({
      ...validInput,
      chunkSize: 1_048_576,
    })
    expect(result.success).toBeTruthy()
  })

  it('accepts chunkSize at maximum (52 428 800 bytes = 50 MB)', () => {
    const result = createUploadSessionSchema.safeParse({
      ...validInput,
      chunkSize: 52_428_800,
    })
    expect(result.success).toBeTruthy()
  })

  it('accepts fileType at minimum length (1 char)', () => {
    const result = createUploadSessionSchema.safeParse({ ...validInput, fileType: 'a' })
    expect(result.success).toBeTruthy()
  })

  it('accepts fileType at maximum length (100 chars)', () => {
    const result = createUploadSessionSchema.safeParse({
      ...validInput,
      fileType: 'a'.repeat(100),
    })
    expect(result.success).toBeTruthy()
  })

  it('trims whitespace from fileName', () => {
    const data = createUploadSessionSchema.parse({
      ...validInput,
      fileName: '  document.pdf  ',
    })
    expect(data.fileName).toBe('document.pdf')
  })

  it('trims whitespace from fileType', () => {
    const data = createUploadSessionSchema.parse({
      ...validInput,
      fileType: '  application/pdf  ',
    })
    expect(data.fileType).toBe('application/pdf')
  })

  // -- Missing required fields -----------------------------------------------

  it('rejects missing fileName', () => {
    const { fileName, ...rest } = validInput
    const result = createUploadSessionSchema.safeParse(rest)
    expect(result.success).toBeFalsy()
  })

  it('rejects missing fileSize', () => {
    const { fileSize, ...rest } = validInput
    const result = createUploadSessionSchema.safeParse(rest)
    expect(result.success).toBeFalsy()
  })

  it('rejects missing fileType', () => {
    const { fileType, ...rest } = validInput
    const result = createUploadSessionSchema.safeParse(rest)
    expect(result.success).toBeFalsy()
  })

  it('rejects missing chunkSize', () => {
    const { chunkSize, ...rest } = validInput
    const result = createUploadSessionSchema.safeParse(rest)
    expect(result.success).toBeFalsy()
  })

  it('rejects empty object', () => {
    const result = createUploadSessionSchema.safeParse({})
    expect(result.success).toBeFalsy()
  })

  // -- Invalid types --------------------------------------------------------

  it('rejects fileName that is not a string', () => {
    const result = createUploadSessionSchema.safeParse({ ...validInput, fileName: 123 })
    expect(result.success).toBeFalsy()
  })

  it('rejects fileSize that is a string', () => {
    const result = createUploadSessionSchema.safeParse({
      ...validInput,
      fileSize: '10485760',
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects fileSize that is a boolean', () => {
    const result = createUploadSessionSchema.safeParse({
      ...validInput,
      fileSize: true,
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects fileType that is not a string', () => {
    const result = createUploadSessionSchema.safeParse({ ...validInput, fileType: 42 })
    expect(result.success).toBeFalsy()
  })

  it('rejects chunkSize that is a string', () => {
    const result = createUploadSessionSchema.safeParse({
      ...validInput,
      chunkSize: '5242880',
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects chunkSize that is a boolean', () => {
    const result = createUploadSessionSchema.safeParse({
      ...validInput,
      chunkSize: false,
    })
    expect(result.success).toBeFalsy()
  })

  // -- Boundary values ------------------------------------------------------

  it('rejects empty fileName', () => {
    const result = createUploadSessionSchema.safeParse({ ...validInput, fileName: '' })
    expect(result.success).toBeFalsy()
  })

  it('rejects whitespace-only fileName', () => {
    const result = createUploadSessionSchema.safeParse({ ...validInput, fileName: '   ' })
    expect(result.success).toBeFalsy()
  })

  it('rejects fileName exceeding max length (256 chars)', () => {
    const result = createUploadSessionSchema.safeParse({
      ...validInput,
      fileName: 'a'.repeat(256),
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects fileSize of 0 (below minimum)', () => {
    const result = createUploadSessionSchema.safeParse({ ...validInput, fileSize: 0 })
    expect(result.success).toBeFalsy()
  })

  it('rejects negative fileSize', () => {
    const result = createUploadSessionSchema.safeParse({ ...validInput, fileSize: -1 })
    expect(result.success).toBeFalsy()
  })

  it('rejects fileSize exceeding maximum (524 288 001)', () => {
    const result = createUploadSessionSchema.safeParse({
      ...validInput,
      fileSize: 524_288_001,
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects float fileSize', () => {
    const result = createUploadSessionSchema.safeParse({
      ...validInput,
      fileSize: 10.5,
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects chunkSize below minimum (1 048 575)', () => {
    const result = createUploadSessionSchema.safeParse({
      ...validInput,
      chunkSize: 1_048_575,
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects chunkSize of 0', () => {
    const result = createUploadSessionSchema.safeParse({ ...validInput, chunkSize: 0 })
    expect(result.success).toBeFalsy()
  })

  it('rejects negative chunkSize', () => {
    const result = createUploadSessionSchema.safeParse({ ...validInput, chunkSize: -1 })
    expect(result.success).toBeFalsy()
  })

  it('rejects chunkSize exceeding maximum (52 428 801)', () => {
    const result = createUploadSessionSchema.safeParse({
      ...validInput,
      chunkSize: 52_428_801,
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects float chunkSize', () => {
    const result = createUploadSessionSchema.safeParse({
      ...validInput,
      chunkSize: 1_048_576.5,
    })
    expect(result.success).toBeFalsy()
  })

  it('rejects empty fileType', () => {
    const result = createUploadSessionSchema.safeParse({ ...validInput, fileType: '' })
    expect(result.success).toBeFalsy()
  })

  it('rejects whitespace-only fileType', () => {
    const result = createUploadSessionSchema.safeParse({ ...validInput, fileType: '   ' })
    expect(result.success).toBeFalsy()
  })

  it('rejects fileType exceeding max length (101 chars)', () => {
    const result = createUploadSessionSchema.safeParse({
      ...validInput,
      fileType: 'a'.repeat(101),
    })
    expect(result.success).toBeFalsy()
  })
})

// ---------------------------------------------------------------------------
// chunkUploadSchema
// ---------------------------------------------------------------------------
describe('chunkUploadSchema', () => {
  const validInput = {
    chunkIndex: 0,
  }

  // -- Valid inputs ---------------------------------------------------------

  it('validates valid input with chunkIndex 0', () => {
    const result = chunkUploadSchema.safeParse(validInput)
    expect(result.success).toBeTruthy()
  })

  it('accepts positive chunkIndex', () => {
    const result = chunkUploadSchema.safeParse({ chunkIndex: 42 })
    expect(result.success).toBeTruthy()
  })

  it('accepts large chunkIndex values', () => {
    const result = chunkUploadSchema.safeParse({ chunkIndex: 999_999 })
    expect(result.success).toBeTruthy()
  })

  // -- Missing required fields -----------------------------------------------

  it('rejects missing chunkIndex', () => {
    const result = chunkUploadSchema.safeParse({})
    expect(result.success).toBeFalsy()
  })

  // -- Invalid types --------------------------------------------------------

  it('rejects chunkIndex that is a string', () => {
    const result = chunkUploadSchema.safeParse({ chunkIndex: '0' })
    expect(result.success).toBeFalsy()
  })

  it('rejects chunkIndex that is a boolean', () => {
    const result = chunkUploadSchema.safeParse({ chunkIndex: true })
    expect(result.success).toBeFalsy()
  })

  it('rejects chunkIndex that is null', () => {
    const result = chunkUploadSchema.safeParse({ chunkIndex: null })
    expect(result.success).toBeFalsy()
  })

  // -- Boundary values ------------------------------------------------------

  it('rejects negative chunkIndex', () => {
    const result = chunkUploadSchema.safeParse({ chunkIndex: -1 })
    expect(result.success).toBeFalsy()
  })

  it('rejects float chunkIndex', () => {
    const result = chunkUploadSchema.safeParse({ chunkIndex: 1.5 })
    expect(result.success).toBeFalsy()
  })

  it('rejects chunkIndex of NaN', () => {
    const result = chunkUploadSchema.safeParse({ chunkIndex: NaN })
    expect(result.success).toBeFalsy()
  })
})

// ---------------------------------------------------------------------------
// listUploadSessionsSchema
// ---------------------------------------------------------------------------
describe('listUploadSessionsSchema', () => {
  const validStatuses = ['complete', 'expired', 'failed', 'pending', 'uploading'] as const

  // -- Valid inputs ---------------------------------------------------------

  it('accepts an empty object (status is optional)', () => {
    const result = listUploadSessionsSchema.safeParse({})
    expect(result.success).toBeTruthy()
  })

  it('accepts each valid status value', () => {
    for (const status of validStatuses) {
      const result = listUploadSessionsSchema.safeParse({ status })
      expect(result.success).toBeTruthy()
    }
  })

  // -- Invalid inputs -------------------------------------------------------

  it('rejects status not in the enum', () => {
    const result = listUploadSessionsSchema.safeParse({ status: 'cancelled' })
    expect(result.success).toBeFalsy()
  })

  it('rejects empty status string', () => {
    const result = listUploadSessionsSchema.safeParse({ status: '' })
    expect(result.success).toBeFalsy()
  })

  it('rejects status that is not a string', () => {
    const result = listUploadSessionsSchema.safeParse({ status: 123 })
    expect(result.success).toBeFalsy()
  })

  it('rejects status that is a boolean', () => {
    const result = listUploadSessionsSchema.safeParse({ status: true })
    expect(result.success).toBeFalsy()
  })

  it('rejects status that is null', () => {
    const result = listUploadSessionsSchema.safeParse({ status: null })
    expect(result.success).toBeFalsy()
  })
})

// ---------------------------------------------------------------------------
// storagePresignGetSchema
// ---------------------------------------------------------------------------
describe('storagePresignGetSchema', () => {
  it('accepts valid key', () => {
    const result = storagePresignGetSchema.safeParse({ key: 'uploads/image.png' })
    expect(result.success).toBe(true)
  })

  it('rejects empty key', () => {
    const result = storagePresignGetSchema.safeParse({ key: '' })
    expect(result.success).toBe(false)
  })

  it('rejects whitespace-only key', () => {
    const result = storagePresignGetSchema.safeParse({ key: '   ' })
    expect(result.success).toBe(false)
  })

  it('trims whitespace from key', () => {
    const data = storagePresignGetSchema.parse({ key: '  uploads/image.png  ' })
    expect(data.key).toBe('uploads/image.png')
  })

  it('rejects key exceeding max length', () => {
    const result = storagePresignGetSchema.safeParse({ key: 'a'.repeat(1025) })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// storagePresignPutSchema
// ---------------------------------------------------------------------------
describe('storagePresignPutSchema', () => {
  it('accepts valid key and contentType', () => {
    const result = storagePresignPutSchema.safeParse({
      contentType: 'image/png',
      key: 'uploads/image.png',
    })
    expect(result.success).toBe(true)
  })

  it('accepts key without contentType', () => {
    const result = storagePresignPutSchema.safeParse({ key: 'uploads/file.bin' })
    expect(result.success).toBe(true)
  })

  it('rejects empty key', () => {
    const result = storagePresignPutSchema.safeParse({ key: '' })
    expect(result.success).toBe(false)
  })

  it('rejects whitespace-only contentType', () => {
    const result = storagePresignPutSchema.safeParse({ contentType: '   ', key: 'valid' })
    expect(result.success).toBe(false)
  })

  it('trims whitespace from both fields', () => {
    const data = storagePresignPutSchema.parse({
      contentType: '  image/png  ',
      key: '  uploads/image.png  ',
    })
    expect(data.key).toBe('uploads/image.png')
    expect(data.contentType).toBe('image/png')
  })
})

// ---------------------------------------------------------------------------
// storageThumbnailSchema
// ---------------------------------------------------------------------------
describe('storageThumbnailSchema', () => {
  it('accepts valid key with dimensions', () => {
    const result = storageThumbnailSchema.safeParse({ height: 200, key: 'img.png', width: 300 })
    expect(result.success).toBe(true)
  })

  it('accepts key without dimensions', () => {
    const result = storageThumbnailSchema.safeParse({ key: 'img.png' })
    expect(result.success).toBe(true)
  })

  it('rejects empty key', () => {
    const result = storageThumbnailSchema.safeParse({ key: '' })
    expect(result.success).toBe(false)
  })

  it('coerces string dimensions to numbers', () => {
    const data = storageThumbnailSchema.parse({ height: '200', key: 'img.png', width: '300' })
    expect(data.height).toBe(200)
    expect(data.width).toBe(300)
  })

  it('rejects width below minimum', () => {
    const result = storageThumbnailSchema.safeParse({ key: 'img.png', width: 49 })
    expect(result.success).toBe(false)
  })

  it('rejects width above maximum', () => {
    const result = storageThumbnailSchema.safeParse({ key: 'img.png', width: 2001 })
    expect(result.success).toBe(false)
  })

  it('rejects height below minimum', () => {
    const result = storageThumbnailSchema.safeParse({ height: 49, key: 'img.png' })
    expect(result.success).toBe(false)
  })

  it('rejects height above maximum', () => {
    const result = storageThumbnailSchema.safeParse({ height: 2001, key: 'img.png' })
    expect(result.success).toBe(false)
  })
})
