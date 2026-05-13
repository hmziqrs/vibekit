import { extractFormError } from '$lib/form-utils'
import { describe, expect, it } from 'vitest'

describe(extractFormError, () => {
  it('extracts string form error', () => {
    expect(extractFormError({ form: 'Email is required' })).toBe('Email is required')
  })

  it('returns undefined for non-string form', () => {
    expect(extractFormError({ form: { nested: true } })).toBeUndefined()
  })

  it('returns undefined for null', () => {
    expect(extractFormError(null)).toBeUndefined()
  })

  it('returns undefined for undefined', () => {
    expect(extractFormError(undefined)).toBeUndefined()
  })

  it('returns undefined for string error', () => {
    expect(extractFormError('Something went wrong')).toBeUndefined()
  })

  it('returns undefined for Error instance', () => {
    expect(extractFormError(new Error('fail'))).toBeUndefined()
  })
})
