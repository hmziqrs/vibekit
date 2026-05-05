import type { EmailClient, EmailMessage, EmailResult } from '../../services/types'

interface EmailRestConfig {
  cfAccountId: string
  cfApiToken: string
  emailFrom: string
}

function readEmailConfig(): EmailRestConfig | null {
  const cfAccountId = process.env.CF_ACCOUNT_ID
  const cfApiToken = process.env.CF_API_TOKEN
  const emailFrom = process.env.EMAIL_FROM
  if (cfAccountId && cfApiToken && emailFrom) {
    return { cfAccountId, cfApiToken, emailFrom }
  }
  return null
}

async function sendViaRest(config: EmailRestConfig, message: EmailMessage): Promise<EmailResult> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${config.cfAccountId}/email/addresses/${encodeURIComponent(config.emailFrom)}/send`

  const recipients = Array.isArray(message.to) ? message.to : [message.to]
  const payload = {
    from: config.emailFrom,
    html: message.html,
    reply_to: message.replyTo,
    subject: message.subject,
    text: message.text,
    to: recipients,
  }

  const response = await fetch(url, {
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${config.cfApiToken}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  if (!response.ok) {
    const body = await response.text()
    return {
      ok: false,
      reason: `Cloudflare Email REST ${response.status}: ${body.slice(0, 200)}`,
    }
  }

  return { delivered: recipients, ok: true }
}

export function createNodeEmail(): EmailClient {
  return {
    async send(message: EmailMessage): Promise<EmailResult> {
      const config = readEmailConfig()

      if (!config) {
        // Dev/no-op mode: log the email instead of sending
        console.log(
          `[dev:email] To: ${message.to}, From: ${message.from}, Subject: ${message.subject}`
        )
        if (message.text) {
          console.log(`[dev:email] Body: ${message.text.slice(0, 200)}`)
        }
        const recipients = Array.isArray(message.to) ? message.to : [message.to]
        return { delivered: recipients, ok: true }
      }

      return sendViaRest(config, message)
    },
  }
}
