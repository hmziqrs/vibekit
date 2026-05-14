import {
  createCommentSchema,
  moderateCommentSchema,
  updateCommentSchema,
} from '$lib/validators/comment'
import { describe, expect, it } from 'vitest'

// ---------------------------------------------------------------------------
// createCommentSchema
// ---------------------------------------------------------------------------
describe('createCommentSchema', () => {
  const validInput = {
    content: 'This is a great article, thanks for sharing!',
  }

  // -- Valid inputs ---------------------------------------------------------

  it('validates minimal required input', () => {
    const result = createCommentSchema.safeParse(validInput)
    expect(result.success).toBeTruthy()
  })

  it('validates input with optional parentId', () => {
    const result = createCommentSchema.safeParse({
      ...validInput,
      parentId: 'comment-uuid-123',
    })
    expect(result.success).toBeTruthy()
  })

  it('accepts single character content', () => {
    const result = createCommentSchema.safeParse({ content: 'A' })
    expect(result.success).toBeTruthy()
  })

  it('accepts content at max length (5000)', () => {
    const result = createCommentSchema.safeParse({ content: 'a'.repeat(5000) })
    expect(result.success).toBeTruthy()
  })

  it('accepts content with newlines', () => {
    const result = createCommentSchema.safeParse({
      content: 'First line\nSecond line\nThird line',
    })
    expect(result.success).toBeTruthy()
  })

  it('accepts content with unicode characters', () => {
    const result = createCommentSchema.safeParse({ content: 'Great post! \u{1F44D} \u{1F389}' })
    expect(result.success).toBeTruthy()
  })

  // -- Missing required fields -----------------------------------------------

  it('rejects missing content', () => {
    const result = createCommentSchema.safeParse({})
    expect(result.success).toBeFalsy()
  })

  it('rejects empty object', () => {
    const result = createCommentSchema.safeParse({})
    expect(result.success).toBeFalsy()
  })

  // -- Invalid types --------------------------------------------------------

  it('rejects content that is a number', () => {
    const result = createCommentSchema.safeParse({ content: 123 })
    expect(result.success).toBeFalsy()
  })

  it('rejects content that is a boolean', () => {
    const result = createCommentSchema.safeParse({ content: true })
    expect(result.success).toBeFalsy()
  })

  it('rejects content that is null', () => {
    const result = createCommentSchema.safeParse({ content: null })
    expect(result.success).toBeFalsy()
  })

  it('rejects content that is an array', () => {
    const result = createCommentSchema.safeParse({ content: ['hello'] })
    expect(result.success).toBeFalsy()
  })

  it('rejects content that is an object', () => {
    const result = createCommentSchema.safeParse({ content: { text: 'hello' } })
    expect(result.success).toBeFalsy()
  })

  it('rejects parentId that is not a string', () => {
    const result = createCommentSchema.safeParse({ ...validInput, parentId: 123 })
    expect(result.success).toBeFalsy()
  })

  it('rejects parentId that is a boolean', () => {
    const result = createCommentSchema.safeParse({ ...validInput, parentId: true })
    expect(result.success).toBeFalsy()
  })

  // -- Boundary values ------------------------------------------------------

  it('rejects empty content', () => {
    const result = createCommentSchema.safeParse({ content: '' })
    expect(result.success).toBeFalsy()
  })

  it('rejects whitespace-only content', () => {
    const result = createCommentSchema.safeParse({ content: '   ' })
    expect(result.success).toBeFalsy()
  })

  it('rejects content exceeding max length (5001)', () => {
    const result = createCommentSchema.safeParse({ content: 'a'.repeat(5001) })
    expect(result.success).toBeFalsy()
  })

  // -- Custom error messages ------------------------------------------------

  it('returns correct error message for empty content', () => {
    const result = createCommentSchema.safeParse({ content: '' })
    expect(result.success).toBeFalsy()
    if (!result.success) {
      const issues = result.error.issues.map((i) => i.message)
      expect(issues).toContain('Comment cannot be empty')
    }
  })

  it('returns correct error message for whitespace-only content', () => {
    const result = createCommentSchema.safeParse({ content: '   ' })
    expect(result.success).toBeFalsy()
    if (!result.success) {
      const issues = result.error.issues.map((i) => i.message)
      expect(issues).toContain('Comment cannot be empty')
    }
  })

  it('returns correct error message for content exceeding max length', () => {
    const result = createCommentSchema.safeParse({ content: 'a'.repeat(5001) })
    expect(result.success).toBeFalsy()
    if (!result.success) {
      const issues = result.error.issues.map((i) => i.message)
      expect(issues).toContain('Comment is too long (max 5000 characters)')
    }
  })

  // -- Trimming --------------------------------------------------------------

  it('trims whitespace from content', () => {
    const data = createCommentSchema.parse({ content: '  Hello world  ' })
    expect(data.content).toBe('Hello world')
  })

  it('preserves whitespace in parentId (no trim on optional string)', () => {
    const data = createCommentSchema.parse({
      content: 'Nice post',
      parentId: '  comment-id-123  ',
    })
    expect(data.parentId).toBe('  comment-id-123  ')
  })

  // -- Extra fields ----------------------------------------------------------

  it('strips unknown fields', () => {
    const data = createCommentSchema.parse({
      content: 'Hello',
      unknownField: 'should be removed',
    })
    expect(data).toEqual({ content: 'Hello' })
  })
})

// ---------------------------------------------------------------------------
// updateCommentSchema
// ---------------------------------------------------------------------------
describe('updateCommentSchema', () => {
  const validInput = {
    content: 'Updated comment text.',
  }

  // -- Valid inputs ---------------------------------------------------------

  it('validates minimal required input', () => {
    const result = updateCommentSchema.safeParse(validInput)
    expect(result.success).toBeTruthy()
  })

  it('accepts single character content', () => {
    const result = updateCommentSchema.safeParse({ content: 'B' })
    expect(result.success).toBeTruthy()
  })

  it('accepts content at max length (5000)', () => {
    const result = updateCommentSchema.safeParse({ content: 'x'.repeat(5000) })
    expect(result.success).toBeTruthy()
  })

  it('accepts content with special characters', () => {
    const result = updateCommentSchema.safeParse({
      content: 'Updated! <b>bold</b> & "quoted"',
    })
    expect(result.success).toBeTruthy()
  })

  // -- Missing required fields -----------------------------------------------

  it('rejects missing content', () => {
    const result = updateCommentSchema.safeParse({})
    expect(result.success).toBeFalsy()
  })

  // -- Invalid types --------------------------------------------------------

  it('rejects content that is a number', () => {
    const result = updateCommentSchema.safeParse({ content: 42 })
    expect(result.success).toBeFalsy()
  })

  it('rejects content that is a boolean', () => {
    const result = updateCommentSchema.safeParse({ content: false })
    expect(result.success).toBeFalsy()
  })

  it('rejects content that is null', () => {
    const result = updateCommentSchema.safeParse({ content: null })
    expect(result.success).toBeFalsy()
  })

  it('rejects content that is undefined', () => {
    const result = updateCommentSchema.safeParse({ content: undefined })
    expect(result.success).toBeFalsy()
  })

  // -- Boundary values ------------------------------------------------------

  it('rejects empty content', () => {
    const result = updateCommentSchema.safeParse({ content: '' })
    expect(result.success).toBeFalsy()
  })

  it('rejects whitespace-only content', () => {
    const result = updateCommentSchema.safeParse({ content: '\t\n  ' })
    expect(result.success).toBeFalsy()
  })

  it('rejects content exceeding max length (5001)', () => {
    const result = updateCommentSchema.safeParse({ content: 'b'.repeat(5001) })
    expect(result.success).toBeFalsy()
  })

  // -- Custom error messages ------------------------------------------------

  it('returns correct error message for empty content', () => {
    const result = updateCommentSchema.safeParse({ content: '' })
    expect(result.success).toBeFalsy()
    if (!result.success) {
      const issues = result.error.issues.map((i) => i.message)
      expect(issues).toContain('Comment cannot be empty')
    }
  })

  it('returns correct error message for content exceeding max length', () => {
    const result = updateCommentSchema.safeParse({ content: 'b'.repeat(5001) })
    expect(result.success).toBeFalsy()
    if (!result.success) {
      const issues = result.error.issues.map((i) => i.message)
      expect(issues).toContain('Comment is too long (max 5000 characters)')
    }
  })

  // -- Trimming --------------------------------------------------------------

  it('trims whitespace from content', () => {
    const data = updateCommentSchema.parse({ content: '  Updated text  ' })
    expect(data.content).toBe('Updated text')
  })

  it('trims tabs and newlines from edges', () => {
    const data = updateCommentSchema.parse({ content: '\n\t Updated \t\n' })
    expect(data.content).toBe('Updated')
  })
})

// ---------------------------------------------------------------------------
// moderateCommentSchema
// ---------------------------------------------------------------------------
describe('moderateCommentSchema', () => {
  const validInput = {
    status: 'approved',
  }

  // -- Valid inputs ---------------------------------------------------------

  it('validates status as approved', () => {
    const result = moderateCommentSchema.safeParse({ status: 'approved' })
    expect(result.success).toBeTruthy()
  })

  it('validates status as rejected', () => {
    const result = moderateCommentSchema.safeParse({ status: 'rejected' })
    expect(result.success).toBeTruthy()
  })

  it('validates status as spam', () => {
    const result = moderateCommentSchema.safeParse({ status: 'spam' })
    expect(result.success).toBeTruthy()
  })

  it('parses and returns the correct status value', () => {
    const data = moderateCommentSchema.parse(validInput)
    expect(data.status).toBe('approved')
  })

  // -- Missing required fields -----------------------------------------------

  it('rejects missing status', () => {
    const result = moderateCommentSchema.safeParse({})
    expect(result.success).toBeFalsy()
  })

  it('rejects empty object', () => {
    const result = moderateCommentSchema.safeParse({})
    expect(result.success).toBeFalsy()
  })

  // -- Invalid types --------------------------------------------------------

  it('rejects status that is a number', () => {
    const result = moderateCommentSchema.safeParse({ status: 1 })
    expect(result.success).toBeFalsy()
  })

  it('rejects status that is a boolean', () => {
    const result = moderateCommentSchema.safeParse({ status: true })
    expect(result.success).toBeFalsy()
  })

  it('rejects status that is null', () => {
    const result = moderateCommentSchema.safeParse({ status: null })
    expect(result.success).toBeFalsy()
  })

  it('rejects status that is undefined', () => {
    const result = moderateCommentSchema.safeParse({ status: undefined })
    expect(result.success).toBeFalsy()
  })

  it('rejects status that is an array', () => {
    const result = moderateCommentSchema.safeParse({ status: ['approved'] })
    expect(result.success).toBeFalsy()
  })

  // -- Invalid enum values --------------------------------------------------

  it('rejects status "pending"', () => {
    const result = moderateCommentSchema.safeParse({ status: 'pending' })
    expect(result.success).toBeFalsy()
  })

  it('rejects status "deleted"', () => {
    const result = moderateCommentSchema.safeParse({ status: 'deleted' })
    expect(result.success).toBeFalsy()
  })

  it('rejects status "APPROVED" (case sensitive)', () => {
    const result = moderateCommentSchema.safeParse({ status: 'APPROVED' })
    expect(result.success).toBeFalsy()
  })

  it('rejects status "Approved" (case sensitive)', () => {
    const result = moderateCommentSchema.safeParse({ status: 'Approved' })
    expect(result.success).toBeFalsy()
  })

  it('rejects status "REJECTED" (case sensitive)', () => {
    const result = moderateCommentSchema.safeParse({ status: 'REJECTED' })
    expect(result.success).toBeFalsy()
  })

  it('rejects empty string status', () => {
    const result = moderateCommentSchema.safeParse({ status: '' })
    expect(result.success).toBeFalsy()
  })

  it('rejects arbitrary string status', () => {
    const result = moderateCommentSchema.safeParse({ status: 'moderated' })
    expect(result.success).toBeFalsy()
  })

  // -- Extra fields ----------------------------------------------------------

  it('strips unknown fields', () => {
    const data = moderateCommentSchema.parse({
      status: 'spam',
      reason: 'Contains links',
    })
    expect(data).toEqual({ status: 'spam' })
  })
})
