import {
  INTEGRATION_PROVIDERS,
  INTEGRATION_STATUS,
  getAvailableProviders,
  getProvider,
} from '$lib/server/integrations/providers'
import { describe, expect, it } from 'vitest'

const REQUIRED_FIELDS = [
  'name',
  'slug',
  'description',
  'icon',
  'category',
  'authorizeUrl',
  'tokenUrl',
  'clientIdEnvKey',
  'clientSecretEnvKey',
  'scopes',
] as const

const VALID_CATEGORIES = [
  'Communication',
  'Development',
  'Project Management',
  'Productivity',
  'Analytics',
  'CRM',
  'DevOps',
  'Monitoring',
  'Storage',
  'AI',
]

describe('INTEGRATION_PROVIDERS', () => {
  it('is a non-empty object', () => {
    expect(INTEGRATION_PROVIDERS).toBeDefined()
    expect(typeof INTEGRATION_PROVIDERS).toBe('object')
    expect(Object.keys(INTEGRATION_PROVIDERS).length).toBeGreaterThan(0)
  })

  it('has no duplicate provider slugs', () => {
    const slugs = Object.values(INTEGRATION_PROVIDERS).map((p) => p.slug)
    const uniqueSlugs = new Set(slugs)
    expect(slugs.length).toBe(uniqueSlugs.size)
  })

  it('has record keys matching provider slugs', () => {
    for (const [key, provider] of Object.entries(INTEGRATION_PROVIDERS)) {
      expect(provider.slug).toBe(key)
    }
  })

  it('every provider has all required fields', () => {
    for (const provider of Object.values(INTEGRATION_PROVIDERS)) {
      for (const field of REQUIRED_FIELDS) {
        expect(provider, `Provider "${provider.slug}" missing field "${field}"`).toHaveProperty(
          field
        )
      }
    }
  })

  it('every provider has a non-empty name', () => {
    for (const provider of Object.values(INTEGRATION_PROVIDERS)) {
      expect(provider.name, `Provider "${provider.slug}" has empty name`).toBeTruthy()
    }
  })

  it('every provider has a non-empty description', () => {
    for (const provider of Object.values(INTEGRATION_PROVIDERS)) {
      expect(provider.description, `Provider "${provider.slug}" has empty description`).toBeTruthy()
    }
  })

  it('every provider has a non-empty icon', () => {
    for (const provider of Object.values(INTEGRATION_PROVIDERS)) {
      expect(provider.icon, `Provider "${provider.slug}" has empty icon`).toBeTruthy()
    }
  })

  it('every provider has a valid category', () => {
    for (const provider of Object.values(INTEGRATION_PROVIDERS)) {
      expect(
        VALID_CATEGORIES,
        `Provider "${provider.slug}" has invalid category "${provider.category}"`
      ).toContain(provider.category)
    }
  })

  it('every provider has scopes as an array of strings', () => {
    for (const provider of Object.values(INTEGRATION_PROVIDERS)) {
      expect(Array.isArray(provider.scopes)).toBe(true)
      expect(provider.scopes.length).toBeGreaterThan(0)
      for (const scope of provider.scopes) {
        expect(typeof scope, `Provider "${provider.slug}" has non-string scope: ${scope}`).toBe(
          'string'
        )
        expect(scope.length).toBeGreaterThan(0)
      }
    }
  })

  it('every provider has unique scopes (no duplicates within a provider)', () => {
    for (const provider of Object.values(INTEGRATION_PROVIDERS)) {
      const uniqueScopes = new Set(provider.scopes)
      expect(provider.scopes.length, `Provider "${provider.slug}" has duplicate scopes`).toBe(
        uniqueScopes.size
      )
    }
  })

  it('every provider has a valid authorizeUrl starting with https', () => {
    for (const provider of Object.values(INTEGRATION_PROVIDERS)) {
      expect(
        provider.authorizeUrl.startsWith('https://'),
        `Provider "${provider.slug}" has invalid authorizeUrl: ${provider.authorizeUrl}`
      ).toBe(true)
    }
  })

  it('every provider has a valid tokenUrl starting with https', () => {
    for (const provider of Object.values(INTEGRATION_PROVIDERS)) {
      expect(
        provider.tokenUrl.startsWith('https://'),
        `Provider "${provider.slug}" has invalid tokenUrl: ${provider.tokenUrl}`
      ).toBe(true)
    }
  })

  it('every provider has clientIdEnvKey ending with _CLIENT_ID', () => {
    for (const provider of Object.values(INTEGRATION_PROVIDERS)) {
      expect(provider.clientIdEnvKey).toMatch(/_CLIENT_ID$/)
    }
  })

  it('every provider has clientSecretEnvKey ending with _CLIENT_SECRET', () => {
    for (const provider of Object.values(INTEGRATION_PROVIDERS)) {
      expect(provider.clientSecretEnvKey).toMatch(/_CLIENT_SECRET$/)
    }
  })

  it('env keys follow the pattern PROVIDER_CLIENT_ID and PROVIDER_CLIENT_SECRET', () => {
    for (const provider of Object.values(INTEGRATION_PROVIDERS)) {
      const prefix = provider.slug.toUpperCase()
      expect(provider.clientIdEnvKey).toBe(`${prefix}_CLIENT_ID`)
      expect(provider.clientSecretEnvKey).toBe(`${prefix}_CLIENT_SECRET`)
    }
  })
})

describe('individual providers', () => {
  it('discord has expected values', () => {
    const discord = INTEGRATION_PROVIDERS.discord
    expect(discord).toBeDefined()
    expect(discord.name).toBe('Discord')
    expect(discord.category).toBe('Communication')
    expect(discord.authorizeUrl).toContain('discord.com')
    expect(discord.scopes).toContain('identify')
  })

  it('github has expected values', () => {
    const github = INTEGRATION_PROVIDERS.github
    expect(github).toBeDefined()
    expect(github.name).toBe('GitHub')
    expect(github.category).toBe('Development')
    expect(github.authorizeUrl).toContain('github.com')
    expect(github.scopes).toContain('repo')
  })

  it('linear has expected values', () => {
    const linear = INTEGRATION_PROVIDERS.linear
    expect(linear).toBeDefined()
    expect(linear.name).toBe('Linear')
    expect(linear.category).toBe('Project Management')
    expect(linear.authorizeUrl).toContain('linear.app')
    expect(linear.scopes).toContain('read')
  })

  it('notion has expected values', () => {
    const notion = INTEGRATION_PROVIDERS.notion
    expect(notion).toBeDefined()
    expect(notion.name).toBe('Notion')
    expect(notion.category).toBe('Productivity')
    expect(notion.authorizeUrl).toContain('notion.com')
    expect(notion.scopes).toContain('read_content')
  })

  it('slack has expected values', () => {
    const slack = INTEGRATION_PROVIDERS.slack
    expect(slack).toBeDefined()
    expect(slack.name).toBe('Slack')
    expect(slack.category).toBe('Communication')
    expect(slack.authorizeUrl).toContain('slack.com')
    expect(slack.scopes).toContain('chat:write')
  })
})

describe('getProvider', () => {
  it('returns the correct provider for a known slug', () => {
    const result = getProvider('github')
    expect(result).toBeDefined()
    expect(result!.slug).toBe('github')
    expect(result!.name).toBe('GitHub')
  })

  it('returns undefined for an unknown slug', () => {
    expect(getProvider('nonexistent')).toBeUndefined()
  })

  it('returns undefined for empty string', () => {
    expect(getProvider('')).toBeUndefined()
  })

  it('is case-sensitive', () => {
    expect(getProvider('GitHub')).toBeUndefined()
    expect(getProvider('GITHUB')).toBeUndefined()
    expect(getProvider('github')).toBeDefined()
  })

  it('returns a provider for every slug in INTEGRATION_PROVIDERS', () => {
    for (const slug of Object.keys(INTEGRATION_PROVIDERS)) {
      expect(getProvider(slug), `getProvider("${slug}") returned undefined`).toBeDefined()
    }
  })
})

describe('getAvailableProviders', () => {
  it('returns all providers when no env vars are set', () => {
    const result = getAvailableProviders({})
    expect(result).toHaveLength(Object.keys(INTEGRATION_PROVIDERS).length)
  })

  it('returns providers with configured=false when env vars are missing', () => {
    const result = getAvailableProviders({})
    for (const entry of result) {
      expect(entry.configured).toBe(false)
      expect(entry.provider).toBeDefined()
    }
  })

  it('marks a provider as configured when both env vars are set', () => {
    const env: Record<string, string | undefined> = {
      GITHUB_CLIENT_ID: 'gh-id',
      GITHUB_CLIENT_SECRET: 'gh-secret',
    }
    const result = getAvailableProviders(env)

    const github = result.find((r) => r.provider.slug === 'github')
    expect(github).toBeDefined()
    expect(github!.configured).toBe(true)
  })

  it('does not mark provider as configured when only clientId is set', () => {
    const env: Record<string, string | undefined> = {
      SLACK_CLIENT_ID: 'slack-id',
    }
    const result = getAvailableProviders(env)

    const slack = result.find((r) => r.provider.slug === 'slack')
    expect(slack).toBeDefined()
    expect(slack!.configured).toBe(false)
  })

  it('does not mark provider as configured when only clientSecret is set', () => {
    const env: Record<string, string | undefined> = {
      SLACK_CLIENT_SECRET: 'slack-secret',
    }
    const result = getAvailableProviders(env)

    const slack = result.find((r) => r.provider.slug === 'slack')
    expect(slack).toBeDefined()
    expect(slack!.configured).toBe(false)
  })

  it('handles empty string env vars as unconfigured', () => {
    const env: Record<string, string | undefined> = {
      DISCORD_CLIENT_ID: '',
      DISCORD_CLIENT_SECRET: '',
    }
    const result = getAvailableProviders(env)

    const discord = result.find((r) => r.provider.slug === 'discord')
    expect(discord!.configured).toBe(false)
  })

  it('marks multiple providers as configured simultaneously', () => {
    const env: Record<string, string | undefined> = {
      GITHUB_CLIENT_ID: 'gh-id',
      GITHUB_CLIENT_SECRET: 'gh-secret',
      SLACK_CLIENT_ID: 'slack-id',
      SLACK_CLIENT_SECRET: 'slack-secret',
    }
    const result = getAvailableProviders(env)

    const configured = result.filter((r) => r.configured)
    expect(configured).toHaveLength(2)
  })

  it('returns results with provider reference matching INTEGRATION_PROVIDERS', () => {
    const result = getAvailableProviders({})
    for (const entry of result) {
      expect(INTEGRATION_PROVIDERS[entry.provider.slug]).toBe(entry.provider)
    }
  })
})

describe('INTEGRATION_STATUS', () => {
  it('is a readonly tuple with expected values', () => {
    expect(INTEGRATION_STATUS).toContain('active')
    expect(INTEGRATION_STATUS).toContain('disconnected')
    expect(INTEGRATION_STATUS).toContain('error')
    expect(INTEGRATION_STATUS).toContain('expired')
  })

  it('has no duplicate statuses', () => {
    const unique = new Set(INTEGRATION_STATUS)
    expect(INTEGRATION_STATUS.length).toBe(unique.size)
  })

  it('has exactly 4 statuses', () => {
    expect(INTEGRATION_STATUS).toHaveLength(4)
  })
})
