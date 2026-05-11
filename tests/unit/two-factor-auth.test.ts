import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('two-factor auth configuration', () => {
  it('includes twoFactor plugin in auth config', async () => {
    const authSource = readFileSync(resolve(process.cwd(), 'src/lib/server/auth.ts'), 'utf8')
    expect(authSource).toContain("from 'better-auth/plugins'")
    expect(authSource).toContain('twoFactor(')
    expect(authSource).toContain("issuer: 'Vibekit'")
  })

  it('includes twoFactorClient in auth client', async () => {
    const clientSource = readFileSync(resolve(process.cwd(), 'src/lib/auth-client.ts'), 'utf8')
    expect(clientSource).toContain('twoFactorClient')
    expect(clientSource).toContain("twoFactorPage: '/two-factor'")
  })

  it('auth schema includes twoFactor table', async () => {
    const schemaSource = readFileSync(
      resolve(process.cwd(), 'src/lib/server/db/auth.schema.ts'),
      'utf8'
    )
    expect(schemaSource).toContain('export const twoFactor = sqliteTable')
    expect(schemaSource).toContain('twoFactorRelations')
    expect(schemaSource).toContain('twoFactors: many(twoFactor)')
  })

  it('user table includes twoFactorEnabled column', async () => {
    const schemaSource = readFileSync(
      resolve(process.cwd(), 'src/lib/server/db/auth.schema.ts'),
      'utf8'
    )
    expect(schemaSource).toContain('twoFactorEnabled')
  })

  it('migration file exists for twoFactor table', async () => {
    const migrationSource = readFileSync(
      resolve(process.cwd(), 'drizzle/0010_smart_mentor.sql'),
      'utf8'
    )
    expect(migrationSource).toContain('CREATE TABLE `two_factor`')
    expect(migrationSource).toContain('two_factor_enabled')
  })

  it('two-factor verification page exists', async () => {
    const pageSource = readFileSync(
      resolve(process.cwd(), 'src/routes/(auth)/two-factor/+page.svelte'),
      'utf8'
    )
    expect(pageSource).toContain('authClient.twoFactor.verifyTotp')
    expect(pageSource).toContain('authClient.twoFactor.verifyBackupCode')
    expect(pageSource).toContain('Trust this device')
  })

  it('settings page includes 2FA section', async () => {
    const settingsSource = readFileSync(
      resolve(process.cwd(), 'src/routes/(app)/app/settings/+page.svelte'),
      'utf8'
    )
    expect(settingsSource).toContain('Two-Factor Authentication')
    expect(settingsSource).toContain('authClient.twoFactor.enable')
    expect(settingsSource).toContain('authClient.twoFactor.disable')
    expect(settingsSource).toContain('authClient.twoFactor.verifyTotp')
    expect(settingsSource).toContain('authClient.twoFactor.generateBackupCodes')
  })
})
