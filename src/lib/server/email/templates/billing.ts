import { escapeHtml, renderEmail, textStyles } from './base'

export function renderPaymentFailed(
  userName: string,
  planName: string,
  retryDate?: string
): { html: string; text: string } {
  const retryText = retryDate
    ? `We'll try again on ${escapeHtml(retryDate)}.`
    : "We'll try again shortly."
  const bodyHtml = `
    <p style="${textStyles.paragraph}">Hi ${escapeHtml(userName)},</p>
    <p style="${textStyles.paragraph}">We were unable to process your payment for the <strong>${escapeHtml(planName)}</strong> plan.</p>
    <p style="${textStyles.paragraph}">${retryText} Please update your payment method to avoid any interruption to your service.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:16px 0;">
          <a href="/app/settings/billing" class="button" style="display:inline-block; padding:12px 28px; background-color:#6366f1; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:600; font-size:14px;">Update Payment Method</a>
        </td>
      </tr>
    </table>
    <p style="${textStyles.muted}">If your payment method is already up to date, no action is needed.</p>
  `
  return {
    html: renderEmail('Payment Failed', bodyHtml, 'Action required: update your payment method'),
    text: `Hi ${userName},\n\nWe were unable to process your payment for the ${planName} plan.\n\n${retryText} Please update your payment method at /app/settings/billing to avoid service interruption.`,
  }
}

export function renderSubscriptionCanceled(
  userName: string,
  planName: string,
  endDate: string
): { html: string; text: string } {
  const bodyHtml = `
    <p style="${textStyles.paragraph}">Hi ${escapeHtml(userName)},</p>
    <p style="${textStyles.paragraph}">Your <strong>${escapeHtml(planName)}</strong> subscription has been canceled. You'll have access until <strong>${escapeHtml(endDate)}</strong>.</p>
    <p style="${textStyles.muted}">You can reactivate your subscription at any time from your billing settings.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:16px 0;">
          <a href="/app/settings/billing" class="button" style="display:inline-block; padding:12px 28px; background-color:#6366f1; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:600; font-size:14px;">Reactivate Subscription</a>
        </td>
      </tr>
    </table>
  `
  return {
    html: renderEmail('Subscription Canceled', bodyHtml, `Your ${planName} plan has been canceled`),
    text: `Hi ${userName},\n\nYour ${planName} subscription has been canceled. You'll have access until ${endDate}.\n\nYou can reactivate anytime at /app/settings/billing.`,
  }
}

export interface PaymentSucceededData {
  amount: string
  periodEnd: string
  planName: string
  userName: string
}

export function renderPaymentSucceeded(data: PaymentSucceededData): { html: string; text: string } {
  const { amount, periodEnd, planName, userName } = data
  const bodyHtml = `
    <p style="${textStyles.paragraph}">Hi ${escapeHtml(userName)},</p>
    <p style="${textStyles.paragraph}">Your payment of <strong>${escapeHtml(amount)}</strong> for the <strong>${escapeHtml(planName)}</strong> plan was successful.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0; background:#141416; border-radius:8px;">
      <tr>
        <td style="padding:16px;">
          <p style="${textStyles.muted}; margin:0 0 8px 0;">Plan</p>
          <p style="color:#ededed; font-size:14px; margin:0 0 16px 0;">${escapeHtml(planName)}</p>
          <p style="${textStyles.muted}; margin:0 0 8px 0;">Amount</p>
          <p style="color:#ededed; font-size:14px; margin:0 0 16px 0;">${escapeHtml(amount)}</p>
          <p style="${textStyles.muted}; margin:0 0 8px 0;">Next billing date</p>
          <p style="color:#ededed; font-size:14px; margin:0;">${escapeHtml(periodEnd)}</p>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:8px 0;">
          <a href="/app/settings/billing" class="button" style="display:inline-block; padding:12px 28px; background-color:#6366f1; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:600; font-size:14px;">Manage Subscription</a>
        </td>
      </tr>
    </table>
  `
  return {
    html: renderEmail('Payment Receipt', bodyHtml, `Payment of ${amount} confirmed`),
    text: `Hi ${userName},\n\nPayment of ${amount} for ${planName} was successful.\n\nNext billing date: ${periodEnd}\n\nManage your subscription at /app/settings/billing.`,
  }
}

export function renderTrialEndingSoon(
  userName: string,
  planName: string,
  trialEndDate: string
): { html: string; text: string } {
  const bodyHtml = `
    <p style="${textStyles.paragraph}">Hi ${escapeHtml(userName)},</p>
    <p style="${textStyles.paragraph}">Your free trial of <strong>${escapeHtml(planName)}</strong> ends on <strong>${escapeHtml(trialEndDate)}</strong>.</p>
    <p style="${textStyles.paragraph}">To keep your access, add a payment method before the trial expires.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:16px 0;">
          <a href="/app/settings/billing" class="button" style="display:inline-block; padding:12px 28px; background-color:#6366f1; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:600; font-size:14px;">Add Payment Method</a>
        </td>
      </tr>
    </table>
    <p style="${textStyles.muted}">No charges will be made until your trial ends.</p>
  `
  return {
    html: renderEmail(
      'Trial Ending Soon',
      bodyHtml,
      `Your ${planName} trial ends on ${trialEndDate}`
    ),
    text: `Hi ${userName},\n\nYour free trial of ${planName} ends on ${trialEndDate}.\n\nAdd a payment method at /app/settings/billing to keep your access.`,
  }
}

export interface PlanChangedData {
  effectiveDate: string
  newPlanName: string
  oldPlanName: string
  userName: string
}

export function renderPlanChanged(data: PlanChangedData): { html: string; text: string } {
  const { effectiveDate, newPlanName, oldPlanName, userName } = data
  const isUpgrade = true
  const direction = isUpgrade ? 'upgraded' : 'changed'
  const bodyHtml = `
    <p style="${textStyles.paragraph}">Hi ${escapeHtml(userName)},</p>
    <p style="${textStyles.paragraph}">Your subscription has been ${direction} from <strong>${escapeHtml(oldPlanName)}</strong> to <strong>${escapeHtml(newPlanName)}</strong>.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0; background:#141416; border-radius:8px;">
      <tr>
        <td style="padding:16px;">
          <p style="${textStyles.muted}; margin:0 0 8px 0;">Previous plan</p>
          <p style="color:#ededed; font-size:14px; margin:0 0 16px 0;">${escapeHtml(oldPlanName)}</p>
          <p style="${textStyles.muted}; margin:0 0 8px 0;">New plan</p>
          <p style="color:#6366f1; font-size:14px; font-weight:600; margin:0 0 16px 0;">${escapeHtml(newPlanName)}</p>
          <p style="${textStyles.muted}; margin:0 0 8px 0;">Effective</p>
          <p style="color:#ededed; font-size:14px; margin:0;">${escapeHtml(effectiveDate)}</p>
        </td>
      </tr>
    </table>
    <p style="${textStyles.muted}">Proration charges will appear on your next invoice.</p>
  `
  return {
    html: renderEmail('Subscription Updated', bodyHtml, `Plan changed to ${newPlanName}`),
    text: `Hi ${userName},\n\nYour subscription has been ${direction} from ${oldPlanName} to ${newPlanName}.\n\nEffective: ${effectiveDate}\n\nProration charges will appear on your next invoice.`,
  }
}
