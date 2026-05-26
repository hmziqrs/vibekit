import { waitlistEntry } from '$lib/server/db/schema'
import { dbRateLimitCheck } from '$lib/server/rate-limit'
import { waitlistSchema } from '$lib/validators/waitlist'
import { fail } from '@sveltejs/kit'

import type { Actions } from './$types'

export const actions: Actions = {
  default: async ({ request, locals, getClientAddress }) => {
    const { db } = locals.services
    const ip = getClientAddress()

    const rateResult = await dbRateLimitCheck(db, `waitlist:${ip}`, 3, 60_000)
    if (!rateResult.allowed) {
      return fail(429, {
        errors: [{ field: '', message: 'Too many requests. Please try again later.' }],
        values: {},
      })
    }

    const formData = await request.formData()
    const data = Object.fromEntries(formData)

    const parsed = waitlistSchema.safeParse(data)
    if (!parsed.success) {
      return fail(400, {
        errors: parsed.error.issues.map((i) => ({
          field: i.path[0]?.toString() ?? '',
          message: i.message,
        })),
        values: { email: String(data.email ?? '') },
      })
    }

    await db
      .insert(waitlistEntry)
      .values({
        email: parsed.data.email.toLowerCase(),
        ipAddress: ip,
      })
      .onConflictDoNothing({ target: [waitlistEntry.email] })

    return { success: true }
  },
}
