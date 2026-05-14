import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('arctic', () => ({
  generateCodeVerifier: vi.fn().mockReturnValue('mock-code-verifier'),
  generateState: vi.fn().mockReturnValue('mock-state-value'),
}))

function createMockDb() {
  const store = new Map<string, { createdAt: Date; data: Record<string, unknown> }>()
  let idCounter = 0

  return {
    insert: vi.fn().mockImplementation((_table: unknown) => ({
      values: vi.fn().mockImplementation((data: { data: Record<string, unknown>; id: string }) => {
        store.set(data.id, { createdAt: new Date(), data: data.data })
        idCounter++
        return { returning: vi.fn() }
      }),
    })),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation((condition: unknown) => {
          if (typeof condition === 'object' && condition !== null) {
            const entries = [...store.entries()]
            if (entries.length > 0) {
              return [entries[0][1] as unknown]
            }
          }
          return []
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockImplementation(() => ({ meta: { changes: 1 } })),
    }),
    _store: store,
  }
}

describe('oauth module', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('exports all required functions', async () => {
    const mod = await import('$lib/server/integrations/oauth')
    expect(typeof mod.generateOAuthState).toBe('function')
    expect(typeof mod.consumeOAuthState).toBe('function')
    expect(typeof mod.getAuthorizationUrl).toBe('function')
    expect(typeof mod.exchangeCodeForTokens).toBe('function')
    expect(typeof mod.generateOAuthParams).toBe('function')
    expect(typeof mod.cleanupExpiredOAuthStates).toBe('function')
  })
})

describe('generateOAuthState', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('stores state data and returns state string', async () => {
    const { generateOAuthState } = await import('$lib/server/integrations/oauth')
    const db = createMockDb() as unknown as Parameters<typeof generateOAuthState>[0]

    const state = await generateOAuthState(db, {
      codeVerifier: 'verifier-123',
      provider: 'github',
      redirectUrl: '/settings',
      userId: 'user-1',
    })

    expect(state).toBe('mock-state-value')
    expect(db.insert).toHaveBeenCalled()
  })
})

describe('consumeOAuthState', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns null for unknown state', async () => {
    const { consumeOAuthState } = await import('$lib/server/integrations/oauth')
    const db = createMockDb() as unknown as Parameters<typeof consumeOAuthState>[0]

    const data = await consumeOAuthState(db, 'nonexistent-state')
    expect(data).toBeNull()
  })
})

describe('getAuthorizationUrl', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('throws for unknown provider', async () => {
    const { getAuthorizationUrl } = await import('$lib/server/integrations/oauth')

    expect(() =>
      getAuthorizationUrl('unknown-provider', 'state-123', 'verifier', {}, 'https://app.com')
    ).toThrow('Unknown provider')
  })

  it('throws for missing client ID', async () => {
    const { getAuthorizationUrl } = await import('$lib/server/integrations/oauth')

    expect(() =>
      getAuthorizationUrl('github', 'state-123', 'verifier', {}, 'https://app.com')
    ).toThrow('Missing client ID')
  })

  it('builds correct authorization URL', async () => {
    const { getAuthorizationUrl } = await import('$lib/server/integrations/oauth')

    const url = getAuthorizationUrl(
      'github',
      'test-state',
      'test-verifier',
      { GITHUB_CLIENT_ID: 'client-123' },
      'https://app.com'
    )

    expect(url.toString()).toContain('https://github.com/login/oauth/authorize')
    expect(url.searchParams.get('client_id')).toBe('client-123')
    expect(url.searchParams.get('state')).toBe('test-state')
    expect(url.searchParams.get('code_challenge')).toBe('test-verifier')
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://app.com/api/integrations/callback/github'
    )
  })

  it('includes scopes from provider', async () => {
    const { getAuthorizationUrl } = await import('$lib/server/integrations/oauth')

    const url = getAuthorizationUrl(
      'github',
      'state',
      'verifier',
      { GITHUB_CLIENT_ID: 'client-123' },
      'https://app.com'
    )

    expect(url.searchParams.get('scope')).toBe('repo read:org user:email')
  })
})

describe('exchangeCodeForTokens', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('throws for unknown provider', async () => {
    const { exchangeCodeForTokens } = await import('$lib/server/integrations/oauth')

    await expect(
      exchangeCodeForTokens('unknown', 'code', 'verifier', {}, 'https://app.com')
    ).rejects.toThrow('Unknown provider')
  })

  it('throws for missing credentials', async () => {
    const { exchangeCodeForTokens } = await import('$lib/server/integrations/oauth')

    await expect(
      exchangeCodeForTokens('github', 'code', 'verifier', {}, 'https://app.com')
    ).rejects.toThrow('Missing credentials')
  })

  it('throws on non-ok response from token endpoint', async () => {
    const { exchangeCodeForTokens } = await import('$lib/server/integrations/oauth')

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'invalid_grant',
      })
    )

    await expect(
      exchangeCodeForTokens(
        'github',
        'bad-code',
        'verifier',
        { GITHUB_CLIENT_ID: 'id', GITHUB_CLIENT_SECRET: 'secret' },
        'https://app.com'
      )
    ).rejects.toThrow('Token exchange failed')
  })

  it('returns tokens on success', async () => {
    const { exchangeCodeForTokens } = await import('$lib/server/integrations/oauth')

    const mockTokens = {
      access_token: 'ghu_123',
      expires_in: 3600,
      refresh_token: 'ghr_456',
      scope: 'repo',
      token_type: 'bearer',
    }

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => mockTokens,
        ok: true,
      })
    )

    const result = (await exchangeCodeForTokens(
      'github',
      'valid-code',
      'verifier',
      { GITHUB_CLIENT_ID: 'id', GITHUB_CLIENT_SECRET: 'secret' },
      'https://app.com'
    )) as Record<string, unknown>

    // Function casts JSON response but doesn't transform keys
    expect(result.access_token).toBe('ghu_123')
    expect(result.expires_in).toBe(3600)
    expect(result.refresh_token).toBe('ghr_456')
    expect(result.scope).toBe('repo')
  })

  it('sends correct request body', async () => {
    const { exchangeCodeForTokens } = await import('$lib/server/integrations/oauth')
    const mockFetch = vi.fn().mockResolvedValue({
      json: async () => ({ access_token: 'token' }),
      ok: true,
    })
    vi.stubGlobal('fetch', mockFetch)

    await exchangeCodeForTokens(
      'github',
      'auth-code',
      'verifier-xyz',
      { GITHUB_CLIENT_ID: 'my-id', GITHUB_CLIENT_SECRET: 'my-secret' },
      'https://app.com'
    )

    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe('https://github.com/login/oauth/access_token')
    expect(options.method).toBe('POST')
    const body = options.body as URLSearchParams
    expect(body.get('client_id')).toBe('my-id')
    expect(body.get('client_secret')).toBe('my-secret')
    expect(body.get('code')).toBe('auth-code')
    expect(body.get('code_verifier')).toBe('verifier-xyz')
    expect(body.get('grant_type')).toBe('authorization_code')
  })
})

describe('generateOAuthParams', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns codeVerifier and state', async () => {
    const { generateOAuthParams } = await import('$lib/server/integrations/oauth')

    const params = generateOAuthParams()
    expect(params.codeVerifier).toBe('mock-code-verifier')
    expect(params.state).toBe('mock-state-value')
  })
})
