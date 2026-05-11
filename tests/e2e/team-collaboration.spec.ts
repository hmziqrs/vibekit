import { expect, test, type Page } from '@playwright/test'

import { ADMIN, USER, login } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

test.describe('Team collaboration CRUD', () => {
  let orgId = ''
  let teamId = ''
  let adminPage: Page

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext()
    adminPage = ctx.newPage instanceof Function ? await ctx.newPage() : adminPage
    await login(adminPage, ADMIN)

    const createRes = await adminPage.request.post('/api/orgs', {
      data: { description: 'Team test org', name: `Team Org ${Date.now()}` },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(createRes.status()).toBe(201)
    const createData = await createRes.json()
    orgId = createData.id
  })

  test('creates a team within organization', async () => {
    const res = await adminPage.request.post(`/api/orgs/${orgId}/teams`, {
      data: { description: 'Engineering team', name: 'Engineering' },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status()).toBe(201)
    const data = await res.json()
    expect(data.id).toBeDefined()
    expect(data.name).toBe('Engineering')
    teamId = data.id
  })

  test('lists teams in organization', async () => {
    const res = await adminPage.request.get(`/api/orgs/${orgId}/teams`)
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.teams).toBeDefined()
    expect(data.teams.length).toBeGreaterThanOrEqual(1)
    expect(data.teams.some((t: { id: string }) => t.id === teamId)).toBe(true)
  })

  test('gets team details', async () => {
    const res = await adminPage.request.get(`/api/orgs/${orgId}/teams/${teamId}`)
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.team.id).toBe(teamId)
    expect(data.team.name).toBe('Engineering')
    expect(data.team.description).toBe('Engineering team')
    expect(data.teamMembership).toBeDefined()
    expect(data.teamMembership.role).toBe('lead')
  })

  test('updates team', async () => {
    const res = await adminPage.request.patch(`/api/orgs/${orgId}/teams/${teamId}`, {
      data: { description: 'Updated description', name: 'Engineering Updated' },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status()).toBe(200)
  })

  test('lists team members', async () => {
    const res = await adminPage.request.get(`/api/orgs/${orgId}/teams/${teamId}/members`)
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.members).toBeDefined()
    expect(data.members.length).toBeGreaterThanOrEqual(1)
  })

  test('fetches team activity feed', async () => {
    const res = await adminPage.request.get(`/api/orgs/${orgId}/teams/${teamId}/activity`)
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.activities).toBeDefined()
    expect(data.page).toBeDefined()
    expect(data.totalPages).toBeDefined()
  })

  test('rejects unauthenticated team access', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    const res = await page.request.get(`/api/orgs/${orgId}/teams/${teamId}`)
    expect(res.status()).toBe(401)
  })

  test('rejects non-member team access', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await login(page, USER)

    const res = await page.request.get(`/api/orgs/${orgId}/teams/${teamId}`)
    expect(res.status()).toBe(403)
  })

  test('soft-deletes team', async () => {
    const res = await adminPage.request.delete(`/api/orgs/${orgId}/teams/${teamId}`)
    expect(res.status()).toBe(204)
  })

  test('deleted team returns 404', async () => {
    const res = await adminPage.request.get(`/api/orgs/${orgId}/teams/${teamId}`)
    expect(res.status()).toBe(404)
  })
})

test.describe('Team member management', () => {
  let orgId = ''
  let teamId = ''
  let memberUserId = ''
  let teamMemberId = ''
  let adminPage: Page

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext()
    adminPage = await ctx.newPage()
    await login(adminPage, ADMIN)

    const createOrgRes = await adminPage.request.post('/api/orgs', {
      data: { name: `Member Org ${Date.now()}` },
      headers: { 'Content-Type': 'application/json' },
    })
    const orgData = await createOrgRes.json()
    orgId = orgData.id

    const createTeamRes = await adminPage.request.post(`/api/orgs/${orgId}/teams`, {
      data: { name: 'Test Team' },
      headers: { 'Content-Type': 'application/json' },
    })
    const teamData = await createTeamRes.json()
    teamId = teamData.id

    const membersRes = await adminPage.request.get(`/api/orgs/${orgId}/members`)
    const membersData = await membersRes.json()
    const regularMember = membersData.members.find((m: { role: string }) => m.role !== 'owner')
    if (regularMember) {
      memberUserId = regularMember.userId
    }
  })

  test('adds org member to team', async () => {
    if (!memberUserId) return
    const res = await adminPage.request.post(`/api/orgs/${orgId}/teams/${teamId}/members`, {
      data: { role: 'member', userId: memberUserId },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status()).toBe(201)
    const data = await res.json()
    expect(data.id).toBeDefined()
    teamMemberId = data.id
  })

  test('changes team member role', async () => {
    if (!teamMemberId) return
    const res = await adminPage.request.patch(
      `/api/orgs/${orgId}/teams/${teamId}/members/${teamMemberId}`,
      {
        data: { role: 'lead' },
        headers: { 'Content-Type': 'application/json' },
      }
    )
    expect(res.status()).toBe(200)
  })

  test('removes team member', async () => {
    if (!teamMemberId) return
    const res = await adminPage.request.delete(
      `/api/orgs/${orgId}/teams/${teamId}/members/${teamMemberId}`
    )
    expect(res.status()).toBe(200)
  })
})
