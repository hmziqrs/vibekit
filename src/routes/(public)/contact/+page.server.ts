import { getDb } from '$lib/server/db'
import { contactSubmission } from '$lib/server/db/schema'
import { contactSchema } from '$lib/validators/contact'
import { fail } from '@sveltejs/kit'

import type { Actions } from './$types'

export const actions: Actions = {
  default: async ({ request, platform }) => {
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

    const db = platform?.env?.DB
    if (!db) {
      return fail(500, {
        errors: [{ field: '', message: 'Service temporarily unavailable' }],
        values: data,
      })
    }

    await getDb(db).insert(contactSubmission).values({
      name: parsed.data.name,
      email: parsed.data.email,
      subject: parsed.data.subject,
      message: parsed.data.message,
    })

    const sendEmail = platform?.env?.SEND_EMAIL
    const notifyEmail = platform?.env?.CONTACT_NOTIFICATION_EMAIL
    if (sendEmail && notifyEmail) {
      try {
        await sendEmail.send({
          from: { email: 'noreply@vibekit.com', name: 'Vibekit Contact Form' },
          to: [{ email: notifyEmail }],
          subject: `Contact form: ${parsed.data.subject}`,
          text: `Name: ${parsed.data.name}\nEmail: ${parsed.data.email}\nSubject: ${parsed.data.subject}\n\nMessage:\n${parsed.data.message}`,
        })
      } catch (err) {
        console.error('Failed to send contact notification email:', err)
      }
    }

    return { success: true }
  },
}
