const BRAND_COLOR = '#6366f1'
const BRAND_HOVER = '#4f46e5'
const BG_COLOR = '#0a0a0b'
const SURFACE_COLOR = '#141416'
const TEXT_PRIMARY = '#ededed'
const TEXT_SECONDARY = '#a0a0a5'
const TEXT_MUTED = '#6b6b70'
const BORDER_COLOR = '#1f1f24'

export function renderEmail(title: string, bodyHtml: string, previewText = ''): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  ${previewText ? `<title>${escapeHtml(previewText)}</title>` : ''}
  <style>
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; background-color: ${BG_COLOR}; }
    a { color: ${BRAND_COLOR}; }
    .button { display: inline-block; padding: 12px 28px; background-color: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; }
    .button:hover { background-color: ${BRAND_HOVER}; }
  </style>
</head>
<body style="margin:0; padding:0; background-color:${BG_COLOR}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG_COLOR}; min-height:100%;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px; width:100%;">
          <tr>
            <td style="text-align:center; padding-bottom:32px;">
              <h1 style="margin:0; font-size:20px; font-weight:700; color:${TEXT_PRIMARY};">${escapeHtml(title)}</h1>
            </td>
          </tr>
          <tr>
            <td style="background-color:${SURFACE_COLOR}; border:1px solid ${BORDER_COLOR}; border-radius:12px; padding:32px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="text-align:center; padding-top:24px; color:${TEXT_MUTED}; font-size:12px;">
              <p style="margin:0;">Vibekit &mdash; SvelteKit SaaS Boilerplate</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export const textStyles = {
  heading: `color:${TEXT_PRIMARY}; font-size:16px; font-weight:600; margin:0 0 12px;`,
  muted: `color:${TEXT_MUTED}; font-size:13px; line-height:1.5; margin:0;`,
  paragraph: `color:${TEXT_SECONDARY}; font-size:14px; line-height:1.6; margin:0 0 16px;`,
}
