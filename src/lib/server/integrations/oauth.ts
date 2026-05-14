import { oauthState } from '$lib/server/db/schema'
import type { DrizzleDb } from '$lib/server/services/types'
import { uuid } from '$lib/server/uuid'
import { generateCodeVerifier, generateState } from 'arctic'
import { eq, lt } from 'drizzle-orm'

import { getProvider } from './providers'

export interface OAuthState {
  provider: string
  redirectUrl?: string
  userId: string
}

const STATE_TTL_MS = 10 * 60 * 1000

export async function generateOAuthState(
  db: DrizzleDb,
  data: OAuthState & { codeVerifier?: string }
): Promise<string> {
  const state = generateState()
  await db.insert(oauthState).values({
    data: {
      codeVerifier: data.codeVerifier,
      provider: data.provider,
      redirectUrl: data.redirectUrl,
      userId: data.userId,
    },
    id: uuid(),
  })
  return state
}

export async function consumeOAuthState(
  db: DrizzleDb,
  state: string
): Promise<(OAuthState & { codeVerifier?: string }) | null> {
  const [row] = await db.select().from(oauthState).where(eq(oauthState.id, state))

  if (!row) return null

  if (Date.now() - row.createdAt.getTime() > STATE_TTL_MS) {
    await db.delete(oauthState).where(eq(oauthState.id, state))
    return null
  }

  await db.delete(oauthState).where(eq(oauthState.id, state))
  return row.data
}

export async function cleanupExpiredOAuthStates(db: DrizzleDb): Promise<number> {
  const cutoff = new Date(Date.now() - STATE_TTL_MS)
  const result = await db.delete(oauthState).where(lt(oauthState.createdAt, cutoff))
  return result.meta?.changes ?? 0
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
