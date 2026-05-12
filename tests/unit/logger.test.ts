import { createLogger } from '$lib/server/logger'
import { describe, expect, it, vi } from 'vitest'

describe('createLogger', () => {
  it('returns an object with debug, error, info, warn methods', () => {
    const logger = createLogger()
    expect(typeof logger.debug).toBe('function')
    expect(typeof logger.error).toBe('function')
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.warn).toBe('function')
  })

  it('creates logger without context', () => {
    const logger = createLogger()
    expect(logger).toBeDefined()
  })

  it('creates logger with context', () => {
    const logger = createLogger('test-module')
    expect(logger).toBeDefined()
  })
})

describe('log level methods', () => {
  it('info logs to console.info with formatted message', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const logger = createLogger('my-service')
    logger.info('test message')

    expect(spy).toHaveBeenCalledTimes(1)
    const output = spy.mock.calls[0][0] as string
    expect(output).toContain('INFO')
    expect(output).toContain('[my-service]')
    expect(output).toContain('test message')
    spy.mockRestore()
  })

  it('error logs to console.error with formatted message', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const logger = createLogger('my-service')
    logger.error('something failed')

    expect(spy).toHaveBeenCalledTimes(1)
    const output = spy.mock.calls[0][0] as string
    expect(output).toContain('ERROR')
    expect(output).toContain('[my-service]')
    expect(output).toContain('something failed')
    spy.mockRestore()
  })

  it('warn logs to console.warn with formatted message', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const logger = createLogger()
    logger.warn('be careful')

    expect(spy).toHaveBeenCalledTimes(1)
    const output = spy.mock.calls[0][0] as string
    expect(output).toContain('WARN')
    expect(output).toContain('be careful')
    spy.mockRestore()
  })

  it('debug logs to console.debug with formatted message', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    const logger = createLogger()
    logger.debug('debug details')

    expect(spy).toHaveBeenCalledTimes(1)
    const output = spy.mock.calls[0][0] as string
    expect(output).toContain('DEBUG')
    expect(output).toContain('debug details')
    spy.mockRestore()
  })
})

describe('metadata handling', () => {
  it('includes metadata as JSON in log output', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const logger = createLogger()
    logger.info('user logged in', { userId: 'abc-123' })

    const output = spy.mock.calls[0][0] as string
    expect(output).toContain('{"userId":"abc-123"}')
    spy.mockRestore()
  })

  it('omits metadata when not provided', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const logger = createLogger()
    logger.info('simple message')

    const output = spy.mock.calls[0][0] as string
    expect(output).not.toContain('{')
    spy.mockRestore()
  })

  it('handles complex metadata objects', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const logger = createLogger('api')
    logger.error('request failed', {
      duration: 500,
      method: 'POST',
      path: '/api/items',
      statusCode: 500,
    })

    const output = spy.mock.calls[0][0] as string
    expect(output).toContain('POST')
    expect(output).toContain('/api/items')
    expect(output).toContain('500')
    spy.mockRestore()
  })
})

describe('format', () => {
  it('includes ISO timestamp', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const logger = createLogger()
    logger.info('test')

    const output = spy.mock.calls[0][0] as string
    // ISO format: 2026-05-12T15:30:00.000Z
    expect(output).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    spy.mockRestore()
  })

  it('omits context prefix when no context provided', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const logger = createLogger()
    logger.info('test')

    const output = spy.mock.calls[0][0] as string
    expect(output).not.toContain('[]')
    spy.mockRestore()
  })

  it('level is uppercase in output', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const logger = createLogger()
    logger.info('test')

    const output = spy.mock.calls[0][0] as string
    expect(output).toContain('INFO')
    expect(output).not.toContain('info')
    spy.mockRestore()
  })
})
