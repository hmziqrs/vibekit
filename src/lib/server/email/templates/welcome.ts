import { escapeHtml, renderEmail, textStyles } from './base'

export function renderWelcome(userName: string): { html: string; text: string } {
  const bodyHtml = `
    <p style="${textStyles.paragraph}">Welcome to Vibekit, ${escapeHtml(userName)}!</p>
    <p style="${textStyles.paragraph}">Your account has been created successfully. Here are a few things you can do to get started:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr>
        <td style="padding:4px 0;">
          <span style="color:#6366f1; font-weight:600;">&#10003;</span>
          <span style="color:#a0a0a5; font-size:14px; margin-left:8px;">Complete your profile</span>
        </td>
      </tr>
      <tr>
        <td style="padding:4px 0;">
          <span style="color:#6366f1; font-weight:600;">&#10003;</span>
          <span style="color:#a0a0a5; font-size:14px; margin-left:8px;">Explore the dashboard</span>
        </td>
      </tr>
      <tr>
        <td style="padding:4px 0;">
          <span style="color:#6366f1; font-weight:600;">&#10003;</span>
          <span style="color:#a0a0a5; font-size:14px; margin-left:8px;">Check out the blog</span>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:8px 0;">
          <a href="/app/dashboard" class="button" style="display:inline-block; padding:12px 28px; background-color:#6366f1; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:600; font-size:14px;">Go to Dashboard</a>
        </td>
      </tr>
    </table>
  `
  return {
    html: renderEmail('Welcome to Vibekit', bodyHtml, `Welcome aboard, ${userName}!`),
    text: `Welcome to Vibekit, ${userName}!\n\nYour account is ready. Head to your dashboard to get started.`,
  }
}
