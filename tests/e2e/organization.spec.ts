import { expect, test, type Page } from '@playwright/test'

import { ADMIN, login } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

test.describe('organizations', () => {
  let createdOrgId = ''
  let authedPage: Page

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext()
    authedPage = await context.newPage()
    await login(authedPage, ADMIN)
  })

  test.afterAll(async () => {
    await authedPage.context().close()
  })

  test('shows organizations nav item in sidebar', async () => {
    await authedPage.goto('/app/dashboard', { waitUntil: 'networkidle' })
    await expect(authedPage.getByRole('link', { name: 'Organizations' })).toBeVisible()
  })

  test('navigates to organizations list page', async () => {
    await authedPage.goto('/app/organizations', { waitUntil: 'networkidle' })
    await expect(authedPage.getByRole('heading', { name: 'Organizations' })).toBeVisible()
    await expect(authedPage.getByText('Manage your organizations')).toBeVisible()
    await expect(authedPage.getByRole('button', { name: 'New Organization' })).toBeVisible()
  })

  test('API creates a new organization', async () => {
    const res = await authedPage.request.post('/api/orgs', {
      data: { description: 'An organization created by E2E tests', name: `Test Org ${Date.now()}` },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status()).toBe(201)
    const data = await res.json()
    expect(data.id).toBeTruthy()
    expect(data.slug).toBeTruthy()
    createdOrgId = data.id
  })

  test('API lists user organizations', async () => {
    const res = await authedPage.request.get('/api/orgs')
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data.organizations)).toBe(true)
    expect(data.organizations.length).toBeGreaterThanOrEqual(1)
  })

  test('API returns org details for member', async () => {
    if (!createdOrgId) {
      test.skip()
      return
    }
    const res = await authedPage.request.get(`/api/orgs/${createdOrgId}`)
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.organization).toBeDefined()
    expect(data.organization.id).toBe(createdOrgId)
    expect(data.membership).toBeDefined()
    expect(data.membership.role).toBe('owner')
  })

  test('API returns org members', async () => {
    if (!createdOrgId) {
      test.skip()
      return
    }
    const res = await authedPage.request.get(`/api/orgs/${createdOrgId}/members`)
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data.members)).toBe(true)
    expect(data.members.length).toBeGreaterThanOrEqual(1)
    expect(data.members[0].role).toBe('owner')
  })

  test('API rejects non-existent org access', async () => {
    const fakeOrgId = '00000000-0000-0000-0000-000000000000'
    const res = await authedPage.request.get(`/api/orgs/${fakeOrgId}`)
    expect(res.status()).toBe(404)
  })

  test('API creates organization with description', async () => {
    const res = await authedPage.request.post('/api/orgs', {
      data: { description: 'Test description', name: `Desc Org ${Date.now()}` },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status()).toBe(201)
    const data = await res.json()
    expect(data.id).toBeTruthy()
  })

  test('API rejects duplicate slug', async () => {
    const name = `dup-slug-test-${Date.now()}`
    await authedPage.request.post('/api/orgs', {
      data: { name },
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await authedPage.request.post('/api/orgs', {
      data: { name },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status()).toBe(409)
  })

  test('API validates create payload', async () => {
    const res = await authedPage.request.post('/api/orgs', {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status()).toBe(400)
  })

  test('API validates invite payload', async () => {
    if (!createdOrgId) {
      test.skip()
      return
    }
    const res = await authedPage.request.post(`/api/orgs/${createdOrgId}/members/invite`, {
      data: { email: 'not-an-email' },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status()).toBe(400)
  })

  test('API rejects invite for existing member', async () => {
    if (!createdOrgId) {
      test.skip()
      return
    }
    const res = await authedPage.request.post(`/api/orgs/${createdOrgId}/members/invite`, {
      data: { email: ADMIN.email, role: 'member' },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status()).toBe(409)
  })

  test('org detail page shows members', async () => {
    if (!createdOrgId) {
      test.skip()
      return
    }
    await authedPage.goto(`/app/organizations/${createdOrgId}`, { waitUntil: 'networkidle' })
    await expect(authedPage.getByText('Members')).toBeVisible()
    const memberSection = authedPage.locator('.divide-y')
    await expect(memberSection.getByText(ADMIN.email)).toBeVisible()
  })

  test('org settings page loads for owner', async () => {
    if (!createdOrgId) {
      test.skip()
      return
    }
    await authedPage.goto(`/app/organizations/${createdOrgId}/settings`, {
      waitUntil: 'networkidle',
    })
    await expect(authedPage.getByText('Organization Settings')).toBeVisible()
    await expect(authedPage.getByText('Danger Zone')).toBeVisible()
  })

  test('invitations API returns empty for user without invites', async () => {
    const res = await authedPage.request.get('/api/invitations')
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data.invitations)).toBe(true)
  })

  test('orgs API requires authentication', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    const res = await page.request.get('/api/orgs')
    expect(res.status()).toBeGreaterThanOrEqual(400)
    await context.close()
  })
})
