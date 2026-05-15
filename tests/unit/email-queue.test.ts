import { describe, expect, it, vi } from 'vitest'

function createMockClient(result: { ok: boolean; reason?: string } = { ok: true }) {
  return {
    send: vi.fn().mockResolvedValue(result),
  }
}

function createMockDb() {
  const store = new Map<string, Record<string, unknown>>()

  return {
    _store: store,
    insert: vi.fn((table: unknown) => ({
      values: vi.fn((data: Record<string, unknown>) => {
        store.set(data.id as string, data)
        return { returning: vi.fn().mockResolvedValue([data]) }
      }),
    })),
    update: vi.fn((table: unknown) => ({
      set: vi.fn((data: Record<string, unknown>) => ({
        where: vi.fn(() => {
          // Find and update matching entries
          return Promise.resolve([])
        }),
      })),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() =>
              Promise.resolve(
                [...store.values()].map((v) => ({
                  ...v,
                  message: {
                    from: 'noreply@vibekit.com',
                    subject: 'Test',
                    to: 'test@example.com',
                  },
                }))
              )
            ),
          })),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([]),
      })),
    })),
  }
}

describe('EmailQueue', () => {
  it('exports EmailQueue class', async () => {
    const mod = await import('$lib/server/email/queue')
    expect(typeof mod.EmailQueue).toBe('function')
  })

  it('sends immediately without db', async () => {
    const { EmailQueue } = await import('$lib/server/email/queue')
    const client = createMockClient({ ok: true })
    const queue = new EmailQueue(client)

    await queue.enqueue({
      from: 'noreply@vibekit.com',
      html: '<p>Hello</p>',
      subject: 'Test',
      to: 'test@example.com',
    })

    expect(client.send).toHaveBeenCalledTimes(1)
    const sent = client.send.mock.calls[0][0]
    expect(sent.to).toBe('test@example.com')
    expect(sent.subject).toBe('Test')
  })

  it('persists to db and marks sent on success', async () => {
    const { EmailQueue } = await import('$lib/server/email/queue')
    const client = createMockClient({ ok: true })
    const db = createMockDb()
    const queue = new EmailQueue(
      client,
      db as unknown as import('$lib/server/services/types').AppDb
    )

    await queue.enqueue({
      from: 'noreply@vibekit.com',
      html: '<p>Hello</p>',
      subject: 'Test',
      to: 'test@example.com',
    })

    expect(client.send).toHaveBeenCalledTimes(1)
    expect(db.insert).toHaveBeenCalledTimes(1)
  })

  it('marks for retry on send failure', async () => {
    const { EmailQueue } = await import('$lib/server/email/queue')
    const client = {
      send: vi.fn().mockResolvedValue({ ok: false, reason: 'Rate limited' }),
    }
    const db = createMockDb()
    const queue = new EmailQueue(
      client,
      db as unknown as import('$lib/server/services/types').AppDb
    )

    await queue.enqueue(
      {
        from: 'noreply@vibekit.com',
        html: '<p>Fail</p>',
        subject: 'Test',
        to: 'fail@example.com',
      },
      { maxRetries: 3 }
    )

    expect(client.send).toHaveBeenCalledTimes(1)
    // Should have called update to set nextRetryAt
    expect(db.update).toHaveBeenCalled()
  })

  it('sendImmediate returns result directly', async () => {
    const { EmailQueue } = await import('$lib/server/email/queue')
    const client = createMockClient({ ok: true })
    const queue = new EmailQueue(client)

    const result = await queue.sendImmediate({
      from: 'noreply@vibekit.com',
      html: '<p>Direct</p>',
      subject: 'Direct',
      to: 'direct@example.com',
    })

    expect(result.ok).toBe(true)
    expect(client.send).toHaveBeenCalledTimes(1)
  })

  it('sendImmediate works with db too', async () => {
    const { EmailQueue } = await import('$lib/server/email/queue')
    const client = createMockClient({ ok: true })
    const db = createMockDb()
    const queue = new EmailQueue(
      client,
      db as unknown as import('$lib/server/services/types').AppDb
    )

    const result = await queue.sendImmediate({
      from: 'noreply@vibekit.com',
      html: '<p>Direct</p>',
      subject: 'Direct',
      to: 'direct@example.com',
    })

    expect(result.ok).toBe(true)
    // sendImmediate should NOT use db — it bypasses queue entirely
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('processPending returns stats', async () => {
    const { EmailQueue } = await import('$lib/server/email/queue')
    const client = createMockClient({ ok: true })
    const db = createMockDb()
    const queue = new EmailQueue(
      client,
      db as unknown as import('$lib/server/services/types').AppDb
    )

    const stats = await queue.processPending(
      db as unknown as import('$lib/server/services/types').AppDb
    )

    expect(stats).toHaveProperty('sent')
    expect(stats).toHaveProperty('failed')
    expect(stats).toHaveProperty('retried')
    expect(typeof stats.sent).toBe('number')
  })

  it('cleanup returns count of deleted records', async () => {
    const { EmailQueue } = await import('$lib/server/email/queue')
    const client = createMockClient({ ok: true })
    const db = createMockDb()
    const queue = new EmailQueue(
      client,
      db as unknown as import('$lib/server/services/types').AppDb
    )

    const count = await queue.cleanup(
      db as unknown as import('$lib/server/services/types').AppDb,
      30
    )

    expect(typeof count).toBe('number')
  })

  it('uses default maxRetries of 3 when not specified', async () => {
    const { EmailQueue } = await import('$lib/server/email/queue')
    const client = createMockClient({ ok: false, reason: 'fail' })
    const db = createMockDb()
    const queue = new EmailQueue(
      client,
      db as unknown as import('$lib/server/services/types').AppDb
    )

    await queue.enqueue({
      from: 'noreply@vibekit.com',
      html: '<p>Default</p>',
      subject: 'Test',
      to: 'default@test.com',
    })

    // Check that the insert was called with maxRetries: 3
    const insertCall = db.insert.mock.results[0]
    const valuesCall = insertCall.value
    expect(valuesCall.values).toHaveBeenCalledTimes(1)
    const valuesArg = valuesCall.values.mock.calls[0][0]
    expect(valuesArg.maxRetries).toBe(3)
  })
})
