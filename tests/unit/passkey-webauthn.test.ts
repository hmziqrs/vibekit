import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('passkey/webauthn configuration', () => {
  it('includes passkey plugin in auth config', async () => {
    const authSource = readFileSync(resolve(process.cwd(), 'src/lib/server/auth.ts'), 'utf8')
    expect(authSource).toContain("from '@better-auth/passkey'")
    expect(authSource).toContain('passkey(')
    expect(authSource).toContain('origin: env.ORIGIN')
    expect(authSource).toContain("rpName: 'Vibekit'")
  })

  it('passkey plugin uses correct relying party configuration', async () => {
    const authSource = readFileSync(resolve(process.cwd(), 'src/lib/server/auth.ts'), 'utf8')
    expect(authSource).toContain('rpID: new URL(env.ORIGIN).hostname')
  })

  it('includes passkeyClient in auth client', async () => {
    const clientSource = readFileSync(resolve(process.cwd(), 'src/lib/auth-client.ts'), 'utf8')
    expect(clientSource).toContain("from '@better-auth/passkey/client'")
    expect(clientSource).toContain('passkeyClient()')
  })

  it('auth schema includes passkey table', async () => {
    const schemaSource = readFileSync(
      resolve(process.cwd(), 'src/lib/server/db/auth.schema.ts'),
      'utf8'
    )
    expect(schemaSource).toContain('export const passkey = sqliteTable')
    expect(schemaSource).toContain('passkeyRelations')
    expect(schemaSource).toContain('passkeys: many(passkey)')
  })

  it('passkey table has required columns', async () => {
    const schemaSource = readFileSync(
      resolve(process.cwd(), 'src/lib/server/db/auth.schema.ts'),
      'utf8'
    )
    expect(schemaSource).toContain('credentialID')
    expect(schemaSource).toContain('publicKey')
    expect(schemaSource).toContain('counter')
    expect(schemaSource).toContain('deviceType')
    expect(schemaSource).toContain('backedUp')
    expect(schemaSource).toContain('transports')
  })

  it('passkey table has foreign key to user with cascade delete', async () => {
    const schemaSource = readFileSync(
      resolve(process.cwd(), 'src/lib/server/db/auth.schema.ts'),
      'utf8'
    )
    expect(schemaSource).toContain("references(() => user.id, { onDelete: 'cascade' })")
  })

  it('passkey table has credentialID and userId indexes', async () => {
    const schemaSource = readFileSync(
      resolve(process.cwd(), 'src/lib/server/db/auth.schema.ts'),
      'utf8'
    )
    expect(schemaSource).toContain('passkey_credentialID_idx')
    expect(schemaSource).toContain('passkey_userId_idx')
  })

  it('user relations include passkeys', async () => {
    const schemaSource = readFileSync(
      resolve(process.cwd(), 'src/lib/server/db/auth.schema.ts'),
      'utf8'
    )
    const userRelationsBlock = schemaSource.substring(
      schemaSource.indexOf('export const userRelations'),
      schemaSource.indexOf('export const sessionRelations')
    )
    expect(userRelationsBlock).toContain('passkeys: many(passkey)')
  })

  it('migration file exists for passkey table', async () => {
    const migrationSource = readFileSync(
      resolve(process.cwd(), 'drizzle/0011_condemned_namorita.sql'),
      'utf8'
    )
    expect(migrationSource).toContain('CREATE TABLE `passkey`')
    expect(migrationSource).toContain('`credential_id`')
    expect(migrationSource).toContain('`public_key`')
    expect(migrationSource).toContain('FOREIGN KEY (`user_id`) REFERENCES `user`(`id`)')
  })

  it('migration has indexes for passkey table', async () => {
    const migrationSource = readFileSync(
      resolve(process.cwd(), 'drizzle/0011_condemned_namorita.sql'),
      'utf8'
    )
    expect(migrationSource).toContain('CREATE INDEX `passkey_credentialID_idx`')
    expect(migrationSource).toContain('CREATE INDEX `passkey_userId_idx`')
  })
})

describe('passkey login page', () => {
  it('has passkey sign-in button', async () => {
    const pageSource = readFileSync(
      resolve(process.cwd(), 'src/routes/(auth)/login/+page.svelte'),
      'utf8'
    )
    expect(pageSource).toContain('Sign in with Passkey')
    expect(pageSource).toContain('handlePasskeySignIn')
  })

  it('uses authClient signIn passkey method', async () => {
    const pageSource = readFileSync(
      resolve(process.cwd(), 'src/routes/(auth)/login/+page.svelte'),
      'utf8'
    )
    expect(pageSource).toContain('authClient.signIn.passkey()')
  })

  it('has passkey error state display', async () => {
    const pageSource = readFileSync(
      resolve(process.cwd(), 'src/routes/(auth)/login/+page.svelte'),
      'utf8'
    )
    expect(pageSource).toContain('passkeyError')
    expect(pageSource).toContain('text-red-400')
  })

  it('has visual separator between email and passkey login', async () => {
    const pageSource = readFileSync(
      resolve(process.cwd(), 'src/routes/(auth)/login/+page.svelte'),
      'utf8'
    )
    expect(pageSource).toContain('border-t')
    expect(pageSource).toContain('or')
  })

  it('passkey button is outline variant with full width', async () => {
    const pageSource = readFileSync(
      resolve(process.cwd(), 'src/routes/(auth)/login/+page.svelte'),
      'utf8'
    )
    expect(pageSource).toContain('variant="outline"')
    expect(pageSource).toContain('class="w-full"')
  })
})

describe('passkey settings management', () => {
  it('has passkey management section in settings', async () => {
    const settingsSource = readFileSync(
      resolve(process.cwd(), 'src/routes/(app)/app/settings/+page.svelte'),
      'utf8'
    )
    expect(settingsSource).toContain('Passkeys')
  })

  it('has add passkey functionality', async () => {
    const settingsSource = readFileSync(
      resolve(process.cwd(), 'src/routes/(app)/app/settings/+page.svelte'),
      'utf8'
    )
    expect(settingsSource).toContain('addPasskey')
    expect(settingsSource).toContain('authClient.passkey.addPasskey')
  })

  it('has list passkeys functionality', async () => {
    const settingsSource = readFileSync(
      resolve(process.cwd(), 'src/routes/(app)/app/settings/+page.svelte'),
      'utf8'
    )
    expect(settingsSource).toContain('loadPasskeys')
    expect(settingsSource).toContain('authClient.passkey.listUserPasskeys()')
  })

  it('has remove passkey functionality', async () => {
    const settingsSource = readFileSync(
      resolve(process.cwd(), 'src/routes/(app)/app/settings/+page.svelte'),
      'utf8'
    )
    expect(settingsSource).toContain('removePasskey')
    expect(settingsSource).toContain('authClient.passkey.deletePasskey')
  })

  it('has confirm/cancel for passkey deletion', async () => {
    const settingsSource = readFileSync(
      resolve(process.cwd(), 'src/routes/(app)/app/settings/+page.svelte'),
      'utf8'
    )
    expect(settingsSource).toContain('deletePasskeyId')
  })
})
