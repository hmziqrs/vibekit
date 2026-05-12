import type { EmailClient, EmailResult } from '../services/types'
import { EmailQueue } from './queue'
import { renderContactNotification } from './templates/contact-notification'
import type { ContactNotificationData } from './templates/contact-notification'
import { renderEmailVerification } from './templates/email-verification'
import { renderNewsletterConfirm } from './templates/newsletter-confirm'
import { renderPasswordReset } from './templates/password-reset'

export class EmailService {
  private queue: EmailQueue

  constructor(client: EmailClient) {
    this.queue = new EmailQueue(client)
  }

  async sendNewsletterConfirmation(
    email: string,
    confirmUrl: string,
    onBounce?: () => Promise<void>
  ): Promise<void> {
    const { html, text } = renderNewsletterConfirm(confirmUrl)
    this.queue.enqueue(
      {
        from: 'Vibekit Blog <noreply@vibekit.com>',
        html,
        subject: 'Confirm your subscription to Vibekit Blog',
        text,
        to: email,
      },
      { onFinalFailure: onBounce }
    )
  }

  async sendPasswordReset(
    email: string,
    resetUrl: string,
    userName?: string
  ): Promise<EmailResult> {
    const { html, text } = renderPasswordReset(resetUrl, userName)
    return this.queue.sendImmediate({
      from: 'Vibekit <noreply@vibekit.com>',
      html,
      subject: 'Reset your Vibekit password',
      text,
      to: email,
    })
  }

  async sendEmailVerification(
    email: string,
    verifyUrl: string,
    userName?: string
  ): Promise<EmailResult> {
    const { html, text } = renderEmailVerification(verifyUrl, userName)
    return this.queue.sendImmediate({
      from: 'Vibekit <noreply@vibekit.com>',
      html,
      subject: 'Verify your email address',
      text,
      to: email,
    })
  }

  async sendContactNotification(data: ContactNotificationData): Promise<EmailResult> {
    const { html, text } = renderContactNotification(data)
    return this.queue.sendImmediate({
      from: 'Vibekit <noreply@vibekit.com>',
      html,
      subject: `Contact: ${data.subject}`,
      text,
      to: data.email,
    })
  }
}

export function createEmailService(client: EmailClient): EmailService {
  return new EmailService(client)
}
