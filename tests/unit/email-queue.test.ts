import { describe, expect, it, vi } from 'vitest'

function createMockClient(result: { ok: boolean } = { ok: true }) {
  return {
    send: vi.fn().mockResolvedValue(result),
  }
}

describe('EmailQueue', () => {
  it('exports EmailQueue class', async () => {
    const mod = await import('$lib/server/email/queue')
    expect(typeof mod.EmailQueue).toBe('function')
  })

  it('sends email successfully', async () => {
    const { EmailQueue } = await import('$lib/server/email/queue')
    const client = createMockClient({ ok: true })
    const queue = new EmailQueue(client)

    queue.enqueue({
      from: 'noreply@vibekit.com',
      html: '<p>Hello</p>',
      subject: 'Test',
      to: 'test@example.com',
    })

    // Wait for async processing
    await vi.waitFor(() => {
      expect(client.send).toHaveBeenCalledTimes(1)
    })

    const sent = client.send.mock.calls[0][0]
    expect(sent.to).toBe('test@example.com')
    expect(sent.subject).toBe('Test')
  })

  it('retries on failure', async () => {
    const { EmailQueue } = await import('$lib/server/email/queue')
    const client = {
      send: vi
        .fn()
        .mockRejectedValueOnce(new Error('SMTP error'))
        .mockResolvedValueOnce({ ok: true }),
    }
    vi.useFakeTimers()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const queue = new EmailQueue(client)

    queue.enqueue(
      {
        from: 'noreply@vibekit.com',
        html: '<p>Retry</p>',
        subject: 'Test',
        to: 'retry@example.com',
      },
      { maxRetries: 3 }
    )

    // First attempt fails immediately
    await vi.advanceTimersByTimeAsync(0)
    expect(client.send).toHaveBeenCalledTimes(1)

    // Advance past retry delay
    await vi.advanceTimersByTimeAsync(2000)
    expect(client.send).toHaveBeenCalledTimes(2)

    errorSpy.mockRestore()
    vi.useRealTimers()
  })

  it('calls onFinalFailure after max retries exceeded', async () => {
    const { EmailQueue } = await import('$lib/server/email/queue')
    const client = {
      send: vi.fn().mockRejectedValue(new Error('Permanent failure')),
    }
    vi.useFakeTimers()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onFinalFailure = vi.fn().mockResolvedValue(undefined)
    const queue = new EmailQueue(client)

    queue.enqueue(
      { from: 'noreply@vibekit.com', html: '<p>Fail</p>', subject: 'Test', to: 'fail@example.com' },
      { maxRetries: 2, onFinalFailure }
    )

    // Attempt 1
    await vi.advanceTimersByTimeAsync(0)
    expect(client.send).toHaveBeenCalledTimes(1)

    // Attempt 2 (retry 1)
    await vi.advanceTimersByTimeAsync(2000)
    expect(client.send).toHaveBeenCalledTimes(2)

    // onFinalFailure should have been called
    expect(onFinalFailure).toHaveBeenCalledTimes(1)

    errorSpy.mockRestore()
    vi.useRealTimers()
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

  it('processes queued emails in order', async () => {
    const { EmailQueue } = await import('$lib/server/email/queue')
    const client = createMockClient({ ok: true })
    const queue = new EmailQueue(client)

    queue.enqueue({ from: 'noreply@vibekit.com', html: '1', subject: 'First', to: 'a@test.com' })
    queue.enqueue({ from: 'noreply@vibekit.com', html: '2', subject: 'Second', to: 'b@test.com' })
    queue.enqueue({ from: 'noreply@vibekit.com', html: '3', subject: 'Third', to: 'c@test.com' })

    await vi.waitFor(() => {
      expect(client.send).toHaveBeenCalledTimes(3)
    })

    expect(client.send.mock.calls[0][0].subject).toBe('First')
    expect(client.send.mock.calls[1][0].subject).toBe('Second')
    expect(client.send.mock.calls[2][0].subject).toBe('Third')
  })

  it('logs error when send fails', async () => {
    const { EmailQueue } = await import('$lib/server/email/queue')
    const client = {
      send: vi.fn().mockRejectedValue(new Error('SMTP timeout')),
    }
    vi.useFakeTimers()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onFinalFailure = vi.fn().mockResolvedValue(undefined)
    const queue = new EmailQueue(client)

    queue.enqueue(
      { from: 'noreply@vibekit.com', html: '<p>Test</p>', subject: 'Test', to: 'log@test.com' },
      { maxRetries: 1, onFinalFailure }
    )

    await vi.advanceTimersByTimeAsync(0)

    expect(errorSpy).toHaveBeenCalledTimes(1)
    const logOutput = errorSpy.mock.calls[0][0] as string
    expect(logOutput).toContain('email.send_failed')

    errorSpy.mockRestore()
    vi.useRealTimers()
  })

  it('retries when send resolves with ok: false (non-exception failure)', async () => {
    const { EmailQueue } = await import('$lib/server/email/queue')
    const client = {
      send: vi.fn().mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: true }),
    }
    vi.useFakeTimers()
    const queue = new EmailQueue(client)

    queue.enqueue(
      {
        from: 'noreply@vibekit.com',
        html: '<p>Soft fail</p>',
        subject: 'Test',
        to: 'soft@test.com',
      },
      { maxRetries: 3 }
    )

    // First attempt returns ok: false
    await vi.advanceTimersByTimeAsync(0)
    expect(client.send).toHaveBeenCalledTimes(1)

    // Retry should happen after delay
    await vi.advanceTimersByTimeAsync(2000)
    expect(client.send).toHaveBeenCalledTimes(2)

    vi.useRealTimers()
  })

  it('calls onFinalFailure when send consistently returns ok: false', async () => {
    const { EmailQueue } = await import('$lib/server/email/queue')
    const client = {
      send: vi.fn().mockResolvedValue({ ok: false }),
    }
    vi.useFakeTimers()
    const onFinalFailure = vi.fn().mockResolvedValue(undefined)
    const queue = new EmailQueue(client)

    queue.enqueue(
      {
        from: 'noreply@vibekit.com',
        html: '<p>Permanent soft fail</p>',
        subject: 'Test',
        to: 'permsoft@test.com',
      },
      { maxRetries: 2, onFinalFailure }
    )

    // Attempt 1
    await vi.advanceTimersByTimeAsync(0)
    expect(client.send).toHaveBeenCalledTimes(1)

    // Attempt 2 (retry 1)
    await vi.advanceTimersByTimeAsync(2000)
    expect(client.send).toHaveBeenCalledTimes(2)

    // onFinalFailure should have been called
    expect(onFinalFailure).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
  })

  it('uses default maxRetries of 3 when not specified', async () => {
    const { EmailQueue } = await import('$lib/server/email/queue')
    const client = {
      send: vi.fn().mockRejectedValue(new Error('fail')),
    }
    vi.useFakeTimers()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onFinalFailure = vi.fn().mockResolvedValue(undefined)
    const queue = new EmailQueue(client)

    queue.enqueue(
      {
        from: 'noreply@vibekit.com',
        html: '<p>Default</p>',
        subject: 'Test',
        to: 'default@test.com',
      },
      { onFinalFailure }
    )

    // Attempt 1
    await vi.advanceTimersByTimeAsync(0)
    expect(client.send).toHaveBeenCalledTimes(1)

    // Attempt 2 (retry 1)
    await vi.advanceTimersByTimeAsync(2000)
    expect(client.send).toHaveBeenCalledTimes(2)

    // Attempt 3 (retry 2)
    await vi.advanceTimersByTimeAsync(4000)
    expect(client.send).toHaveBeenCalledTimes(3)

    // Should be final failure now (3 attempts = default maxRetries)
    expect(onFinalFailure).toHaveBeenCalledTimes(1)

    errorSpy.mockRestore()
    vi.useRealTimers()
  })
})
