import { createAuth } from '$lib/server/auth'

type Auth = ReturnType<typeof createAuth>
type AuthUser = Auth['$Infer']['Session']['user']
type AuthSession = Auth['$Infer']['Session']['session']

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    interface Platform {
      env: Env
      ctx: ExecutionContext
      caches: CacheStorage
      cf?: IncomingRequestCfProperties
    }

    interface Locals {
      user?: AuthUser
      session?: AuthSession
      auth: Auth
    }

    // interface Error {}
    // interface PageData {}
    // interface PageState {}
  }
}

export {}
