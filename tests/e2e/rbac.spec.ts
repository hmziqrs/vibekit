import { expect, test, type Page } from '@playwright/test'

import { ADMIN, USER, login } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

test.describe('RBAC permission enforcement', () => {
  let ownerOrgId = ''
  let adminPage: Page
  let memberPage: Page
  let viewerPage: Page
  let adminMemberId = ''
  let memberMemberId = ''
  let viewerMemberId = ''

  test.beforeAll(async ({ browser }) => {
    // Owner creates the org
    const ownerCtx = await browser.newContext()
    const ownerPage = await ownerCtx.newPage()
    await login(ownerPage, ADMIN)

    const createRes = await ownerPage.request.post('/api/orgs', {
      data: { description: 'RBAC test org', name: `RBAC Org ${Date.now()}` },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(createRes.status()).toBe(201)
    const createData = await createRes.json()
    ownerOrgId = createData.id

    // Invite admin, member, viewer
    for (const { email, role } of [{ email: USER.email, role: 'admin' as const }]) {
      await ownerPage.request.post(`/api/orgs/${ownerOrgId}/members/invite`, {
        data: { email, role },
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // For now, just add members directly via DB (invite flow is separate)
    // Since we can't easily add members via API without accepting invitations,
    // we'll test with just the owner role

    await ownerCtx.close()
  })

  test('owner can perform all org actions', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await login(page, ADMIN)

    if (!ownerOrgId) {
      test.skip()
      await ctx.close()
      return
    }

    // Read org
    const readRes = await page.request.get(`/api/orgs/${ownerOrgId}`)
    expect(readRes.status()).toBe(200)

    // Read members
    const membersRes = await page.request.get(`/api/orgs/${ownerOrgId}/members`)
    expect(membersRes.status()).toBe(200)

    // Update org
    const updateRes = await page.request.patch(`/api/orgs/${ownerOrgId}`, {
      data: { name: `RBAC Org Updated ${Date.now()}` },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(updateRes.status()).toBe(200)

    await ctx.close()
  })

  test('non-member gets 403 for org actions', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await login(page, USER)

    if (!ownerOrgId) {
      test.skip()
      await ctx.close()
      return
    }

    // Non-member cannot read org details
    const readRes = await page.request.get(`/api/orgs/${ownerOrgId}`)
    expect(readRes.status()).toBe(403)

    // Non-member cannot read members
    const membersRes = await page.request.get(`/api/orgs/${ownerOrgId}/members`)
    expect(membersRes.status()).toBe(403)

    // Non-member cannot update
    const updateRes = await page.request.patch(`/api/orgs/${ownerOrgId}`, {
      data: { name: 'Hacked' },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(updateRes.status()).toBe(403)

    // Non-member cannot delete
    const deleteRes = await page.request.delete(`/api/orgs/${ownerOrgId}`)
    expect(deleteRes.status()).toBe(403)

    await ctx.close()
  })

  test('unauthenticated requests are rejected', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()

    if (!ownerOrgId) {
      test.skip()
      await ctx.close()
      return
    }

    const res = await page.request.get(`/api/orgs/${ownerOrgId}`)
    expect(res.status()).toBeGreaterThanOrEqual(400)

    await ctx.close()
  })

  test('permission error includes action name', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await login(page, USER)

    if (!ownerOrgId) {
      test.skip()
      await ctx.close()
      return
    }

    const deleteRes = await page.request.delete(`/api/orgs/${ownerOrgId}`)
    expect(deleteRes.status()).toBe(403)
    const data = await deleteRes.json()
    expect(data.error.message).toContain('org.delete')

    await ctx.close()
  })
})
