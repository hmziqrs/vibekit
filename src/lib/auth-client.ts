import { createAuthClient } from 'better-auth/svelte'
import { env } from '$env/dynamic/public'

export const authClient = createAuthClient({
    baseURL: env.PUBLIC_BETTER_AUTH_URL ?? env.ORIGIN ?? 'http://localhost:5173',
})

export const { signIn, signUp, signOut, useSession } = authClient
