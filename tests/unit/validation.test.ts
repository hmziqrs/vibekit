import { getFieldError } from '$lib/validation'
import { describe, expect, it } from 'vitest'

describe(getFieldError, () => {
  it('returns first error message', () => {
    const errors = [{ message: 'Required' }, { message: 'Too long' }] as never
    expect(getFieldError(errors)).toBe('Required')
  })

  it('returns undefined for empty array', () => {
    expect(getFieldError([])).toBeUndefined()
  })

  it('returns undefined for single error with empty message', () => {
    const errors = [{ message: '' }] as never
    expect(getFieldError(errors)).toBe('')
  })

  it('ignores second error', () => {
    const errors = [{ message: 'First' }, { message: 'Second' }] as never
    expect(getFieldError(errors)).toBe('First')
  })
})
