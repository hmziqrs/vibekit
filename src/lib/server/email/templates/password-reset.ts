import { escapeHtml, renderEmail, textStyles } from './base'

export function renderPasswordReset(
  resetUrl: string,
  userName?: string
): { html: string; text: string } {
  const greeting = userName ? escapeHtml(userName) : 'there'
  const bodyHtml = `
    <p style="${textStyles.paragraph}">Hi ${greeting},</p>
    <p style="${textStyles.paragraph}">We received a request to reset your password. Click the button below to choose a new one:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:8px 0 24px;">
          <a href="${escapeHtml(resetUrl)}" class="button" style="display:inline-block; padding:12px 28px; background-color:#6366f1; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:600; font-size:14px;">Reset Password</a>
        </td>
      </tr>
    </table>
    <p style="${textStyles.muted}">If the button doesn't work, copy and paste this link into your browser:<br>
    <a href="${escapeHtml(resetUrl)}" style="color:#6366f1; word-break:break-all;">${escapeHtml(resetUrl)}</a></p>
    <p style="${textStyles.muted}">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
  `
  return {
    html: renderEmail('Reset Your Password', bodyHtml, 'Reset your Vibekit password'),
    text: `Hi ${greeting},\n\nReset your password:\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
  }
}
