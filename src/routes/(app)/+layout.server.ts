import { redirect } from '@sveltejs/kit'

import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ locals, url }) => {
  if (!locals.user) {
    throw redirect(302, `/login?next=${encodeURIComponent(url.pathname)}`)
  }
}
