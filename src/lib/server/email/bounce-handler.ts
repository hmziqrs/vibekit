import { newsletterSubscriber } from '$lib/server/db/schema'
import type { DrizzleDb } from '$lib/server/services/types'
import { eq } from 'drizzle-orm'

export async function handleBounce(db: DrizzleDb, emailAddress: string): Promise<void> {
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
