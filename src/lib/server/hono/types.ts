import type { OrgRole } from '$lib/permissions'
import type { createAuthForHono } from '$lib/server/auth-hono'
import type { AppServices } from '$lib/server/services/types'

export interface Bindings {
  DB?: D1Database
  R2_BLOG_MEDIA?: R2Bucket
}

export interface Variables {
  services: AppServices
  auth: ReturnType<typeof createAuthForHono>
  user: ReturnType<typeof createAuthForHono>['$Infer']['Session']['user'] | null
  session: ReturnType<typeof createAuthForHono>['$Infer']['Session']['session'] | null
}

export interface Env {
  Bindings: Bindings & {
    __services?: AppServices
    __auth?: Variables['auth']
    __user?: Variables['user']
    __session?: Variables['session']
  }
  Variables: Variables
}

export type ProtectedVariables = Omit<Variables, 'user' | 'session'> & {
  user: NonNullable<Variables['user']>
  session: NonNullable<Variables['session']>
}

export interface ProtectedEnv {
  Bindings: Bindings
  Variables: ProtectedVariables
}

export interface OrgMemberContext {
  membership: {
    id: string
    joinedAt: Date
    organizationId: string
    role: OrgRole
    userId: string
  }
  organization: {
    createdAt: Date
    deletedAt: Date | null
    description: string | null
    id: string
    name: string
    ownerId: string
    slug: string
    updatedAt: Date
  }
}

export type OrgEnvVariables = ProtectedVariables & OrgMemberContext

export interface OrgEnv {
  Bindings: Bindings
  Variables: OrgEnvVariables
}
