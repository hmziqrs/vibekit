import type { AppDb, EmailClient, EmailResult } from '../services/types'
import { EmailQueue } from './queue'
import { renderAccountDeleted, type AccountDeletedData } from './templates/account-deleted'
import { renderAccountSuspended, type AccountSuspendedData } from './templates/account-suspended'
import {
  renderPaymentFailed,
  renderPaymentSucceeded,
  type PaymentSucceededData,
  renderPlanChanged,
  type PlanChangedData,
  renderSubscriptionCanceled,
  renderTrialEndingSoon,
} from './templates/billing'
import {
  renderCommentNotification,
  type CommentNotificationData,
} from './templates/comment-notification'
import {
  renderContactNotification,
  type ContactNotificationData,
} from './templates/contact-notification'
import { renderEmailVerification } from './templates/email-verification'
import { renderNewsletterConfirm } from './templates/newsletter-confirm'
import { renderPasswordReset } from './templates/password-reset'
import { renderSecurityAlert, type SecurityAlertData } from './templates/security-alert'
import { renderTeamInvite, type TeamInviteData } from './templates/team-invite'
import { renderWelcome } from './templates/welcome'

export class EmailService {
  private queue: EmailQueue

  constructor(client: EmailClient, db?: AppDb) {
    this.queue = new EmailQueue(client, db)
  }

  async sendNewsletterConfirmation(
    email: string,
    confirmUrl: string,
    options?: { unsubscribeToken?: string }
  ): Promise<void> {
    const { html, text } = renderNewsletterConfirm(confirmUrl)
    const unsubUrl = options?.unsubscribeToken
      ? `<https://vibekit.com/api/newsletter/unsubscribe?token=${options.unsubscribeToken}>`
      : '<https://vibekit.com/api/newsletter/unsubscribe>'
    this.queue.enqueue({
      from: 'Vibekit Blog <noreply@vibekit.com>',
      headers: {
        'List-Unsubscribe': unsubUrl,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      html,
      subject: 'Confirm your subscription to Vibekit Blog',
      text,
      to: email,
    })
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
    data: { planName: string; retryDate?: string; userName: string }
  ): Promise<EmailResult> {
    const { html, text } = renderPaymentFailed(data.userName, data.planName, data.retryDate)
    return this.queue.sendImmediate({
      from: 'Vibekit <noreply@vibekit.com>',
      html,
      subject: 'Payment failed — action required',
      text,
      to: email,
    })
  }

  async sendPaymentSucceeded(email: string, data: PaymentSucceededData): Promise<EmailResult> {
    const { html, text } = renderPaymentSucceeded(data)
    return this.queue.sendImmediate({
      from: 'Vibekit <noreply@vibekit.com>',
      html,
      subject: `Payment receipt — ${data.amount}`,
      text,
      to: email,
    })
  }

  async sendSubscriptionCanceled(
    email: string,
    data: { endDate: string; planName: string; userName: string }
  ): Promise<EmailResult> {
    const { html, text } = renderSubscriptionCanceled(data.userName, data.planName, data.endDate)
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
    data: { planName: string; trialEndDate: string; userName: string }
  ): Promise<EmailResult> {
    const { html, text } = renderTrialEndingSoon(data.userName, data.planName, data.trialEndDate)
    return this.queue.sendImmediate({
      from: 'Vibekit <noreply@vibekit.com>',
      html,
      subject: `Your ${data.planName} trial ends soon`,
      text,
      to: email,
    })
  }

  async sendPlanChanged(email: string, data: PlanChangedData): Promise<EmailResult> {
    const { html, text } = renderPlanChanged(data)
    return this.queue.sendImmediate({
      from: 'Vibekit <noreply@vibekit.com>',
      html,
      subject: `Subscription updated — ${data.newPlanName}`,
      text,
      to: email,
    })
  }

  async sendSecurityAlert(email: string, data: SecurityAlertData): Promise<EmailResult> {
    const { html, text } = renderSecurityAlert(data)
    const subject = `Security alert: ${data.eventType.replace(/_/g, ' ')}`
    return this.queue.sendImmediate({
      from: 'Vibekit Security <noreply@vibekit.com>',
      html,
      subject,
      text,
      to: email,
    })
  }

  async sendAccountSuspended(email: string, data: AccountSuspendedData): Promise<EmailResult> {
    const { html, text } = renderAccountSuspended(data)
    const subject = data.expiresAt
      ? 'Your account has been temporarily suspended'
      : 'Your account has been suspended'
    return this.queue.sendImmediate({
      from: 'Vibekit <noreply@vibekit.com>',
      html,
      subject,
      text,
      to: email,
    })
  }

  async sendTeamInvite(email: string, data: TeamInviteData): Promise<EmailResult> {
    const { html, text } = renderTeamInvite(data)
    const subject = `${data.inviterName} invited you to join ${data.organizationName}`
    return this.queue.sendImmediate({
      from: 'Vibekit <noreply@vibekit.com>',
      html,
      subject,
      text,
      to: email,
    })
  }

  async sendAccountDeleted(email: string, data: AccountDeletedData): Promise<EmailResult> {
    const { html, text } = renderAccountDeleted(data)
    return this.queue.sendImmediate({
      from: 'Vibekit <noreply@vibekit.com>',
      html,
      subject: 'Your account has been deleted',
      text,
      to: email,
    })
  }

  async sendCommentNotification(
    email: string,
    data: CommentNotificationData
  ): Promise<EmailResult> {
    const { html, text } = renderCommentNotification(data)
    return this.queue.sendImmediate({
      from: 'Vibekit Blog <noreply@vibekit.com>',
      html,
      subject: `New comment on "${data.postTitle}"`,
      text,
      to: email,
    })
  }
}

export function createEmailService(client: EmailClient, db?: AppDb): EmailService {
  return new EmailService(client, db)
}
