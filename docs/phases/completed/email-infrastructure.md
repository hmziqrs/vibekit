# Email Infrastructure Implementation Plan

## Status: In Progress

## Overview

Build a proper email system with template rendering, queue with retries, bounce handling, and wire up all stubbed email flows (auth verification, password reset, newsletter confirmation, contact notification).

## Current State

- `EmailClient` interface exists with `send()` method
- Two adapters: Cloudflare Email Workers binding + Node REST API fallback
- No template system — inline HTML duplicated in route handlers
- No queue — fire-and-forget await
- Better Auth email flows stubbed with `console.log` (password reset, email verification)
- `contactNotificationEmail` env var configured but never used
- No bounce handling despite `bounced` status existing in newsletter schema

## Implementation

### 1. Email Template System

Create a lightweight template system using plain TypeScript functions that return HTML strings.

**New file:** `src/lib/server/email/templates/base.ts`

- `renderEmail(title: string, bodyHtml: string, previewText?: string): string`
- Shared HTML wrapper with inline CSS styling (dark theme, brand colors from CSS vars mapped to hex)
- Responsive layout, proper email doctype, fallback for clients without CSS support

**New file:** `src/lib/server/email/templates/newsletter-confirm.ts`

- `renderNewsletterConfirm(confirmUrl: string): { html: string; text: string }`
- Replaces the duplicated inline HTML in hono/index.ts

**New file:** `src/lib/server/email/templates/password-reset.ts`

- `renderPasswordReset(resetUrl: string, userName?: string): { html: string; text: string }`

**New file:** `src/lib/server/email/templates/email-verification.ts`

- `renderEmailVerification(verifyUrl: string, userName?: string): { html: string; text: string }`

**New file:** `src/lib/server/email/templates/contact-notification.ts`

- `renderContactNotification(data: { name: string; email: string; subject: string; message: string }): { html: string; text: string }`

**New file:** `src/lib/server/email/templates/welcome.ts`

- `renderWelcome(userName: string): { html: string; text: string }`

### 2. Wire Better Auth Email Flows

**Modify:** `src/lib/server/auth.ts`

- Import email templates and `EmailClient` via service accessor
- Replace `console.log` stubs in `sendResetPassword` and `sendVerificationEmail`
- Use the existing `createAuth(d1)` factory — add email parameter or use lazy resolution

### 3. Wire Contact Notification

**Modify:** `src/lib/server/hono/index.ts`

- In the contact submission handler, after saving to DB, send notification email to `contactNotificationEmail` if configured

### 4. Extract Newsletter Email Sending

**Modify:** `src/lib/server/hono/index.ts`

- Replace inline newsletter confirmation HTML with `renderNewsletterConfirm()` template
- Deduplicate the two identical send calls into a helper function

### 5. Email Queue with Retries

**New file:** `src/lib/server/email/queue.ts`

- `EmailQueue` class wrapping `EmailClient`
- Maintains an in-memory queue of pending sends
- Retry logic: up to 3 retries with exponential backoff (1s, 5s, 15s)
- Marks newsletter subscribers as `bounced` after all retries fail
- Logs all send attempts for debugging
- `enqueue(message: EmailMessage, options?: { retries?: number; onFinalFailure?: () => Promise<void> }): void`
- `processQueue(): Promise<void>` — processes all pending items

**Integration:**

- The `EmailClient` returned by adapters wraps sends through the queue
- Or: routes call `emailQueue.enqueue()` instead of `email.send()` directly

### 6. Bounce Handling

**New file:** `src/lib/server/email/bounce-handler.ts`

- `handleBounce(emailAddress: string): Promise<void>`
- Looks up newsletter subscriber by email
- Sets status to `bounced` if found
- Logs bounce event to audit log

**Integration in queue:**

- On final retry failure for newsletter confirmation emails, call `handleBounce()`

### 7. Email Service Layer

**New file:** `src/lib/server/email/index.ts`

- `createEmailService(client: EmailClient): EmailService`
- `EmailService` interface:
  - `sendTemplate(to: string, template: EmailTemplate): Promise<EmailResult>`
  - `sendNewsletterConfirmation(email: string, confirmUrl: string): Promise<EmailResult>`
  - `sendPasswordReset(email: string, resetUrl: string, userName?: string): Promise<EmailResult>`
  - `sendEmailVerification(email: string, verifyUrl: string, userName?: string): Promise<EmailResult>`
  - `sendContactNotification(data: ContactFormData): Promise<EmailResult>`

### Files Summary

**New files (9):**

- `src/lib/server/email/index.ts` — EmailService facade
- `src/lib/server/email/queue.ts` — Retry queue
- `src/lib/server/email/bounce-handler.ts` — Bounce tracking
- `src/lib/server/email/templates/base.ts` — Base HTML wrapper
- `src/lib/server/email/templates/newsletter-confirm.ts`
- `src/lib/server/email/templates/password-reset.ts`
- `src/lib/server/email/templates/email-verification.ts`
- `src/lib/server/email/templates/contact-notification.ts`
- `src/lib/server/email/templates/welcome.ts`

**Modified files (3):**

- `src/lib/server/auth.ts` — Wire password reset + email verification
- `src/lib/server/hono/index.ts` — Use templates + queue for email sends
- `src/lib/server/services/types.ts` — Add EmailService to AppServices (optional)

**Test files (2):**

- `tests/unit/email-infrastructure.test.ts` — Template rendering, queue logic, bounce handler
- `tests/e2e/email-infrastructure.spec.ts` — E2E test for auth flows
