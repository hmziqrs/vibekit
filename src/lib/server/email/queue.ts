import { and, asc, eq, sql } from 'drizzle-orm'

import { emailQueue } from '../db/schema'
import type { AppDb } from '../services/types'
import type { EmailClient, EmailMessage, EmailResult } from '../services/types'

export class EmailQueue {
  private client: EmailClient
  private db: AppDb | null

  constructor(client: EmailClient, db?: AppDb) {
    this.client = client
    this.db = db ?? null
  }

  async enqueue(
    message: EmailMessage,
    options?: { maxRetries?: number; onFinalFailure?: () => Promise<void> }
  ): Promise<void> {
    if (!this.db) {
      // Fallback: send immediately without persistence
      await this.client.send(message)
      return
    }

    const id = crypto.randomUUID()
    const maxRetries = options?.maxRetries ?? 3

    await this.db.insert(emailQueue).values({
      attempts: 0,
      id,
      maxRetries,
      message: {
        from: message.from,
        headers: message.headers,
        html: message.html,
        replyTo: message.replyTo,
        subject: message.subject,
        text: message.text,
        to: message.to,
      },
      status: 'pending',
    })

    // Try sending immediately
    const result = await this.client.send(message)

    if (result.ok) {
      await this.db
        .update(emailQueue)
        .set({
          attempts: 1,
          processedAt: new Date(),
          status: 'sent',
        })
        .where(and(eq(emailQueue.id, id), eq(emailQueue.status, 'pending')))
    } else {
      // Mark for retry
      const nextRetry = new Date(Date.now() + 60_000)
      await this.db
        .update(emailQueue)
        .set({
          attempts: 1,
          errorMessage: result.reason,
          lastAttemptAt: new Date(),
          nextRetryAt: nextRetry,
        })
        .where(and(eq(emailQueue.id, id), eq(emailQueue.status, 'pending')))
    }
  }

  async sendImmediate(message: EmailMessage): Promise<EmailResult> {
    return this.client.send(message)
  }

  /** Process pending and due-for-retry emails. Called by cron. Uses atomic claim to prevent duplicates. */
  async processPending(db: AppDb): Promise<{ failed: number; retried: number; sent: number }> {
    const now = new Date()
    const stats = { failed: 0, retried: 0, sent: 0 }

    const pending = await db
      .select()
      .from(emailQueue)
      .where(
        sql`${emailQueue.status} = 'pending' OR (${emailQueue.status} = 'failed' AND ${emailQueue.nextRetryAt} IS NOT NULL AND ${emailQueue.nextRetryAt} <= ${now})`
      )
      .orderBy(asc(emailQueue.createdAt))
      .limit(50)

    for (const item of pending) {
      // Atomically claim this email by setting status to 'processing'
      // Only proceed if the status was still 'pending' or 'failed' (not already claimed by another worker)
      const claimed = await db
        .update(emailQueue)
        .set({ lastAttemptAt: new Date(), status: 'processing' })
        .where(and(eq(emailQueue.id, item.id), sql`${emailQueue.status} = ${item.status}`))
        .returning({ id: emailQueue.id })

      // If no rows were updated, another worker already claimed this email
      if (!claimed || claimed.length === 0) continue

      const result = await this.client.send(item.message as EmailMessage)
      const attempts = item.attempts + 1

      if (result.ok) {
        await db
          .update(emailQueue)
          .set({
            attempts,
            processedAt: new Date(),
            status: 'sent',
          })
          .where(eq(emailQueue.id, item.id))
        stats.sent++
      } else if (attempts >= item.maxRetries) {
        await db
          .update(emailQueue)
          .set({
            attempts,
            errorMessage: result.reason,
            lastAttemptAt: new Date(),
            processedAt: new Date(),
            status: 'failed',
          })
          .where(eq(emailQueue.id, item.id))
        stats.failed++
      } else {
        const delay = Math.min(60_000 * Math.pow(2, attempts - 1), 15 * 60_000)
        await db
          .update(emailQueue)
          .set({
            attempts,
            errorMessage: result.reason,
            lastAttemptAt: new Date(),
            nextRetryAt: new Date(Date.now() + delay),
            status: 'failed',
          })
          .where(eq(emailQueue.id, item.id))
        stats.retried++
      }
    }

    return stats
  }

  /** Remove sent/failed emails older than the given number of days. */
  async cleanup(db: AppDb, olderThanDays = 30): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)
    const deleted = await db
      .delete(emailQueue)
      .where(
        sql`(${emailQueue.status} = 'sent' OR ${emailQueue.status} = 'failed') AND ${emailQueue.processedAt} IS NOT NULL AND ${emailQueue.processedAt} < ${cutoff}`
      )
      .returning({ id: emailQueue.id })
    return deleted.length
  }
}
