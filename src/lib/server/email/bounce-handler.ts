import { eq } from 'drizzle-orm'

import { newsletterSubscriber } from '../db/schema'
import type { AppDb } from '../services/types'

export async function handleBounce(db: AppDb, emailAddress: string): Promise<void> {
  const subscriber = await db
    .select({ id: newsletterSubscriber.id })
    .from(newsletterSubscriber)
    .where(eq(newsletterSubscriber.email, emailAddress))
    .get()

  if (subscriber) {
    await db
      .update(newsletterSubscriber)
      .set({ status: 'bounced', updatedAt: new Date() })
      .where(eq(newsletterSubscriber.id, subscriber.id))
  }
}
