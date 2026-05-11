import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('oauth/social login server configuration', () => {
  it('has socialProviders config in auth.ts', async () => {
    const authSource = readFileSync(resolve(process.cwd(), 'src/lib/server/auth.ts'), 'utf8')
    expect(authSource).toContain('socialProviders')
    expect(authSource).toContain('google')
    expect(authSource).toContain('github')
  })

  it('conditionally enables providers based on env vars', async () => {
    const authSource = readFileSync(resolve(process.cwd(), 'src/lib/server/auth.ts'), 'utf8')
    expect(authSource).toContain('GOOGLE_CLIENT_ID')
    expect(authSource).toContain('GOOGLE_CLIENT_SECRET')
    expect(authSource).toContain('GITHUB_CLIENT_ID')
    expect(authSource).toContain('GITHUB_CLIENT_SECRET')
  })

  it('has account linking configuration', async () => {
    const authSource = readFileSync(resolve(process.cwd(), 'src/lib/server/auth.ts'), 'utf8')
    expect(authSource).toContain('accountLinking')
    expect(authSource).toContain('encryptOAuthTokens')
    expect(authSource).toContain('trustedProviders')
  })

  it('trusts email-password, google, and github providers', async () => {
    const authSource = readFileSync(resolve(process.cwd(), 'src/lib/server/auth.ts'), 'utf8')
    expect(authSource).toContain("'email-password'")
    expect(authSource).toContain("'google'")
    expect(authSource).toContain("'github'")
  })

  it('disallows different emails for account linking', async () => {
    const authSource = readFileSync(resolve(process.cwd(), 'src/lib/server/auth.ts'), 'utf8')
    expect(authSource).toContain('allowDifferentEmails: false')
  })
})

describe('oauth env configuration', () => {
  it('documents OAuth env vars in .env.example', async () => {
    const envExample = readFileSync(resolve(process.cwd(), '.env.example'), 'utf8')
    expect(envExample).toContain('GOOGLE_CLIENT_ID')
    expect(envExample).toContain('GOOGLE_CLIENT_SECRET')
    expect(envExample).toContain('GITHUB_CLIENT_ID')
    expect(envExample).toContain('GITHUB_CLIENT_SECRET')
  })

  it('marks OAuth vars as optional in .env.example', async () => {
    const envExample = readFileSync(resolve(process.cwd(), '.env.example'), 'utf8')
    expect(envExample).toContain('optional')
  })
})

describe('social login buttons component', () => {
  it('exists and uses signIn.social', async () => {
    const componentSource = readFileSync(
      resolve(process.cwd(), 'src/lib/components/social-login-buttons.svelte'),
      'utf8'
    )
    expect(componentSource).toContain('signIn.social')
    expect(componentSource).toContain('provider')
    expect(componentSource).toContain('callbackURL')
  })

  it('has google and github buttons', async () => {
    const componentSource = readFileSync(
      resolve(process.cwd(), 'src/lib/components/social-login-buttons.svelte'),
      'utf8'
    )
    expect(componentSource).toContain('Continue with Google')
    expect(componentSource).toContain('Continue with GitHub')
  })

  it('has error state handling', async () => {
    const componentSource = readFileSync(
      resolve(process.cwd(), 'src/lib/components/social-login-buttons.svelte'),
      'utf8'
    )
    expect(componentSource).toContain('socialError')
  })

  it('has loading state per provider', async () => {
    const componentSource = readFileSync(
      resolve(process.cwd(), 'src/lib/components/social-login-buttons.svelte'),
      'utf8'
    )
    expect(componentSource).toContain('loadingProvider')
  })
})

describe('login page with social buttons', () => {
  it('imports and uses SocialLoginButtons component', async () => {
    const pageSource = readFileSync(
      resolve(process.cwd(), 'src/routes/(auth)/login/+page.svelte'),
      'utf8'
    )
    expect(pageSource).toContain('SocialLoginButtons')
    expect(pageSource).toContain('social-login-buttons.svelte')
  })

  it('passes callbackURL to social buttons', async () => {
    const pageSource = readFileSync(
      resolve(process.cwd(), 'src/routes/(auth)/login/+page.svelte'),
      'utf8'
    )
    expect(pageSource).toContain('callbackURL')
  })
})

describe('register page with social buttons', () => {
  it('imports and uses SocialLoginButtons component', async () => {
    const pageSource = readFileSync(
      resolve(process.cwd(), 'src/routes/(auth)/register/+page.svelte'),
      'utf8'
    )
    expect(pageSource).toContain('SocialLoginButtons')
    expect(pageSource).toContain('social-login-buttons.svelte')
  })
})

describe('settings connected accounts', () => {
  it('has connected accounts section', async () => {
    const settingsSource = readFileSync(
      resolve(process.cwd(), 'src/routes/(app)/app/settings/+page.svelte'),
      'utf8'
    )
    expect(settingsSource).toContain('Connected Accounts')
  })

  it('has link social functionality', async () => {
    const settingsSource = readFileSync(
      resolve(process.cwd(), 'src/routes/(app)/app/settings/+page.svelte'),
      'utf8'
    )
    expect(settingsSource).toContain('authClient.linkSocial')
  })

  it('has unlink account functionality', async () => {
    const settingsSource = readFileSync(
      resolve(process.cwd(), 'src/routes/(app)/app/settings/+page.svelte'),
      'utf8'
    )
    expect(settingsSource).toContain('authClient.unlinkAccount')
  })

  it('has list accounts functionality', async () => {
    const settingsSource = readFileSync(
      resolve(process.cwd(), 'src/routes/(app)/app/settings/+page.svelte'),
      'utf8'
    )
    expect(settingsSource).toContain('authClient.listAccounts')
  })

  it('shows provider display names', async () => {
    const settingsSource = readFileSync(
      resolve(process.cwd(), 'src/routes/(app)/app/settings/+page.svelte'),
      'utf8'
    )
    expect(settingsSource).toContain("'Email & Password'")
    expect(settingsSource).toContain("'GitHub'")
    expect(settingsSource).toContain("'Google'")
  })
})

describe('oauth error page', () => {
  it('exists and displays error message', async () => {
    const pageSource = readFileSync(
      resolve(process.cwd(), 'src/routes/(auth)/auth-error/+page.svelte'),
      'utf8'
    )
    expect(pageSource).toContain('Authentication Error')
    expect(pageSource).toContain('errorMessage')
  })

  it('has link back to login', async () => {
    const pageSource = readFileSync(
      resolve(process.cwd(), 'src/routes/(auth)/auth-error/+page.svelte'),
      'utf8'
    )
    expect(pageSource).toContain('/login')
    expect(pageSource).toContain('Back to Login')
  })

  it('reads error from URL search params', async () => {
    const pageSource = readFileSync(
      resolve(process.cwd(), 'src/routes/(auth)/auth-error/+page.svelte'),
      'utf8'
    )
    expect(pageSource).toContain('searchParams.get')
  })
})
