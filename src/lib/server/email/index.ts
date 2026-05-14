import type { EmailClient, EmailResult } from '../services/types'
import { EmailQueue } from './queue'
import {
  renderPaymentFailed,
  renderPaymentSucceeded,
  renderPlanChanged,
  renderSubscriptionCanceled,
  renderTrialEndingSoon,
} from './templates/billing'
import {
  renderContactNotification,
  type ContactNotificationData,
} from './templates/contact-notification'
import { renderEmailVerification } from './templates/email-verification'
import { renderNewsletterConfirm } from './templates/newsletter-confirm'
import { renderPasswordReset } from './templates/password-reset'
import { renderWelcome } from './templates/welcome'

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

  async sendWelcome(email: string, userName: string): Promise<EmailResult> {
    const { html, text } = renderWelcome(userName)
    return this.queue.sendImmediate({
      from: 'Vibekit <noreply@vibekit.com>',
      html,
      subject: 'Welcome to Vibekit!',
      text,
      to: email,
    })
  }

  async sendPaymentFailed(
    email: string,
    userName: string,
    planName: string,
    retryDate?: string
  ): Promise<EmailResult> {
    const { html, text } = renderPaymentFailed(userName, planName, retryDate)
    return this.queue.sendImmediate({
      from: 'Vibekit <noreply@vibekit.com>',
      html,
      subject: 'Payment failed — action required',
      text,
      to: email,
    })
  }

  async sendPaymentSucceeded(
    email: string,
    userName: string,
    planName: string,
    amount: string,
    periodEnd: string
  ): Promise<EmailResult> {
    const { html, text } = renderPaymentSucceeded(userName, planName, amount, periodEnd)
    return this.queue.sendImmediate({
      from: 'Vibekit <noreply@vibekit.com>',
      html,
      subject: `Payment receipt — ${amount}`,
      text,
      to: email,
    })
  }

  async sendSubscriptionCanceled(
    email: string,
    userName: string,
    planName: string,
    endDate: string
  ): Promise<EmailResult> {
    const { html, text } = renderSubscriptionCanceled(userName, planName, endDate)
    return this.queue.sendImmediate({
      from: 'Vibekit <noreply@vibekit.com>',
      html,
      subject: 'Subscription canceled',
      text,
      to: email,
    })
  }

  async sendTrialEndingSoon(
    email: string,
    userName: string,
    planName: string,
    trialEndDate: string
  ): Promise<EmailResult> {
    const { html, text } = renderTrialEndingSoon(userName, planName, trialEndDate)
    return this.queue.sendImmediate({
      from: 'Vibekit <noreply@vibekit.com>',
      html,
      subject: `Your ${planName} trial ends soon`,
      text,
      to: email,
    })
  }

  async sendPlanChanged(
    email: string,
    userName: string,
    oldPlanName: string,
    newPlanName: string,
    effectiveDate: string
  ): Promise<EmailResult> {
    const { html, text } = renderPlanChanged(userName, oldPlanName, newPlanName, effectiveDate)
    return this.queue.sendImmediate({
      from: 'Vibekit <noreply@vibekit.com>',
      html,
      subject: `Subscription updated — ${newPlanName}`,
      text,
      to: email,
    })
  }
}

export function createEmailService(client: EmailClient): EmailService {
  return new EmailService(client)
}
