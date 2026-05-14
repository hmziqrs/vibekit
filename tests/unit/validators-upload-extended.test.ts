import { bulkDeleteMediaSchema } from '$lib/validators/upload'
import { describe, expect, it } from 'vitest'

describe('bulkDeleteMediaSchema', () => {
  it('accepts valid keys array', () => {
    const result = bulkDeleteMediaSchema.safeParse({
      keys: ['uploads/img1.jpg', 'uploads/img2.png'],
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty keys array', () => {
    const result = bulkDeleteMediaSchema.safeParse({ keys: [] })
    expect(result.success).toBe(false)
  })

  it('rejects missing keys', () => {
    const result = bulkDeleteMediaSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects keys exceeding 100 elements', () => {
    const keys = Array.from({ length: 101 }, (_, i) => `key-${i}`)
    const result = bulkDeleteMediaSchema.safeParse({ keys })
    expect(result.success).toBe(false)
  })

  it('accepts exactly 100 keys', () => {
    const keys = Array.from({ length: 100 }, (_, i) => `key-${i}`)
    const result = bulkDeleteMediaSchema.safeParse({ keys })
    expect(result.success).toBe(true)
  })

  it('rejects empty string keys', () => {
    const result = bulkDeleteMediaSchema.safeParse({ keys: ['valid', '', 'also-valid'] })
    expect(result.success).toBe(false)
  })

  it('rejects non-string elements', () => {
    const result = bulkDeleteMediaSchema.safeParse({ keys: [123, null, {}] })
    expect(result.success).toBe(false)
  })

  it('rejects non-array keys', () => {
    const result = bulkDeleteMediaSchema.safeParse({ keys: 'not-an-array' })
    expect(result.success).toBe(false)
  })

  it('accepts single key', () => {
    const result = bulkDeleteMediaSchema.safeParse({ keys: ['uploads/single.jpg'] })
    expect(result.success).toBe(true)
  })
})
