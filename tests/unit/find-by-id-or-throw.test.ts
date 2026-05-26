import { findByIdOrThrow } from '$lib/server/db'
import { user } from '$lib/server/db/schema'
import { isNull } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'

import { createMockDb } from '../helpers/mock-db'

describe('findByIdOrThrow', () => {
  describe('found', () => {
    it('returns the row when found', async () => {
      const mockUser = { id: 'user-1', name: 'Test', email: 'test@test.com' }
      const { db } = createMockDb({ getResult: mockUser })

      const result = await findByIdOrThrow(db, user, 'user-1')

      expect(result).toBe(mockUser)
    })

    it('returns row with all columns', async () => {
      const mockUser = { id: 'user-1', name: 'Test', email: 'test@test.com', role: 'admin' }
      const { db } = createMockDb({ getResult: mockUser })

      const result = await findByIdOrThrow(db, user, 'user-1')

      expect(result.id).toBe('user-1')
      expect(result.name).toBe('Test')
      expect(result.email).toBe('test@test.com')
      expect(result.role).toBe('admin')
    })

    it('calls select().from().where().get() chain', async () => {
      const mockUser = { id: 'user-1', name: 'Test' }
      const { db, mocks } = createMockDb({ getResult: mockUser })

      await findByIdOrThrow(db, user, 'user-1')

      expect(mocks.selectFn).toHaveBeenCalled()
      expect(mocks.fromFn).toHaveBeenCalledWith(user)
      expect(mocks.whereFn).toHaveBeenCalled()
      expect(mocks.getFn).toHaveBeenCalled()
    })

    it('passes id to where condition', async () => {
      const mockUser = { id: 'user-1', name: 'Test' }
      const { db, mocks } = createMockDb({ getResult: mockUser })

      await findByIdOrThrow(db, user, 'user-1')

      const whereArg = mocks.whereFn.mock.calls[0][0]
      expect(whereArg).toBeDefined()
    })
  })

  describe('not found', () => {
    it('throws NotFoundError when row is null', async () => {
      const { db } = createMockDb({ getResult: null })

      await expect(findByIdOrThrow(db, user, 'nonexistent')).rejects.toThrow('Not found')
    })

    it('throws NotFoundError when row is undefined', async () => {
      const { db } = createMockDb({ getResult: undefined })

      await expect(findByIdOrThrow(db, user, 'nonexistent')).rejects.toThrow('Not found')
    })

    it('throws with custom message', async () => {
      const { db } = createMockDb({ getResult: null })

      await expect(
        findByIdOrThrow(db, user, 'nonexistent', { message: 'User not found' })
      ).rejects.toThrow('User not found')
    })
  })

  describe('with extra where conditions', () => {
    it('passes extra conditions to query', async () => {
      const mockUser = { id: 'user-1', name: 'Test' }
      const { db, mocks } = createMockDb({ getResult: mockUser })

      const result = await findByIdOrThrow(db, user, 'user-1', {
        where: isNull(user.deletedAt),
      })

      expect(result).toBe(mockUser)
      expect(mocks.whereFn).toHaveBeenCalledTimes(1)
    })

    it('throws NotFoundError with extra conditions when not found', async () => {
      const { db } = createMockDb({ getResult: null })

      await expect(
        findByIdOrThrow(db, user, 'nonexistent', {
          where: isNull(user.deletedAt),
        })
      ).rejects.toThrow('Not found')
    })

    it('throws with custom message and extra conditions', async () => {
      const { db } = createMockDb({ getResult: null })

      await expect(
        findByIdOrThrow(db, user, 'nonexistent', {
          message: 'Active user not found',
          where: isNull(user.deletedAt),
        })
      ).rejects.toThrow('Active user not found')
    })
  })

  describe('edge cases', () => {
    it('handles empty string id', async () => {
      const { db } = createMockDb({ getResult: null })

      await expect(findByIdOrThrow(db, user, '')).rejects.toThrow('Not found')
    })

    it('handles UUID format id', async () => {
      const uuid = '01901234-5678-7abc-def0-123456789abc'
      const mockUser = { id: uuid, name: 'Test' }
      const { db } = createMockDb({ getResult: mockUser })

      const result = await findByIdOrThrow(db, user, uuid)

      expect(result.id).toBe(uuid)
    })

    it('handles special characters in id', async () => {
      const { db } = createMockDb({ getResult: null })

      await expect(findByIdOrThrow(db, user, "'; DROP TABLE users;--")).rejects.toThrow('Not found')
    })

    it('handles very long id string', async () => {
      const longId = 'a'.repeat(1000)
      const { db } = createMockDb({ getResult: null })

      await expect(findByIdOrThrow(db, user, longId)).rejects.toThrow('Not found')
    })
  })
})
