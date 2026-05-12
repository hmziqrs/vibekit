import { escapeHtml, renderEmail, textStyles } from './base'

export function renderNewsletterConfirm(confirmUrl: string): { html: string; text: string } {
  const bodyHtml = `
    <p style="${textStyles.paragraph}">Please confirm your subscription to the Vibekit newsletter.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:8px 0 24px;">
          <a href="${escapeHtml(confirmUrl)}" class="button" style="display:inline-block; padding:12px 28px; background-color:#6366f1; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:600; font-size:14px;">Confirm Subscription</a>
        </td>
      </tr>
    </table>
    <p style="${textStyles.muted}">If the button doesn't work, copy and paste this link into your browser:<br>
    <a href="${escapeHtml(confirmUrl)}" style="color:#6366f1; word-break:break-all;">${escapeHtml(confirmUrl)}</a></p>
    <p style="${textStyles.muted}">If you didn't subscribe, you can safely ignore this email.</p>
  `
  return {
    html: renderEmail(
      'Confirm Your Subscription',
      bodyHtml,
      'Confirm your Vibekit newsletter subscription'
    ),
    text: `Confirm your subscription to Vibekit newsletter:\n\n${confirmUrl}\n\nIf you didn't subscribe, ignore this email.`,
  }
}
