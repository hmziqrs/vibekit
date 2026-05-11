import {
  AppError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  isAppError,
  NotFoundError,
  RateLimitError,
  ServiceUnavailableError,
  UnauthorizedError,
} from '$lib/server/errors'
import { describe, expect, it } from 'vitest'

describe(AppError, () => {
  it('sets status, code, and message', () => {
    const err = new AppError(418, 'TEAPOT', "I'm a teapot")
    expect(err.status).toBe(418)
    expect(err.code).toBe('TEAPOT')
    expect(err.message).toBe("I'm a teapot")
    expect(err.name).toBe('AppError')
  })

  it('serializes to JSON', () => {
    const err = new AppError(418, 'TEAPOT', "I'm a teapot")
    expect(err.toJSON()).toStrictEqual({
      error: { code: 'TEAPOT', message: "I'm a teapot", status: 418 },
    })
  })

  it('is an instance of Error', () => {
    const err = new AppError(500, 'INTERNAL', 'fail')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(AppError)
  })
})

describe(NotFoundError, () => {
  it('uses 404 status', () => {
    const err = new NotFoundError()
    expect(err.status).toBe(404)
    expect(err.code).toBe('NOT_FOUND')
    expect(err.message).toBe('Not found')
    expect(err.name).toBe('NotFoundError')
  })

  it('accepts custom message', () => {
    const err = new NotFoundError('Post not found')
    expect(err.message).toBe('Post not found')
    expect(err.toJSON()).toStrictEqual({
      error: { code: 'NOT_FOUND', message: 'Post not found', status: 404 },
    })
  })
})

describe(ForbiddenError, () => {
  it('uses 403 status', () => {
    const err = new ForbiddenError()
    expect(err.status).toBe(403)
    expect(err.code).toBe('FORBIDDEN')
    expect(err.name).toBe('ForbiddenError')
  })

  it('accepts custom message', () => {
    const err = new ForbiddenError('Insufficient permissions')
    expect(err.message).toBe('Insufficient permissions')
  })
})

describe(UnauthorizedError, () => {
  it('uses 401 status', () => {
    const err = new UnauthorizedError()
    expect(err.status).toBe(401)
    expect(err.code).toBe('UNAUTHORIZED')
    expect(err.name).toBe('UnauthorizedError')
  })
})

describe(BadRequestError, () => {
  it('uses 400 status', () => {
    const err = new BadRequestError()
    expect(err.status).toBe(400)
    expect(err.code).toBe('BAD_REQUEST')
    expect(err.name).toBe('BadRequestError')
  })

  it('accepts custom message', () => {
    const err = new BadRequestError('Invalid input')
    expect(err.message).toBe('Invalid input')
  })
})

describe(ConflictError, () => {
  it('uses 409 status', () => {
    const err = new ConflictError()
    expect(err.status).toBe(409)
    expect(err.code).toBe('CONFLICT')
    expect(err.name).toBe('ConflictError')
  })

  it('accepts custom message', () => {
    const err = new ConflictError('Slug already exists')
    expect(err.message).toBe('Slug already exists')
  })
})

describe(RateLimitError, () => {
  it('uses 429 status', () => {
    const err = new RateLimitError()
    expect(err.status).toBe(429)
    expect(err.code).toBe('RATE_LIMITED')
    expect(err.name).toBe('RateLimitError')
  })
})

describe(ServiceUnavailableError, () => {
  it('uses 503 status', () => {
    const err = new ServiceUnavailableError()
    expect(err.status).toBe(503)
    expect(err.code).toBe('SERVICE_UNAVAILABLE')
    expect(err.name).toBe('ServiceUnavailableError')
  })
})

describe(isAppError, () => {
  it('returns true for AppError instances', () => {
    expect(isAppError(new NotFoundError())).toBe(true)
    expect(isAppError(new BadRequestError('test'))).toBe(true)
    expect(isAppError(new ConflictError())).toBe(true)
  })

  it('returns true for subclass instances', () => {
    class CustomError extends AppError {
      constructor() {
        super(500, 'CUSTOM', 'custom')
        this.name = 'CustomError'
      }
    }
    expect(isAppError(new CustomError())).toBe(true)
  })

  it('returns false for non-AppError values', () => {
    expect(isAppError(new Error('plain'))).toBe(false)
    expect(isAppError(null)).toBe(false)
    expect(isAppError(undefined)).toBe(false)
    expect(isAppError('string')).toBe(false)
    expect(isAppError(42)).toBe(false)
  })
})
