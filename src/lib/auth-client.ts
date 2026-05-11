import { env } from '$env/dynamic/public'
import { passkeyClient } from '@better-auth/passkey/client'
import { twoFactorClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/svelte'

export const authClient = createAuthClient({
  baseURL: env.PUBLIC_BETTER_AUTH_URL ?? 'http://localhost:5173',
  plugins: [
    passkeyClient(),
    twoFactorClient({
      twoFactorPage: '/two-factor',
    }),
  ],
})

export const { signIn, signUp, signOut, useSession } = authClient
