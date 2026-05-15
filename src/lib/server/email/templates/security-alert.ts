import { escapeHtml, renderEmail, textStyles } from './base'

export interface SecurityAlertData {
  details?: string
  eventTime: string
  eventType: 'account_locked' | 'new_device' | 'password_change' | 'two_factor_change'
  ipAddress?: string
  userAgent?: string
  userName?: string
}

function getEventDescription(eventType: SecurityAlertData['eventType']): string {
  switch (eventType) {
    case 'account_locked': {
      return 'Your account was locked due to multiple failed sign-in attempts.'
    }
    case 'new_device': {
      return 'A new device signed in to your account.'
    }
    case 'password_change': {
      return 'Your password was changed.'
    }
    case 'two_factor_change': {
      return 'Two-factor authentication settings were changed on your account.'
    }
  }
}

function getSubject(eventType: SecurityAlertData['eventType']): string {
  switch (eventType) {
    case 'account_locked': {
      return 'Security alert: Account locked'
    }
    case 'new_device': {
      return 'Security alert: New device sign-in'
    }
    case 'password_change': {
      return 'Security alert: Password changed'
    }
    case 'two_factor_change': {
      return 'Security alert: 2FA settings changed'
    }
  }
}

export function renderSecurityAlert(data: SecurityAlertData): { html: string; text: string } {
  const description = getEventDescription(data.eventType)
  const subject = getSubject(data.eventType)

  const bodyHtml = `
    <p style="${textStyles.paragraph}">
      Hi${data.userName ? ` ${escapeHtml(data.userName)}` : ''},
    </p>
    <p style="${textStyles.paragraph}">
      We detected a security event on your account:
    </p>
    <p style="color:#ededed; font-size:15px; font-weight:600; margin:0 0 16px;">
      ${description}
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      <tr><td style="${textStyles.muted} padding-right:12px;">Time:</td><td style="${textStyles.paragraph} margin:0;">${escapeHtml(data.eventTime)}</td></tr>
      ${data.ipAddress ? `<tr><td style="${textStyles.muted} padding-right:12px;">IP:</td><td style="${textStyles.paragraph} margin:0;">${escapeHtml(data.ipAddress)}</td></tr>` : ''}
      ${data.details ? `<tr><td style="${textStyles.muted} padding-right:12px;">Details:</td><td style="${textStyles.paragraph} margin:0;">${escapeHtml(data.details)}</td></tr>` : ''}
    </table>
    <p style="${textStyles.paragraph}">
      If this was you, no further action is needed. If you don't recognize this activity,
      please change your password immediately and enable two-factor authentication.
    </p>
    <a href="{{APP_URL}}/app/settings/security" class="button" style="display:inline-block; padding:12px 28px; background-color:#6366f1; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:600; font-size:14px;">
      Review Security Settings
    </a>
  `

  const bodyText = `Hi${data.userName ? ` ${data.userName}` : ''},

We detected a security event on your account:
${description}

Time: ${data.eventTime}${data.ipAddress ? `\nIP: ${data.ipAddress}` : ''}${data.details ? `\nDetails: ${data.details}` : ''}

If this was you, no further action is needed. If you don't recognize this activity, please change your password immediately and enable two-factor authentication.

Review your security settings at {{APP_URL}}/app/settings/security
`

  return {
    html: renderEmail(subject, bodyHtml),
    text: bodyText,
  }
}
