import { blogPost } from '$lib/server/db/schema'
import { error } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, locals }) => {
  const { db } = locals.services
  const post = await db.select().from(blogPost).where(eq(blogPost.id, params.id)).get()

  if (!post) {
    throw error(404, 'Post not found')
  }

  return { post }
}
