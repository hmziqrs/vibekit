import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import { createMockDb } from '../helpers/mock-db'

type MockDb = ReturnType<typeof createMockDb>['db'] & {
  _insertFn: Mock
  _setFn: Mock
}

vi.mock('$lib/server/db/schema', () => ({
  webhookDelivery: {
    attemptCount: 'attemptCount',
    createdAt: 'createdAt',
    endpointId: 'endpointId',
    eventType: 'eventType',
    id: 'id',
    nextRetryAt: 'nextRetryAt',
    payload: 'payload',
    responseBody: 'responseBody',
    status: 'status',
    statusCode: 'statusCode',
    updatedAt: 'updatedAt',
  },
  webhookEndpoint: {
    active: 'active',
    createdAt: 'createdAt',
    description: 'description',
    events: 'events',
    id: 'id',
    secret: 'secret',
    updatedAt: 'updatedAt',
    url: 'url',
    userId: 'userId',
  },
}))

vi.mock('$lib/server/uuid', () => ({
  uuid: () => 'test-uuid-wh',
}))

describe('webhooks', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  function createMockDbWebhooks(endpoints: Record<string, unknown>[] = []): MockDb {
    const { db, mocks } = createMockDb({ allResult: endpoints })
    return {
      ...db,
      _insertFn: mocks.insertFn,
      _setFn: mocks.setFn,
    } as unknown as MockDb
  }

  function makeEndpoint(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      active: true,
      description: null,
      events: ['item.created'],
      id: 'ep-1',
      secret: 'whsec_testsecret',
      url: 'https://example.com/webhook',
      userId: 'user-1',
      ...overrides,
    }
  }

  describe('createWebhookEndpoint', () => {
    it('creates endpoint with generated secret', async () => {
      const { createWebhookEndpoint } = await import('$lib/server/webhooks')
      const db = createMockDbWebhooks()
      const result = await createWebhookEndpoint(db, 'user-1', {
        events: ['item.created'],
        url: 'https://example.com/hook',
      })
      expect(result.id).toBe('test-uuid-wh')
      expect(result.secret).toMatch(/^whsec_/)
      expect(result.url).toBe('https://example.com/hook')
      expect(db.insert).toHaveBeenCalled()
    })

    it('stores optional description', async () => {
      const { createWebhookEndpoint } = await import('$lib/server/webhooks')
      const db = createMockDbWebhooks()
      await createWebhookEndpoint(db, 'user-1', {
        description: 'My webhook',
        events: ['item.created'],
        url: 'https://example.com/hook',
      })
      expect(db.insert).toHaveBeenCalled()
    })
  })

  describe('listWebhookEndpoints', () => {
    it('returns endpoints for user', async () => {
      const { listWebhookEndpoints } = await import('$lib/server/webhooks')
      const endpoints = [makeEndpoint(), makeEndpoint({ id: 'ep-2' })]
      const setFn = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) })
      const db = {
        insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue(endpoints),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({ set: setFn }),
        delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
      } as never
      const result = await listWebhookEndpoints(db, 'user-1')
      expect(result).toHaveLength(2)
    })
  })

  describe('updateWebhookEndpoint', () => {
    it('updates and returns endpoint id', async () => {
      const { updateWebhookEndpoint } = await import('$lib/server/webhooks')
      const db = createMockDbWebhooks([makeEndpoint()])
      const result = await updateWebhookEndpoint(db, 'ep-1', 'user-1', {
        url: 'https://new.example.com/hook',
      })
      expect(result).toEqual({ id: 'ep-1' })
      expect(db._setFn).toHaveBeenCalled()
    })

    it('returns null when endpoint not found', async () => {
      const { updateWebhookEndpoint } = await import('$lib/server/webhooks')
      const db = createMockDbWebhooks([])
      expect(
        await updateWebhookEndpoint(db, 'missing', 'user-1', { url: 'https://new.url' })
      ).toBeNull()
    })
  })

  describe('deleteWebhookEndpoint', () => {
    it('deletes endpoint', async () => {
      const { deleteWebhookEndpoint } = await import('$lib/server/webhooks')
      const db = createMockDbWebhooks()
      await deleteWebhookEndpoint(db, 'ep-1', 'user-1')
      expect(db.delete).toHaveBeenCalled()
    })
  })

  describe('getWebhookEndpoint', () => {
    it('returns endpoint when found', async () => {
      const { getWebhookEndpoint } = await import('$lib/server/webhooks')
      const db = createMockDbWebhooks([makeEndpoint()])
      const result = await getWebhookEndpoint(db, 'ep-1', 'user-1')
      expect(result).not.toBeNull()
      expect(result?.id).toBe('ep-1')
    })

    it('returns null when not found', async () => {
      const { getWebhookEndpoint } = await import('$lib/server/webhooks')
      const db = createMockDbWebhooks([])
      expect(await getWebhookEndpoint(db, 'missing', 'user-1')).toBeNull()
    })
  })

  describe('deliverWebhook', () => {
    it('returns success on 2xx response', async () => {
      const { deliverWebhook } = await import('$lib/server/webhooks')
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('OK', { status: 200 }))
      const db = createMockDbWebhooks()
      const result = await deliverWebhook(
        db,
        { id: 'ep-1', secret: 'whsec_testsecret', url: 'https://example.com/hook' },
        'item.created',
        { itemId: '123' }
      )
      expect(result.status).toBe('success')
      expect(result.id).toBe('test-uuid-wh')
    })

    it('sends correct headers', async () => {
      const { deliverWebhook } = await import('$lib/server/webhooks')
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(new Response('OK', { status: 200 }))
      const db = createMockDbWebhooks()
      await deliverWebhook(
        db,
        { id: 'ep-1', secret: 'whsec_testsecret', url: 'https://example.com/hook' },
        'item.created',
        { itemId: '123' }
      )
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://example.com/hook',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Webhook-ID': 'test-uuid-wh',
          }),
        })
      )
    })

    it('schedules retry on non-2xx response', async () => {
      const { deliverWebhook } = await import('$lib/server/webhooks')
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('Internal Server Error', { status: 500 })
      )
      const db = createMockDbWebhooks()
      const result = await deliverWebhook(
        db,
        { id: 'ep-1', secret: 'whsec_testsecret', url: 'https://example.com/hook' },
        'item.created',
        { itemId: '123' }
      )
      expect(result.status).toBe('retrying')
    })

    it('schedules retry on network error', async () => {
      const { deliverWebhook } = await import('$lib/server/webhooks')
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'))
      const db = createMockDbWebhooks()
      const result = await deliverWebhook(
        db,
        { id: 'ep-1', secret: 'whsec_testsecret', url: 'https://example.com/hook' },
        'item.created',
        { itemId: '123' }
      )
      expect(result.status).toBe('retrying')
    })

    it('creates delivery record in database', async () => {
      const { deliverWebhook } = await import('$lib/server/webhooks')
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('OK', { status: 200 }))
      const db = createMockDbWebhooks()
      await deliverWebhook(
        db,
        { id: 'ep-1', secret: 'whsec_testsecret', url: 'https://example.com/hook' },
        'item.created',
        { itemId: '123' }
      )
      expect(db.insert).toHaveBeenCalled()
    })
  })

  describe('dispatchWebhooksForEvent', () => {
    it('dispatches to matching endpoints', async () => {
      const { dispatchWebhooksForEvent } = await import('$lib/server/webhooks')
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('OK', { status: 200 }))
      const endpoints = [
        makeEndpoint({ events: ['item.created'] }),
        makeEndpoint({ id: 'ep-2', events: ['item.updated'] }),
      ]
      const db = createMockDbWebhooks(endpoints)
      const count = await dispatchWebhooksForEvent(db, { eventType: 'item.created', data: { itemId: '123' } })
      expect(count).toBe(1) // Only one endpoint matches
    })

    it('matches wildcard subscriptions', async () => {
      const { dispatchWebhooksForEvent } = await import('$lib/server/webhooks')
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('OK', { status: 200 }))
      const endpoints = [
        makeEndpoint({ events: ['*'] }),
        makeEndpoint({ id: 'ep-2', events: ['item.updated'] }),
      ]
      const db = createMockDbWebhooks(endpoints)
      const count = await dispatchWebhooksForEvent(db, { eventType: 'item.created', data: { itemId: '123' } })
      expect(count).toBe(1) // Only wildcard matches
    })
  })

  describe('retryWebhookDelivery', () => {
    it('retries a failed delivery', async () => {
      const { retryWebhookDelivery } = await import('$lib/server/webhooks')
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('OK', { status: 200 }))
      const delivery = {
        attemptCount: 1,
        endpointId: 'ep-1',
        eventType: 'item.created',
        id: 'del-1',
        payload: { itemId: '123' },
        status: 'retrying',
      }
      const endpoint = makeEndpoint()
      let selectCount = 0
      const db = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockImplementation(() => {
              selectCount++
              return selectCount === 1 ? Promise.resolve([delivery]) : Promise.resolve([endpoint])
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
        }),
      } as never
      const result = await retryWebhookDelivery(db, 'del-1')
      expect(result).not.toBeNull()
      expect(result?.status).toBe('success')
    })

    it('returns null for successful delivery', async () => {
      const { retryWebhookDelivery } = await import('$lib/server/webhooks')
      const delivery = {
        attemptCount: 1,
        endpointId: 'ep-1',
        eventType: 'item.created',
        id: 'del-1',
        payload: {},
        status: 'success',
      }
      const db = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([delivery]) }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
        }),
      } as never
      expect(await retryWebhookDelivery(db, 'del-1')).toBeNull()
    })

    it('returns null when delivery not found', async () => {
      const { retryWebhookDelivery } = await import('$lib/server/webhooks')
      const db = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
        }),
      } as never
      expect(await retryWebhookDelivery(db, 'missing')).toBeNull()
    })
  })

  describe('listWebhookDeliveries', () => {
    it('returns deliveries for endpoint', async () => {
      const { listWebhookDeliveries } = await import('$lib/server/webhooks')
      const deliveries = [
        { id: 'del-1', status: 'success' },
        { id: 'del-2', status: 'failed' },
      ]
      const db = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(deliveries),
              }),
            }),
          }),
        }),
      } as never
      const result = await listWebhookDeliveries(db, 'ep-1')
      expect(result).toHaveLength(2)
    })
  })

  describe('listAllDeliveries', () => {
    it('returns deliveries with filters', async () => {
      const { listAllDeliveries } = await import('$lib/server/webhooks')
      const deliveries = [{ id: 'del-1', status: 'success' }]
      const db = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(deliveries),
            }),
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(deliveries),
              }),
            }),
          }),
        }),
      } as never
      const result = await listAllDeliveries(db, { status: 'success' })
      expect(result).toHaveLength(1)
    })
  })

  describe('sendTestWebhook', () => {
    it('sends test event via deliverWebhook', async () => {
      const { sendTestWebhook } = await import('$lib/server/webhooks')
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('OK', { status: 200 }))
      const db = createMockDbWebhooks()
      const result = await sendTestWebhook(db, {
        id: 'ep-1',
        secret: 'whsec_testsecret',
        url: 'https://example.com/hook',
      })
      expect(result.status).toBe('success')
    })
  })

  describe('hmacSign', () => {
    it('produces consistent signature', async () => {
      const { hmacSign } = await import('$lib/server/webhooks')
      const sig1 = await hmacSign('test-payload', 'whsec_testsecret', 12345)
      const sig2 = await hmacSign('test-payload', 'whsec_testsecret', 12345)
      expect(sig1).toBe(sig2)
    })

    it('produces different signatures for different payloads', async () => {
      const { hmacSign } = await import('$lib/server/webhooks')
      const sig1 = await hmacSign('payload-1', 'whsec_testsecret', 12345)
      const sig2 = await hmacSign('payload-2', 'whsec_testsecret', 12345)
      expect(sig1).not.toBe(sig2)
    })
  })

  describe('generateSecret', () => {
    it('generates unique secrets', async () => {
      const { generateSecret } = await import('$lib/server/webhooks')
      const s1 = generateSecret()
      const s2 = generateSecret()
      expect(s1).toMatch(/^whsec_/)
      expect(s2).toMatch(/^whsec_/)
      expect(s1).not.toBe(s2)
    })
  })
})
