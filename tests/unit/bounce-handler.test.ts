import type { DrizzleDb } from '$lib/server/services/types'
import { describe, expect, it, vi } from 'vitest'

function createMockDb(subscriber?: { id: string } | null) {
  const getFn = vi.fn().mockResolvedValue(subscriber ?? null)
  const setFn = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) })
  const updateFn = vi.fn().mockReturnValue({ set: setFn })

  const db = {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ get: getFn }),
      }),
    }),
    update: updateFn,
  } as unknown as DrizzleDb

  return { db, updateFn, setFn }
}

describe('bounce-handler', () => {
  it('exports handleBounce function', async () => {
    const mod = await import('$lib/server/email/bounce-handler')
    expect(typeof mod.handleBounce).toBe('function')
  })

  it('marks subscriber as bounced', async () => {
    const { handleBounce } = await import('$lib/server/email/bounce-handler')
    const { db, updateFn, setFn } = createMockDb({ id: 'sub-1' })

    await handleBounce(db, 'bounced@example.com')

    expect(updateFn).toHaveBeenCalledTimes(1)
    const setArg = setFn.mock.calls[0][0] as Record<string, unknown>
    expect(setArg.status).toBe('bounced')
    expect(setArg.updatedAt).toBeInstanceOf(Date)
  })

  it('does nothing when subscriber not found', async () => {
    const { handleBounce } = await import('$lib/server/email/bounce-handler')
    const { db, updateFn } = createMockDb(null)

    await handleBounce(db, 'unknown@example.com')

    expect(updateFn).toHaveBeenCalledTimes(0)
  })
})
