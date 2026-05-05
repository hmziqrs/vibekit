import type { EmailClient, EmailMessage, EmailResult } from '../../services/types'

export function createCloudflareEmail(
  sendEmailBinding: { send: (msg: EmailMessage) => Promise<unknown> } | undefined
): EmailClient {
  return {
    async send(message: EmailMessage): Promise<EmailResult> {
      if (!sendEmailBinding) {
        return { ok: false, reason: 'SEND_EMAIL binding not available' }
      }
      try {
        await sendEmailBinding.send(message)
        const recipients = Array.isArray(message.to) ? message.to : [message.to]
        return { delivered: recipients, ok: true }
      } catch (error) {
        return {
          ok: false,
          reason: error instanceof Error ? error.message : 'Unknown email error',
        }
      }
    },
  }
}
