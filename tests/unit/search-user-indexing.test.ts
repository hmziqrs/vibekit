import type { AppDb } from '$lib/server/services/types'
import { afterEach, describe, expect, it, vi } from 'vitest'

function setupMocks(mockIndexUser: ReturnType<typeof vi.fn>) {
  vi.doMock('$lib/server/search/indexer', () => ({
    indexUser: mockIndexUser,
  }))
  vi.doMock('better-auth/minimal', () => ({
    betterAuth: vi.fn().mockReturnValue({ handler: vi.fn(), api: {} }),
  }))
  vi.doMock('better-auth/adapters/drizzle', () => ({
    drizzleAdapter: vi.fn().mockReturnValue({ provider: 'sqlite' }),
  }))
  vi.doMock('better-auth/plugins', () => ({
    twoFactor: vi.fn().mockReturnValue({ id: 'twoFactor' }),
  }))
  vi.doMock('better-auth/svelte-kit', () => ({
    sveltekitCookies: vi.fn().mockReturnValue({ id: 'sveltekit-cookies' }),
  }))
  vi.doMock('@better-auth/passkey', () => ({
    passkey: vi.fn().mockReturnValue({ id: 'passkey' }),
  }))
  vi.doMock('$app/server', () => ({
    getRequestEvent: vi.fn(),
  }))
  vi.doMock('$env/dynamic/private', () => ({
    env: {
      BETTER_AUTH_SECRET: 'test-secret-that-is-long-enough-for-validation',
      ORIGIN: 'http://localhost:5173',
    },
  }))
  vi.doMock('uuidv7', () => ({
    uuidv7: vi.fn().mockReturnValue('mock-uuid-v7'),
  }))
}

function createMockDb(): AppDb {
  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  } as unknown as AppDb
}

const mockUser = {
  createdAt: new Date(),
  email: 'test@test.com',
  emailVerified: true,
  id: 'new-user-123',
  image: null,
  name: 'Test',
  updatedAt: new Date(),
}

afterEach(() => {
  vi.resetModules()
})

describe('auth databaseHooks - user indexing', () => {
  it('createAuth configures databaseHooks with user.create.after that calls indexUser', async () => {
    const mockIndexUser = vi.fn().mockResolvedValue(undefined)
    setupMocks(mockIndexUser)

    const { createAuth } = await import('$lib/server/auth')
    const { betterAuth } = await import('better-auth/minimal')

    const mockDb = createMockDb()
    createAuth(mockDb)

    const mockBetterAuth = vi.mocked(betterAuth)
    // Use the LAST call (our test call with mockDb), not the first (module-level null)
    const authCallWithHooks = mockBetterAuth.mock.calls.findLast(
      (call) => call[0].databaseHooks?.user?.create?.after
    )
    expect(authCallWithHooks).toBeDefined()

    const afterHook = authCallWithHooks![0].databaseHooks!.user!.create!.after!
    await afterHook({ ...mockUser, id: 'new-user-123' }, null)

    expect(mockIndexUser).toHaveBeenCalledWith(mockDb, 'new-user-123')
  })

  it('databaseHooks.user.create.after catches indexUser errors gracefully', async () => {
    const mockIndexUser = vi.fn().mockRejectedValue(new Error('DB connection failed'))
    setupMocks(mockIndexUser)

    const { createAuth } = await import('$lib/server/auth')
    const { betterAuth } = await import('better-auth/minimal')

    createAuth(createMockDb())

    const mockBetterAuth = vi.mocked(betterAuth)
    const authCallWithHooks = mockBetterAuth.mock.calls.findLast(
      (call) => call[0].databaseHooks?.user?.create?.after
    )
    expect(authCallWithHooks).toBeDefined()

    const afterHook = authCallWithHooks![0].databaseHooks!.user!.create!.after!
    await expect(afterHook({ ...mockUser, id: 'new-user-456' }, null)).resolves.toBeUndefined()
  })

  it('databaseHooks is defined on auth config', async () => {
    setupMocks(vi.fn().mockResolvedValue(undefined))

    const { createAuth } = await import('$lib/server/auth')
    const { betterAuth } = await import('better-auth/minimal')

    createAuth(createMockDb())

    const mockBetterAuth = vi.mocked(betterAuth)
    const ourCall = mockBetterAuth.mock.calls.findLast(
      (call) => call[0].databaseHooks?.user?.create?.after
    )
    expect(ourCall).toBeDefined()
    const hooks = ourCall![0].databaseHooks!
    expect(hooks.user).toBeDefined()
    expect(hooks.user!.create).toBeDefined()
    expect(typeof hooks.user!.create!.after).toBe('function')
  })
})
