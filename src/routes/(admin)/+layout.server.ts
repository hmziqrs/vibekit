import { redirect } from '@sveltejs/kit'

import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ depends, locals, url }) => {
  depends('app:auth')
  if (!locals.user) {
    throw redirect(302, `/login?next=${encodeURIComponent(url.pathname)}`)
  }
  if (locals.user.role !== 'admin') {
    throw redirect(302, '/app/dashboard')
  }
}
