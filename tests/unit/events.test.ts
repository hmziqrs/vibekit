import type { DrizzleDb } from '$lib/server/services/types'
import { describe, expect, it, vi } from 'vitest'

// Mock audit module
vi.mock('$lib/server/audit', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}))

// Mock webhooks module
vi.mock('$lib/server/webhooks', () => ({
  dispatchWebhooksForEvent: vi.fn().mockResolvedValue(undefined),
}))

describe('events module', () => {
  it('exports emitEvent function', async () => {
    const mod = await import('$lib/server/events')
    expect(typeof mod.emitEvent).toBe('function')
  })

  it('writes audit log with correct input', async () => {
    const { emitEvent } = await import('$lib/server/events')
    const { writeAuditLog } = await import('$lib/server/audit')
    const db = {} as unknown as DrizzleDb

    await emitEvent(db, {
      action: 'user.created',
      entityId: 'user-1',
      entityType: 'user',
      userId: 'admin-1',
    })

    expect(writeAuditLog).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        action: 'user.created',
        entityId: 'user-1',
        entityType: 'user',
        userId: 'admin-1',
      })
    )
  })

  it('passes metadata to audit log', async () => {
    const { emitEvent } = await import('$lib/server/events')
    const { writeAuditLog } = await import('$lib/server/audit')
    const db = {} as unknown as DrizzleDb

    await emitEvent(db, {
      action: 'item.updated',
      entityId: 'item-1',
      entityType: 'item',
      metadata: { field: 'title', oldValue: 'A', newValue: 'B' },
      userId: 'user-1',
    })

    expect(writeAuditLog).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        metadata: { field: 'title', oldValue: 'A', newValue: 'B' },
      })
    )
  })

  it('dispatches webhooks for the event', async () => {
    const { emitEvent } = await import('$lib/server/events')
    const { dispatchWebhooksForEvent } = await import('$lib/server/webhooks')
    const db = {} as unknown as DrizzleDb

    await emitEvent(db, {
      action: 'blog.published',
      entityId: 'post-1',
      entityType: 'blog_post',
      userId: 'author-1',
    })

    expect(dispatchWebhooksForEvent).toHaveBeenCalledWith(
      db,
      {
        eventType: 'blog.published',
        data: expect.objectContaining({
          entityId: 'post-1',
          entityType: 'blog_post',
        }),
      },
      'author-1'
    )
  })

  it('does not throw when webhook dispatch fails', async () => {
    const { emitEvent } = await import('$lib/server/events')
    const { dispatchWebhooksForEvent } = await import('$lib/server/webhooks')
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    ;(dispatchWebhooksForEvent as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Connection refused')
    )

    const db = {} as unknown as DrizzleDb

    await expect(
      emitEvent(db, {
        action: 'test.event',
        entityId: 'e-1',
        entityType: 'test',
        userId: 'u-1',
      })
    ).resolves.toBeUndefined()

    expect(errorSpy).toHaveBeenCalledTimes(1)
    const logOutput = errorSpy.mock.calls[0][0] as string
    expect(logOutput).toContain('Webhook dispatch failed')
    errorSpy.mockRestore()
  })

  it('writes audit log even when webhook dispatch fails', async () => {
    const { emitEvent } = await import('$lib/server/events')
    const { writeAuditLog } = await import('$lib/server/audit')
    const { dispatchWebhooksForEvent } = await import('$lib/server/webhooks')
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    ;(dispatchWebhooksForEvent as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Timeout')
    )

    const db = {} as unknown as DrizzleDb

    await emitEvent(db, {
      action: 'user.deleted',
      entityId: 'user-1',
      entityType: 'user',
      userId: 'admin-1',
    })

    expect(writeAuditLog).toHaveBeenCalled()
    errorSpy.mockRestore()
  })
})
