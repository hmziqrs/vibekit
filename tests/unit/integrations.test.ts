import {
  INTEGRATION_PROVIDERS,
  getAvailableProviders,
  getProvider,
} from '$lib/server/integrations/providers'
import {
  INTEGRATION_PROVIDER_SLUGS,
  INTEGRATION_STATUSES,
  connectIntegrationSchema,
  integrationCallbackQuerySchema,
  listIntegrationsSchema,
} from '$lib/validators/integration'
import { describe, expect, it } from 'vitest'

describe('integration validators', () => {
  describe(connectIntegrationSchema, () => {
    it('validates empty input', () => {
      const result = connectIntegrationSchema.safeParse({})
      expect(result.success).toBeTruthy()
    })

    it('validates with organizationId', () => {
      const result = connectIntegrationSchema.safeParse({
        organizationId: 'org-123',
      })
      expect(result.success).toBeTruthy()
    })

    it('validates with redirectUrl', () => {
      const result = connectIntegrationSchema.safeParse({
        redirectUrl: 'https://example.com/callback',
      })
      expect(result.success).toBeTruthy()
    })

    it('rejects invalid redirectUrl', () => {
      const result = connectIntegrationSchema.safeParse({
        redirectUrl: 'not-a-url',
      })
      expect(result.success).toBeFalsy()
    })
  })

  describe(listIntegrationsSchema, () => {
    it('uses default values', () => {
      const result = listIntegrationsSchema.safeParse({})
      expect(result.success).toBeTruthy()
      if (result.success) {
        expect(result.data.limit).toBe(50)
      }
    })

    it('accepts all filters', () => {
      const result = listIntegrationsSchema.safeParse({
        limit: 25,
        provider: 'slack',
        status: 'active',
      })
      expect(result.success).toBeTruthy()
    })

    it('rejects invalid provider', () => {
      const result = listIntegrationsSchema.safeParse({
        provider: 'invalid',
      })
      expect(result.success).toBeFalsy()
    })

    it('rejects invalid status', () => {
      const result = listIntegrationsSchema.safeParse({
        status: 'invalid',
      })
      expect(result.success).toBeFalsy()
    })

    it('rejects limit over 100', () => {
      const result = listIntegrationsSchema.safeParse({ limit: 101 })
      expect(result.success).toBeFalsy()
    })
  })

  describe(integrationCallbackQuerySchema, () => {
    it('validates correct input', () => {
      const result = integrationCallbackQuerySchema.safeParse({
        code: 'abc123',
        state: 'xyz789',
      })
      expect(result.success).toBeTruthy()
    })

    it('rejects empty code', () => {
      const result = integrationCallbackQuerySchema.safeParse({
        code: '',
        state: 'xyz789',
      })
      expect(result.success).toBeFalsy()
    })

    it('rejects missing state', () => {
      const result = integrationCallbackQuerySchema.safeParse({
        code: 'abc123',
      })
      expect(result.success).toBeFalsy()
    })
  })
})

describe('integration provider registry', () => {
  it('has all expected providers', () => {
    const slugs = Object.keys(INTEGRATION_PROVIDERS)
    expect(slugs).toContain('slack')
    expect(slugs).toContain('github')
    expect(slugs).toContain('notion')
    expect(slugs).toContain('linear')
    expect(slugs).toContain('discord')
  })

  it('each provider has required fields', () => {
    for (const provider of Object.values(INTEGRATION_PROVIDERS)) {
      expect(provider.name).toBeTruthy()
      expect(provider.slug).toBeTruthy()
      expect(provider.description).toBeTruthy()
      expect(provider.category).toBeTruthy()
      expect(provider.authorizeUrl).toBeTruthy()
      expect(provider.tokenUrl).toBeTruthy()
      expect(provider.clientIdEnvKey).toBeTruthy()
      expect(provider.clientSecretEnvKey).toBeTruthy()
      expect(provider.scopes.length).toBeGreaterThan(0)
    }
  })

  it('getProvider returns correct provider', () => {
    const slack = getProvider('slack')
    expect(slack).toBeDefined()
    expect(slack?.name).toBe('Slack')
  })

  it('getProvider returns undefined for unknown slug', () => {
    expect(getProvider('unknown')).toBeUndefined()
  })

  it('getAvailableProviders returns all providers', () => {
    const result = getAvailableProviders({})
    expect(result).toHaveLength(5)
  })

  it('getAvailableProviders marks configured providers', () => {
    const env: Record<string, string | undefined> = {
      DISCORD_CLIENT_ID: 'test-id',
      DISCORD_CLIENT_SECRET: 'test-secret',
    }
    const result = getAvailableProviders(env)
    const discord = result.find((r) => r.provider.slug === 'discord')
    expect(discord?.configured).toBe(true)
    const slack = result.find((r) => r.provider.slug === 'slack')
    expect(slack?.configured).toBe(false)
  })
})

describe('integration provider slugs', () => {
  it('matches INTEGRATION_PROVIDER_SLUGS', () => {
    expect(INTEGRATION_PROVIDER_SLUGS).toStrictEqual([
      'discord',
      'github',
      'linear',
      'notion',
      'slack',
    ])
  })

  it('all provider slugs are in the enum', () => {
    for (const slug of Object.keys(INTEGRATION_PROVIDERS)) {
      expect(INTEGRATION_PROVIDER_SLUGS).toContain(slug)
    }
  })
})

describe('integration statuses', () => {
  it('has expected statuses', () => {
    expect(INTEGRATION_STATUSES).toContain('active')
    expect(INTEGRATION_STATUSES).toContain('disconnected')
    expect(INTEGRATION_STATUSES).toContain('error')
    expect(INTEGRATION_STATUSES).toContain('expired')
  })
})
