// Auth context is set up in root +layout.svelte via setContext('auth', ...)
// Components consume it via getContext('auth') instead of duplicating useSession + derived

export interface AuthContext {
  user: {
    bio?: string | null
    createdAt?: string
    deletedAt?: string | null
    displayName?: string | null
    email: string
    id: string
    image?: string | null
    name: string
    role?: string
    status?: 'active' | 'suspended' | 'deactivated' | null
    timezone?: string | null
  } | null
  isPending: boolean
  isAdmin: boolean
  logout: (redirectTo?: string) => Promise<void>
}
