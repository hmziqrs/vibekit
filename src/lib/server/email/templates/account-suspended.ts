import { escapeHtml, renderEmail, textStyles } from './base'

export interface AccountSuspendedData {
  appealUrl?: string
  expiresAt?: string
  reason: string
  userName?: string
}

export function renderAccountSuspended(data: AccountSuspendedData): { html: string; text: string } {
  const subject = data.expiresAt
    ? 'Your account has been temporarily suspended'
    : 'Your account has been suspended'

  const durationText = data.expiresAt
    ? `This suspension is temporary and will expire on <strong>${escapeHtml(data.expiresAt)}</strong>.`
    : 'This suspension is indefinite.'

  const appealHtml = data.appealUrl
    ? `
    <p style="${textStyles.paragraph}">
      If you believe this is a mistake, you can submit an appeal:
    </p>
    <a href="${escapeHtml(data.appealUrl)}" class="button" style="display:inline-block; padding:12px 28px; background-color:#6366f1; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:600; font-size:14px;">
      Submit an Appeal
    </a>
  `
    : ''

  const appealText = data.appealUrl
    ? `\nIf you believe this is a mistake, submit an appeal at ${data.appealUrl}`
    : ''

  const bodyHtml = `
    <p style="${textStyles.paragraph}">
      Hi${data.userName ? ` ${escapeHtml(data.userName)}` : ''},
    </p>
    <p style="${textStyles.paragraph}">
      Your Vibekit account has been suspended. ${durationText}
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      <tr>
        <td style="${textStyles.muted} padding-right:12px; vertical-align:top;">Reason:</td>
        <td style="${textStyles.paragraph} margin:0;">${escapeHtml(data.reason)}</td>
      </tr>
    </table>
    ${appealHtml}
    <p style="${textStyles.muted}">
      If you have any questions, please contact our support team.
    </p>
  `

  const bodyText = `Hi${data.userName ? ` ${data.userName}` : ''},

Your Vibekit account has been suspended. ${
    data.expiresAt
      ? `This suspension is temporary and will expire on ${data.expiresAt}.`
      : 'This suspension is indefinite.'
  }

Reason: ${data.reason}${appealText}

If you have any questions, please contact our support team.
`

  return {
    html: renderEmail(subject, bodyHtml),
    text: bodyText,
  }
}
