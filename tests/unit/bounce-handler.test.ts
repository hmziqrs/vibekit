import { describe, expect, it } from 'vitest'

import { createMockDb } from '../helpers/mock-db'

describe('bounce-handler', () => {
  it('exports handleBounce function', async () => {
    const mod = await import('$lib/server/email/bounce-handler')
    expect(typeof mod.handleBounce).toBe('function')
  })

  it('marks subscriber as bounced', async () => {
    const { handleBounce } = await import('$lib/server/email/bounce-handler')
    const { db, mocks } = createMockDb({ getResult: { id: 'sub-1' } })

    await handleBounce(db, 'bounced@example.com')

    expect(mocks.updateFn).toHaveBeenCalledTimes(1)
    const setArg = mocks.setFn.mock.calls[0][0] as Record<string, unknown>
    expect(setArg.status).toBe('bounced')
    expect(setArg.updatedAt).toBeInstanceOf(Date)
  })

  it('does nothing when subscriber not found', async () => {
    const { handleBounce } = await import('$lib/server/email/bounce-handler')
    const { db, mocks } = createMockDb({ getResult: null })

    await handleBounce(db, 'unknown@example.com')

    expect(mocks.updateFn).toHaveBeenCalledTimes(0)
  })
})
