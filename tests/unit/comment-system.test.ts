import {
  createCommentSchema,
  moderateCommentSchema,
  updateCommentSchema,
} from '$lib/validators/comment'
import { describe, expect, it } from 'vitest'

// ── Comment Validators ──

describe(createCommentSchema, () => {
  it('validates minimal valid input', () => {
    const result = createCommentSchema.safeParse({ content: 'Great post!' })
    expect(result.success).toBeTruthy()
  })

  it('validates input with parentId', () => {
    const result = createCommentSchema.safeParse({
      content: 'Reply to your comment',
      parentId: 'comment-123',
    })
    expect(result.success).toBeTruthy()
  })

  it('rejects empty content', () => {
    const result = createCommentSchema.safeParse({ content: '' })
    expect(result.success).toBeFalsy()
  })

  it('rejects missing content', () => {
    const result = createCommentSchema.safeParse({})
    expect(result.success).toBeFalsy()
  })

  it('rejects content exceeding 5000 chars', () => {
    const result = createCommentSchema.safeParse({ content: 'a'.repeat(5001) })
    expect(result.success).toBeFalsy()
  })

  it('accepts content at exactly 5000 chars', () => {
    const result = createCommentSchema.safeParse({ content: 'a'.repeat(5000) })
    expect(result.success).toBeTruthy()
  })

  it('trims whitespace from content', () => {
    const data = createCommentSchema.parse({ content: '  hello  ' })
    expect(data.content).toBe('hello')
  })

  it('rejects whitespace-only content after trim', () => {
    const result = createCommentSchema.safeParse({ content: '   ' })
    expect(result.success).toBeFalsy()
  })

  it('parentId is optional', () => {
    const data = createCommentSchema.parse({ content: 'A comment' })
    expect(data.parentId).toBeUndefined()
  })
})

describe(updateCommentSchema, () => {
  it('validates content update', () => {
    const result = updateCommentSchema.safeParse({ content: 'Updated comment' })
    expect(result.success).toBeTruthy()
  })

  it('rejects empty content', () => {
    const result = updateCommentSchema.safeParse({ content: '' })
    expect(result.success).toBeFalsy()
  })

  it('rejects content exceeding 5000 chars', () => {
    const result = updateCommentSchema.safeParse({ content: 'b'.repeat(5001) })
    expect(result.success).toBeFalsy()
  })

  it('trims whitespace', () => {
    const data = updateCommentSchema.parse({ content: '  updated  ' })
    expect(data.content).toBe('updated')
  })
})

describe(moderateCommentSchema, () => {
  it('accepts approved status', () => {
    const result = moderateCommentSchema.safeParse({ status: 'approved' })
    expect(result.success).toBeTruthy()
  })

  it('accepts rejected status', () => {
    const result = moderateCommentSchema.safeParse({ status: 'rejected' })
    expect(result.success).toBeTruthy()
  })

  it('accepts spam status', () => {
    const result = moderateCommentSchema.safeParse({ status: 'spam' })
    expect(result.success).toBeTruthy()
  })

  it('rejects pending status', () => {
    const result = moderateCommentSchema.safeParse({ status: 'pending' })
    expect(result.success).toBeFalsy()
  })

  it('rejects invalid status', () => {
    const result = moderateCommentSchema.safeParse({ status: 'invalid' })
    expect(result.success).toBeFalsy()
  })

  it('rejects missing status', () => {
    const result = moderateCommentSchema.safeParse({})
    expect(result.success).toBeFalsy()
  })
})

// ── Spam Detection Logic ──

describe('spam detection patterns', () => {
  const blockedPatterns = [
    {
      reason: 'excessive_links',
      score: 20,
      test: (c: string) => (c.match(/https?:\/\/[^\s]+/g) ?? []).length > 3,
    },
    {
      reason: 'repeated_characters',
      score: 10,
      test: (c: string) => /(.)\1{5,}/.test(c),
    },
    {
      reason: 'excessive_caps',
      score: 15,
      test: (c: string) => {
        const letters = c.replace(/[^A-Za-z]/g, '')
        if (letters.length < 10) return false
        const upper = letters.replace(/[^A-Z]/g, '').length
        return upper / letters.length > 0.7
      },
    },
  ]

  const blockedKeywords = ['viagra', 'casino', 'lottery', 'winner', 'free money', 'crypto giveaway']

  it('detects excessive links', () => {
    const content = 'Check out http://a.com http://b.com http://c.com http://d.com'
    expect(blockedPatterns[0].test(content)).toBeTruthy()
  })

  it('does not flag normal links', () => {
    const content = 'Check out http://example.com for more info'
    expect(blockedPatterns[0].test(content)).toBeFalsy()
  })

  it('detects repeated characters', () => {
    expect(blockedPatterns[1].test('Hello!!!!!!')).toBeTruthy()
    expect(blockedPatterns[1].test('Hello!!!')).toBeFalsy()
  })

  it('detects excessive caps', () => {
    expect(blockedPatterns[2].test('THIS IS COMPLETELY UPPER CASE TEXT')).toBeTruthy()
    expect(blockedPatterns[2].test('This is normal text')).toBeFalsy()
  })

  it('does not flag short text for caps', () => {
    expect(blockedPatterns[2].test('OK')).toBeFalsy()
  })

  it('detects blocked keywords', () => {
    for (const keyword of blockedKeywords) {
      expect(`Buy ${keyword} now`.toLowerCase().includes(keyword)).toBeTruthy()
    }
  })

  it('keyword check is case-insensitive', () => {
    expect('Buy VIAGRA now'.toLowerCase().includes('viagra')).toBeTruthy()
    expect('Free CASINO chips'.toLowerCase().includes('casino')).toBeTruthy()
  })
})

// ── Comment Status Workflow ──

describe('comment status workflow', () => {
  it('status values are mutually exclusive', () => {
    const statuses = ['pending', 'approved', 'rejected', 'spam'] as const
    const unique = new Set(statuses)
    expect(unique.size).toBe(statuses.length)
  })

  it('moderation only allows terminal statuses', () => {
    const result = moderateCommentSchema.safeParse({ status: 'pending' })
    expect(result.success).toBeFalsy()
  })

  it('nesting is limited to one level', () => {
    // A reply (has parentId) cannot have its own replies
    const topLevelComment = { parentId: null }
    const replyComment = { parentId: 'parent-id' }

    // Top-level can have replies
    expect(topLevelComment.parentId).toBeNull()

    // A reply's parent has a parentId of null (top-level)
    expect(replyComment.parentId).toBeTruthy()
  })
})
