import { contactSubmission } from '$lib/server/db/schema'
import { dbRateLimitCheck } from '$lib/server/rate-limit'
import { contactSchema } from '$lib/validators/contact'
import { fail } from '@sveltejs/kit'

import type { Actions } from './$types'

export const actions: Actions = {
  default: async ({ request, locals, getClientAddress }) => {
    const { db } = locals.services
    const ip = getClientAddress()
    const rateResult = await dbRateLimitCheck(db, `contact:${ip}`, 5, 60_000)
    if (!rateResult.allowed) {
      return fail(429, {
        errors: [{ field: '', message: 'Too many requests. Please try again later.' }],
        values: {},
      })
    }

    const formData = await request.formData()
    const data = Object.fromEntries(formData)

    const parsed = contactSchema.safeParse(data)
    if (!parsed.success) {
      return fail(400, {
        errors: parsed.error.issues.map((i) => ({
          field: i.path[0]?.toString() ?? '',
          message: i.message,
        })),
        values: data,
      })
    }

    const { email, env } = locals.services

    await db.insert(contactSubmission).values({
      email: parsed.data.email,
      message: parsed.data.message,
      name: parsed.data.name,
      subject: parsed.data.subject,
    })

    const notifyEmail = env.contactNotificationEmail
    if (notifyEmail && notifyEmail.length > 0) {
      const result = await email.send({
        from: 'noreply@vibekit.com',
        subject: `Contact form: ${parsed.data.subject}`,
        text: `Name: ${parsed.data.name}\nEmail: ${parsed.data.email}\nSubject: ${parsed.data.subject}\n\nMessage:\n${parsed.data.message}`,
        to: notifyEmail,
      })
      if (!result.ok) {
        console.error('Failed to send contact notification email:', result.reason)
      }
    }

    return { success: true }
  },
}
