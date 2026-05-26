import { parsePagination } from '$lib/server/hono/pagination'
import { describe, expect, it } from 'vitest'

describe('parsePagination', () => {
  describe('defaults', () => {
    it('returns defaults when no params', () => {
      expect(parsePagination({})).toEqual({ page: 1, limit: 20, offset: 0 })
    })

    it('returns defaults when null params', () => {
      expect(parsePagination({ page: null, limit: null })).toEqual({
        page: 1,
        limit: 20,
        offset: 0,
      })
    })

    it('returns defaults when undefined params', () => {
      expect(parsePagination({ page: undefined, limit: undefined })).toEqual({
        page: 1,
        limit: 20,
        offset: 0,
      })
    })

    it('uses custom default limit', () => {
      expect(parsePagination({}, { limit: 50 })).toEqual({
        page: 1,
        limit: 50,
        offset: 0,
      })
    })

    it('uses custom maxLimit', () => {
      expect(parsePagination({ limit: '200' }, { maxLimit: 50 })).toEqual({
        page: 1,
        limit: 50,
        offset: 0,
      })
    })
  })

  describe('page parsing', () => {
    it('parses valid page number', () => {
      expect(parsePagination({ page: '3' }).page).toBe(3)
    })

    it('computes correct offset from page', () => {
      expect(parsePagination({ page: '3', limit: '10' })).toEqual({
        page: 3,
        limit: 10,
        offset: 20,
      })
    })

    it('offset is 0 for page 1', () => {
      expect(parsePagination({ page: '1' }).offset).toBe(0)
    })

    it('falls back to 1 for page 0', () => {
      expect(parsePagination({ page: '0' }).page).toBe(1)
    })

    it('falls back to 1 for negative page', () => {
      expect(parsePagination({ page: '-5' }).page).toBe(1)
    })

    it('falls back to 1 for non-numeric page', () => {
      expect(parsePagination({ page: 'abc' }).page).toBe(1)
    })

    it('falls back to 1 for decimal page', () => {
      expect(parsePagination({ page: '1.5' }).page).toBe(1)
    })

    it('falls back to 1 for empty string', () => {
      expect(parsePagination({ page: '' }).page).toBe(1)
    })

    it('handles whitespace-padded page', () => {
      expect(parsePagination({ page: '  5  ' }).page).toBe(5)
    })

    it('handles scientific notation as integer', () => {
      expect(parsePagination({ page: '1e2' }).page).toBe(100)
    })
  })

  describe('limit parsing', () => {
    it('parses valid limit', () => {
      expect(parsePagination({ limit: '50' }).limit).toBe(50)
    })

    it('clamps to maxLimit (default 100)', () => {
      expect(parsePagination({ limit: '500' }).limit).toBe(100)
    })

    it('clamps to custom maxLimit', () => {
      expect(parsePagination({ limit: '200' }, { maxLimit: 50 }).limit).toBe(50)
    })

    it('clamps limit 0 to 1', () => {
      expect(parsePagination({ limit: '0' }).limit).toBe(1)
    })

    it('clamps negative limit to 1', () => {
      expect(parsePagination({ limit: '-10' }).limit).toBe(1)
    })

    it('falls back to default for non-numeric limit', () => {
      expect(parsePagination({ limit: 'abc' }).limit).toBe(20)
    })

    it('falls back to default for decimal limit', () => {
      expect(parsePagination({ limit: '2.5' }).limit).toBe(20)
    })

    it('falls back to default for empty string limit', () => {
      expect(parsePagination({ limit: '' }).limit).toBe(20)
    })

    it('allows limit of 1', () => {
      expect(parsePagination({ limit: '1' }).limit).toBe(1)
    })

    it('allows limit equal to maxLimit', () => {
      expect(parsePagination({ limit: '100' }).limit).toBe(100)
    })

    it('clamps Infinity to maxLimit', () => {
      expect(parsePagination({ limit: 'Infinity' }).limit).toBe(20)
    })

    it('handles whitespace-padded limit', () => {
      expect(parsePagination({ limit: '  25  ' }).limit).toBe(25)
    })
  })

  describe('offset computation', () => {
    it('computes offset = (page - 1) * limit', () => {
      expect(parsePagination({ page: '5', limit: '10' }).offset).toBe(40)
    })

    it('computes offset with custom default limit', () => {
      expect(parsePagination({ page: '3' }, { limit: 25 }).offset).toBe(50)
    })

    it('computes offset of 0 for page 1 with any limit', () => {
      expect(parsePagination({ page: '1', limit: '50' }).offset).toBe(0)
    })
  })

  describe('combined params', () => {
    it('parses page and limit together', () => {
      expect(parsePagination({ page: '2', limit: '15' })).toEqual({
        page: 2,
        limit: 15,
        offset: 15,
      })
    })

    it('applies clamping to both page and limit', () => {
      expect(parsePagination({ page: '-1', limit: '500' })).toEqual({
        page: 1,
        limit: 100,
        offset: 0,
      })
    })
  })

  describe('edge cases', () => {
    it('handles very large page number', () => {
      const result = parsePagination({ page: '999999' })
      expect(result.page).toBe(999999)
      expect(result.offset).toBe(999998 * 20)
    })

    it('handles limit at minimum boundary (1)', () => {
      const result = parsePagination({ limit: '1' })
      expect(result.limit).toBe(1)
    })

    it('handles limit at maximum boundary', () => {
      const result = parsePagination({ limit: '100' })
      expect(result.limit).toBe(100)
    })

    it('handles limit exceeding maximum', () => {
      const result = parsePagination({ limit: '101' })
      expect(result.limit).toBe(100)
    })
  })
})
