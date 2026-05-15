import { renderTeamInvite } from '$lib/server/email/templates/team-invite'
import { describe, expect, it } from 'vitest'

describe('renderTeamInvite', () => {
  const baseData = {
    expiresAt: '2026-06-15',
    inviteUrl: 'https://app.example.com/invitations/abc-token',
    inviterName: 'Jane Doe',
    organizationName: 'Acme Corp',
    role: 'member',
  }

  it('renders invitation email with all fields', () => {
    const { html, text } = renderTeamInvite(baseData)

    expect(html).toContain('Jane Doe')
    expect(html).toContain('Acme Corp')
    expect(html).toContain('member')
    expect(html).toContain('2026-06-15')
    expect(html).toContain('https://app.example.com/invitations/abc-token')
    expect(html).toContain('Accept Invitation')

    expect(text).toContain('Jane Doe')
    expect(text).toContain('Acme Corp')
    expect(text).toContain('member')
    expect(text).toContain('https://app.example.com/invitations/abc-token')
  })

  it('escapes HTML in names and org name', () => {
    const { html } = renderTeamInvite({
      ...baseData,
      inviterName: '<script>alert("xss")</script>',
      organizationName: '<b>Evil</b> Corp',
    })

    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&lt;b&gt;')
  })

  it('includes ignore instructions', () => {
    const { html, text } = renderTeamInvite(baseData)

    expect(html).toContain('ignore this email')
    expect(text).toContain('ignore this email')
  })

  it('renders for admin role', () => {
    const { html, text } = renderTeamInvite({ ...baseData, role: 'admin' })

    expect(html).toContain('admin')
    expect(text).toContain('admin')
  })

  it('renders for viewer role', () => {
    const { html, text } = renderTeamInvite({ ...baseData, role: 'viewer' })

    expect(html).toContain('viewer')
    expect(text).toContain('viewer')
  })
})
