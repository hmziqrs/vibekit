export interface IntegrationProvider {
  authorizeUrl: string
  category: string
  clientIdEnvKey: string
  clientSecretEnvKey: string
  description: string
  icon: string
  name: string
  scopes: string[]
  slug: string
  tokenUrl: string
}

export const INTEGRATION_PROVIDERS: Record<string, IntegrationProvider> = {
  discord: {
    authorizeUrl: 'https://discord.com/api/oauth2/authorize',
    category: 'Communication',
    clientIdEnvKey: 'DISCORD_CLIENT_ID',
    clientSecretEnvKey: 'DISCORD_CLIENT_SECRET',
    description: 'Send notifications and manage Discord servers',
    icon: 'discord',
    name: 'Discord',
    scopes: ['identify', 'bot', 'webhook.incoming'],
    slug: 'discord',
    tokenUrl: 'https://discord.com/api/oauth2/token',
  },
  github: {
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    category: 'Development',
    clientIdEnvKey: 'GITHUB_CLIENT_ID',
    clientSecretEnvKey: 'GITHUB_CLIENT_SECRET',
    description: 'Access repositories, issues, and pull requests',
    icon: 'github',
    name: 'GitHub',
    scopes: ['repo', 'read:org', 'user:email'],
    slug: 'github',
    tokenUrl: 'https://github.com/login/oauth/access_token',
  },
  linear: {
    authorizeUrl: 'https://linear.app/oauth/authorize',
    category: 'Project Management',
    clientIdEnvKey: 'LINEAR_CLIENT_ID',
    clientSecretEnvKey: 'LINEAR_CLIENT_SECRET',
    description: 'Sync issues and project data with Linear',
    icon: 'linear',
    name: 'Linear',
    scopes: ['read', 'write'],
    slug: 'linear',
    tokenUrl: 'https://api.linear.app/oauth/token',
  },
  notion: {
    authorizeUrl: 'https://api.notion.com/v1/oauth/authorize',
    category: 'Productivity',
    clientIdEnvKey: 'NOTION_CLIENT_ID',
    clientSecretEnvKey: 'NOTION_CLIENT_SECRET',
    description: 'Read and write Notion pages and databases',
    icon: 'notion',
    name: 'Notion',
    scopes: ['read_content', 'write_content'],
    slug: 'notion',
    tokenUrl: 'https://api.notion.com/v1/oauth/token',
  },
  slack: {
    authorizeUrl: 'https://slack.com/oauth/v2/authorize',
    category: 'Communication',
    clientIdEnvKey: 'SLACK_CLIENT_ID',
    clientSecretEnvKey: 'SLACK_CLIENT_SECRET',
    description: 'Post messages and manage Slack workspaces',
    icon: 'slack',
    name: 'Slack',
    scopes: ['chat:write', 'channels:read', 'team:read'],
    slug: 'slack',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
  },
}

export const INTEGRATION_STATUS = ['active', 'disconnected', 'error', 'expired'] as const
export type IntegrationStatus = (typeof INTEGRATION_STATUS)[number]

export function getProvider(slug: string): IntegrationProvider | undefined {
  return INTEGRATION_PROVIDERS[slug]
}

export function getAvailableProviders(env: Record<string, string | undefined>): Array<{
  configured: boolean
  provider: IntegrationProvider
}> {
  return Object.values(INTEGRATION_PROVIDERS).map((provider) => ({
    configured: !!(env[provider.clientIdEnvKey] && env[provider.clientSecretEnvKey]),
    provider,
  }))
}
