import { escapeHtml, renderEmail, textStyles } from './base'

export interface ContactNotificationData {
  email: string
  message: string
  name: string
  subject: string
}

export function renderContactNotification(data: ContactNotificationData): {
  html: string
  text: string
} {
  const bodyHtml = `
    <p style="${textStyles.heading}">New Contact Submission</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr>
        <td style="color:#6b6b70; font-size:12px; padding:4px 8px 4px 0; vertical-align:top; white-space:nowrap;">Name</td>
        <td style="color:#ededed; font-size:14px; padding:4px 8px;">${escapeHtml(data.name)}</td>
      </tr>
      <tr>
        <td style="color:#6b6b70; font-size:12px; padding:4px 8px 4px 0; vertical-align:top; white-space:nowrap;">Email</td>
        <td style="color:#ededed; font-size:14px; padding:4px 8px;"><a href="mailto:${escapeHtml(data.email)}" style="color:#6366f1;">${escapeHtml(data.email)}</a></td>
      </tr>
      <tr>
        <td style="color:#6b6b70; font-size:12px; padding:4px 8px 4px 0; vertical-align:top; white-space:nowrap;">Subject</td>
        <td style="color:#ededed; font-size:14px; padding:4px 8px;">${escapeHtml(data.subject)}</td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0b; border-radius:8px; padding:16px;">
      <tr>
        <td style="color:#a0a0a5; font-size:14px; line-height:1.6; padding:16px; white-space:pre-wrap;">${escapeHtml(data.message)}</td>
      </tr>
    </table>
  `
  return {
    html: renderEmail('Contact Form Submission', bodyHtml, `New contact: ${data.subject}`),
    text: `New contact submission\n\nName: ${data.name}\nEmail: ${data.email}\nSubject: ${data.subject}\n\n${data.message}`,
  }
}
