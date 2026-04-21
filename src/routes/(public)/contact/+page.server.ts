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

    return { success: true }
  },
}
