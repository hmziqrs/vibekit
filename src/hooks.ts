import { deLocalizeUrl } from '$lib/paraglide/runtime'
import type { Reroute } from '@sveltejs/kit'

export const reroute: Reroute = (request) => deLocalizeUrl(request.url).pathname

export const handleError = async ({ error, status }: { error: unknown; status: number }) => {
  if (import.meta.env.DEV) {
    console.error(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        status,
      })
    )
  }
}
