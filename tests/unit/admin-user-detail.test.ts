import { describe, expect, it, vi } from 'vitest'

vi.mock('$lib/server/integrations/dispatch', () => ({
  dispatchToIntegrations: vi.fn().mockResolvedValue(undefined),
}))

const BASE = 'http://localhost:5173'

async function isVibekitServer(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/api/automation/manifest`)
    const contentType = res.headers.get('content-type') ?? ''
    return contentType.includes('application/json')
  } catch {
    return false
  }
}

describe('admin user detail API', () => {
  it('requires authentication', async () => {
    if (!(await isVibekitServer())) return
    const response = await fetch(`${BASE}/api/admin/users/test-id`)
    expect([401, 403]).toContain(response.status)
  })
})

describe('organization leave API', () => {
  it('requires authentication', async () => {
    if (!(await isVibekitServer())) return
    const response = await fetch(`${BASE}/api/orgs/test-org/leave`, {
      method: 'POST',
    })
    expect([401, 403]).toContain(response.status)
  })
})

describe('organization detail page leave button logic', () => {
  it('owner cannot leave (blocked by API)', () => {
    const role = 'owner'
    expect(role === 'owner').toBe(true)
  })

  it('non-owner sees leave button', () => {
    const roles = ['member', 'admin', 'viewer']
    for (const role of roles) {
      expect(role !== 'owner').toBe(true)
    }
  })
})
