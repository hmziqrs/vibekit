// Auth context is set up in root +layout.svelte via setContext('auth', ...)
// Components consume it via getContext('auth') instead of duplicating useSession + derived

export interface AuthContext {
  user: {
    id: string
    name: string
    email: string
    role?: string
    image?: string | null
    createdAt?: string
  } | null
  isPending: boolean
  isAdmin: boolean
  logout: (redirectTo?: string) => Promise<void>
}
