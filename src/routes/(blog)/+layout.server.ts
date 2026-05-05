import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = ({ locals }) => ({
  cfToken: locals.services?.env.publicCfWebAnalyticsToken ?? '',
})
