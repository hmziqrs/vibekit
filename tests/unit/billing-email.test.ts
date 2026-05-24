import {
  renderPaymentFailed,
  renderPaymentSucceeded,
  renderPlanChanged,
  renderSubscriptionCanceled,
  renderTrialEndingSoon,
} from '$lib/server/email/templates/billing'
import { describe, expect, it } from 'vitest'

describe('billing email templates', () => {
  describe('renderPaymentFailed', () => {
    it('renders html and text with retry date', () => {
      const { html, text } = renderPaymentFailed('Alice', 'Pro', 'May 20, 2026')
      expect(html).toContain('Alice')
      expect(html).toContain('Pro')
      expect(html).toContain('May 20, 2026')
      expect(html).toContain('Payment Failed')
      expect(html).toContain('Update Payment Method')
      expect(text).toContain('Alice')
      expect(text).toContain('Pro')
      expect(text).toContain('May 20, 2026')
    })

    it('renders without retry date', () => {
      const { html, text } = renderPaymentFailed('Bob', 'Starter')
      expect(html).toContain("We'll try again shortly.")
      expect(text).toContain("We'll try again shortly.")
    })

    it('escapes html in user inputs', () => {
      const { html } = renderPaymentFailed('<script>alert(1)</script>', 'Pro')
      expect(html).not.toContain('<script>')
      expect(html).toContain('&lt;script&gt;')
    })
  })

  describe('renderSubscriptionCanceled', () => {
    it('renders cancellation email with end date', () => {
      const { html, text } = renderSubscriptionCanceled('Alice', 'Pro', 'June 1, 2026')
      expect(html).toContain('Alice')
      expect(html).toContain('Pro')
      expect(html).toContain('June 1, 2026')
      expect(html).toContain('Reactivate Subscription')
      expect(html).toContain('Subscription Canceled')
      expect(text).toContain('canceled')
      expect(text).toContain('June 1, 2026')
    })
  })

  describe('renderPaymentSucceeded', () => {
    it('renders receipt with plan details', () => {
      const { html, text } = renderPaymentSucceeded({
        amount: '$29.00',
        periodEnd: 'June 1, 2026',
        planName: 'Pro',
        userName: 'Alice',
      })
      expect(html).toContain('Alice')
      expect(html).toContain('Pro')
      expect(html).toContain('$29.00')
      expect(html).toContain('June 1, 2026')
      expect(html).toContain('Payment Receipt')
      expect(html).toContain('Manage Subscription')
      expect(text).toContain('$29.00')
      expect(text).toContain('Next billing date: June 1, 2026')
    })
  })

  describe('renderTrialEndingSoon', () => {
    it('renders trial ending notification', () => {
      const { html, text } = renderTrialEndingSoon('Alice', 'Pro', 'May 25, 2026')
      expect(html).toContain('Alice')
      expect(html).toContain('Pro')
      expect(html).toContain('May 25, 2026')
      expect(html).toContain('Add Payment Method')
      expect(html).toContain('Trial Ending Soon')
      expect(html).toContain('No charges will be made until your trial ends.')
      expect(text).toContain('May 25, 2026')
    })
  })

  describe('renderPlanChanged', () => {
    it('renders plan change notification', () => {
      const { html, text } = renderPlanChanged({
        effectiveDate: 'May 15, 2026',
        newPlanName: 'Pro',
        oldPlanName: 'Starter',
        userName: 'Alice',
      })
      expect(html).toContain('Alice')
      expect(html).toContain('Starter')
      expect(html).toContain('Pro')
      expect(html).toContain('May 15, 2026')
      expect(html).toContain('Subscription Updated')
      expect(html).toContain('Proration charges')
      expect(text).toContain('Starter')
      expect(text).toContain('Pro')
    })

    it('shows previous and new plan names', () => {
      const { html } = renderPlanChanged({
        effectiveDate: 'now',
        newPlanName: 'Enterprise',
        oldPlanName: 'Free',
        userName: 'Bob',
      })
      expect(html).toContain('Free')
      expect(html).toContain('Enterprise')
    })
  })
})
