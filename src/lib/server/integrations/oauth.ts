import { generateCodeVerifier, generateState } from 'arctic'

import { getProvider } from './providers'

export interface OAuthState {
  provider: string
  redirectUrl?: string
  userId: string
}

export const stateStore = new Map<
  string,
  { createdAt: number; data: OAuthState & { codeVerifier?: string } }
>()

// Clean up expired states every 10 minutes
const STATE_TTL_MS = 10 * 60 * 1000

setInterval(
  () => {
    const now = Date.now()
    for (const [key, value] of stateStore.entries()) {
      if (now - value.createdAt > STATE_TTL_MS) {
        stateStore.delete(key)
      }
    }
  },
  10 * 60 * 1000
)

export function generateOAuthState(data: OAuthState & { codeVerifier?: string }): string {
  const state = generateState()
  stateStore.set(state, { createdAt: Date.now(), data })
  return state
}

export function consumeOAuthState(state: string): (OAuthState & { codeVerifier?: string }) | null {
  const entry = stateStore.get(state)
  if (!entry) return null
  stateStore.delete(state)
  if (Date.now() - entry.createdAt > STATE_TTL_MS) return null
  return entry.data
}

// oxlint-disable-next-line max-params
export function getAuthorizationUrl(
  providerSlug: string,
  state: string,
  codeVerifier: string,
  env: Record<string, string | undefined>,
  baseUrl: string
): URL {
  const provider = getProvider(providerSlug)
  if (!provider) throw new Error(`Unknown provider: ${providerSlug}`)

  const clientId = env[provider.clientIdEnvKey]
  if (!clientId) throw new Error(`Missing client ID for ${providerSlug}`)

  const url = new URL(provider.authorizeUrl)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', `${baseUrl}/api/integrations/callback/${providerSlug}`)
  url.searchParams.set('state', state)
  url.searchParams.set('scope', provider.scopes.join(' '))
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('code_challenge', codeVerifier)
  url.searchParams.set('code_challenge_method', 'S256')

  return url
}

// oxlint-disable-next-line max-params
export async function exchangeCodeForTokens(
  providerSlug: string,
  code: string,
  codeVerifier: string,
  env: Record<string, string | undefined>,
  baseUrl: string
): Promise<{
  accessToken: string
  expiresIn?: number
  refreshToken?: string
  scope?: string
}> {
  const provider = getProvider(providerSlug)
  if (!provider) throw new Error(`Unknown provider: ${providerSlug}`)

  const clientId = env[provider.clientIdEnvKey]
  const clientSecret = env[provider.clientSecretEnvKey]
  if (!clientId || !clientSecret) throw new Error(`Missing credentials for ${providerSlug}`)

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    code_verifier: codeVerifier,
    grant_type: 'authorization_code',
    redirect_uri: `${baseUrl}/api/integrations/callback/${providerSlug}`,
  })

  const response = await fetch(provider.tokenUrl, {
    body,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    method: 'POST',
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Token exchange failed for ${providerSlug}: ${response.status} ${text}`)
  }

  return (await response.json()) as {
    accessToken: string
    expiresIn?: number
    refreshToken?: string
    scope?: string
  }
}

export function generateOAuthParams(): { codeVerifier: string; state: string } {
  return {
    codeVerifier: generateCodeVerifier(),
    state: generateState(),
  }
}
