import type { createAuth } from '$lib/server/auth'
import type { AppServices } from '$lib/server/services'

type Auth = ReturnType<typeof createAuth>
type AuthUser = Auth['$Infer']['Session']['user']
type AuthSession = Auth['$Infer']['Session']['session']

// See https://svelte.dev/docs/kit/types#app.d.ts
// For information about these interfaces
declare global {
  namespace App {
    interface Platform {
      env: Env
      ctx: ExecutionContext
      caches: CacheStorage
      cf?: IncomingRequestCfProperties
    }

    interface Locals {
      impersonatedBy?: { email: string; id: string; name: string }
      services: AppServices
      user?: AuthUser
      session?: AuthSession
      auth: Auth
    }

    // Interface Error {}
    // Interface PageData {}
    // Interface PageState {}
  }
}
