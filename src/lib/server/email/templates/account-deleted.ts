import { escapeHtml, renderEmail, textStyles } from './base'

export interface AccountDeletedData {
  reactivationUrl: string
  userName?: string
}

export function renderAccountDeleted(data: AccountDeletedData): { html: string; text: string } {
  const greeting = data.userName ? escapeHtml(data.userName) : 'there'

  const bodyHtml = `
    <p style="${textStyles.paragraph}">
      Hi ${greeting},
    </p>
    <p style="${textStyles.paragraph}">
      Your Vibekit account has been deleted. This is a soft delete, meaning your data
      will be retained for <strong>30 days</strong>. During this period you can restore
      your account and all associated data at any time.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:8px 0 24px;">
          <a href="${escapeHtml(data.reactivationUrl)}" class="button" style="display:inline-block; padding:12px 28px; background-color:#6366f1; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:600; font-size:14px;">Reactivate Account</a>
        </td>
      </tr>
    </table>
    <p style="${textStyles.muted}">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${escapeHtml(data.reactivationUrl)}" style="color:#6366f1; word-break:break-all;">${escapeHtml(data.reactivationUrl)}</a>
    </p>
    <p style="${textStyles.muted}">
      After the 30-day retention period, your account and all associated data will be
      permanently deleted and cannot be recovered. If you change your mind, please
      reactivate as soon as possible.
    </p>
  `

  const bodyText = `Hi ${greeting},

Your Vibekit account has been deleted. This is a soft delete, meaning your data will be retained for 30 days. During this period you can restore your account and all associated data at any time.

Reactivate your account: ${data.reactivationUrl}

After the 30-day retention period, your account and all associated data will be permanently deleted and cannot be recovered. If you change your mind, please reactivate as soon as possible.`

  return {
    html: renderEmail(
      'Your Account Has Been Deleted',
      bodyHtml,
      'Your Vibekit account has been deleted — reactivate within 30 days'
    ),
    text: bodyText,
  }
}
