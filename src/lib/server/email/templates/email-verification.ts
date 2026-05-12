import { escapeHtml, renderEmail, textStyles } from './base'

export function renderEmailVerification(
  verifyUrl: string,
  userName?: string
): { html: string; text: string } {
  const greeting = userName ? escapeHtml(userName) : 'there'
  const bodyHtml = `
    <p style="${textStyles.paragraph}">Hi ${greeting},</p>
    <p style="${textStyles.paragraph}">Please verify your email address to complete your account setup.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:8px 0 24px;">
          <a href="${escapeHtml(verifyUrl)}" class="button" style="display:inline-block; padding:12px 28px; background-color:#6366f1; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:600; font-size:14px;">Verify Email</a>
        </td>
      </tr>
    </table>
    <p style="${textStyles.muted}">If the button doesn't work, copy and paste this link into your browser:<br>
    <a href="${escapeHtml(verifyUrl)}" style="color:#6366f1; word-break:break-all;">${escapeHtml(verifyUrl)}</a></p>
    <p style="${textStyles.muted}">If you didn't create an account, you can safely ignore this email.</p>
  `
  return {
    html: renderEmail('Verify Your Email', bodyHtml, 'Verify your Vibekit email address'),
    text: `Hi ${greeting},\n\nVerify your email address:\n${verifyUrl}\n\nIf you didn't create an account, ignore this email.`,
  }
}
