import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = ({ platform }) => {
	return {
		cfToken: platform?.env?.PUBLIC_CF_WEB_ANALYTICS_TOKEN || ''
	}
}
