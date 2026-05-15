import { escapeHtml, renderEmail, textStyles } from './base'

export interface TeamInviteData {
  expiresAt: string
  inviteUrl: string
  inviterName: string
  organizationName: string
  role: string
}

export function renderTeamInvite(data: TeamInviteData): { html: string; text: string } {
  const subject = `${escapeHtml(data.inviterName)} invited you to join ${escapeHtml(data.organizationName)}`

  const bodyHtml = `
    <p style="${textStyles.paragraph}">
      <strong>${escapeHtml(data.inviterName)}</strong> has invited you to join the organization
      <strong>${escapeHtml(data.organizationName)}</strong> as a <strong>${escapeHtml(data.role)}</strong>.
    </p>
    <p style="${textStyles.muted}">
      This invitation expires on ${escapeHtml(data.expiresAt)}.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:16px 0;">
          <a href="${escapeHtml(data.inviteUrl)}" class="button" style="display:inline-block; padding:12px 28px; background-color:#6366f1; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:600; font-size:14px;">
            Accept Invitation
          </a>
        </td>
      </tr>
    </table>
    <p style="${textStyles.muted}">
      If you don't want to join this organization, you can ignore this email.
    </p>
  `

  const bodyText = `${data.inviterName} has invited you to join ${data.organizationName} as a ${data.role}.

This invitation expires on ${data.expiresAt}.

Accept the invitation: ${data.inviteUrl}

If you don't want to join this organization, you can ignore this email.`

  return {
    html: renderEmail(subject, bodyHtml),
    text: bodyText,
  }
}
