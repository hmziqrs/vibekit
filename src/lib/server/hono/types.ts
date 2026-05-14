import type { OrgRole, TeamRole } from '$lib/permissions'
import type { createAuthForHono } from '$lib/server/auth-hono'
import type { AppServices, DrizzleDb } from '$lib/server/services/types'

export type NarrowedServices = Omit<AppServices, 'db'> & { db: DrizzleDb }

export interface Bindings {
  DB?: D1Database
  R2_BLOG_MEDIA?: R2Bucket
  STRIPE_SECRET_KEY?: string
  STRIPE_WEBHOOK_SECRET?: string
  VAPID_PUBLIC_KEY?: string
  VAPID_PRIVATE_KEY?: string
  VAPID_SUBJECT?: string
}

export interface Variables {
  services: NarrowedServices
  auth: ReturnType<typeof createAuthForHono>
  user: ReturnType<typeof createAuthForHono>['$Infer']['Session']['user'] | null
  session: ReturnType<typeof createAuthForHono>['$Infer']['Session']['session'] | null
  apiKey: {
    id: string
    keyPrefix: string
    name: string
    rateLimit: number | null
    requestCount: number
    scopes: string[]
    userId: string
  } | null
  resource: unknown
}

export interface Env {
  Bindings: Bindings & {
    __services?: NarrowedServices
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

export interface TeamMemberContext {
  team: {
    createdAt: Date
    deletedAt: Date | null
    description: string | null
    id: string
    name: string
    organizationId: string
    updatedAt: Date
  }
  teamMembership: {
    id: string
    joinedAt: Date
    role: TeamRole
    teamId: string
    userId: string
  } | null
}

export type TeamEnvVariables = OrgEnvVariables & TeamMemberContext

export interface TeamEnv {
  Bindings: Bindings
  Variables: TeamEnvVariables
}
