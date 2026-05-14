import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('integration providers', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('exports all required providers', async () => {
    const { INTEGRATION_PROVIDERS } = await import('$lib/server/integrations/providers')
    const slugs = Object.keys(INTEGRATION_PROVIDERS)
    expect(slugs).toContain('discord')
    expect(slugs).toContain('github')
    expect(slugs).toContain('linear')
    expect(slugs).toContain('notion')
    expect(slugs).toContain('slack')
  })

  it('each provider has required fields', async () => {
    const { INTEGRATION_PROVIDERS } = await import('$lib/server/integrations/providers')
    for (const [slug, provider] of Object.entries(INTEGRATION_PROVIDERS)) {
      expect(provider.slug).toBe(slug)
      expect(provider.name).toBeTruthy()
      expect(provider.description).toBeTruthy()
      expect(provider.category).toBeTruthy()
      expect(provider.authorizeUrl).toMatch(/^https:\/\//)
      expect(provider.tokenUrl).toMatch(/^https:\/\//)
      expect(provider.scopes.length).toBeGreaterThan(0)
      expect(provider.clientIdEnvKey).toBeTruthy()
      expect(provider.clientSecretEnvKey).toBeTruthy()
      expect(provider.icon).toBeTruthy()
    }
  })

  describe('getProvider', () => {
    it('returns provider for known slug', async () => {
      const { getProvider } = await import('$lib/server/integrations/providers')
      const github = getProvider('github')
      expect(github?.name).toBe('GitHub')
      expect(github?.category).toBe('Development')
    })

    it('returns undefined for unknown slug', async () => {
      const { getProvider } = await import('$lib/server/integrations/providers')
      expect(getProvider('unknown')).toBeUndefined()
    })
  })

  describe('getAvailableProviders', () => {
    it('marks providers as configured when env vars are set', async () => {
      const { getAvailableProviders } = await import('$lib/server/integrations/providers')
      const result = getAvailableProviders({
        GITHUB_CLIENT_ID: 'gh_123',
        GITHUB_CLIENT_SECRET: 'gh_secret',
      })

      const github = result.find((p) => p.provider.slug === 'github')
      expect(github?.configured).toBe(true)

      const slack = result.find((p) => p.provider.slug === 'slack')
      expect(slack?.configured).toBe(false)
    })

    it('marks all as unconfigured when no env vars set', async () => {
      const { getAvailableProviders } = await import('$lib/server/integrations/providers')
      const result = getAvailableProviders({})
      expect(result.every((p) => !p.configured)).toBe(true)
    })

    it('returns all providers even when unconfigured', async () => {
      const { getAvailableProviders, INTEGRATION_PROVIDERS } =
        await import('$lib/server/integrations/providers')
      const result = getAvailableProviders({})
      expect(result.length).toBe(Object.keys(INTEGRATION_PROVIDERS).length)
    })
  })
})
