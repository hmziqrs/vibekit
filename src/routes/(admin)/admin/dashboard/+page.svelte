<script lang="ts">
  import { createQuery } from '@tanstack/svelte-query'

  interface UserSummary {
    id: string
    name: string | null
    email: string
    displayName: string | null
    role: string
    status: string
    emailVerified: boolean | null
    image: string | null
    lastLoginAt: Date | null
    createdAt: Date
    updatedAt: Date
  }

  interface PostSummary {
    id: string
    title: string
    slug: string
    status: string
    publishedAt: Date | null
    createdAt: Date
    updatedAt: Date
    deletedAt: Date | null
  }

  interface ItemSummary {
    id: string
    name: string
    description: string | null
    status: string
    createdAt: Date
    updatedAt: Date
  }

  interface UsersResponse {
    users: UserSummary[]
    total: number
  }

  interface PostsResponse {
    posts: PostSummary[]
  }

  interface ItemsResponse {
    items: ItemSummary[]
  }

  const usersQuery = createQuery(() => ({
    queryFn: async () => {
      const res = await fetch('/api/admin/users?limit=1')
      if (!res.ok) throw new Error('Failed to fetch users')
      return res.json() as Promise<UsersResponse>
    },
    queryKey: ['admin', 'users', { limit: 1 }],
    retry: 1,
  }))

  const postsQuery = createQuery(() => ({
    queryFn: async () => {
      const res = await fetch('/api/blog')
      if (!res.ok) throw new Error('Failed to fetch posts')
      return res.json() as Promise<PostsResponse>
    },
    queryKey: ['admin', 'posts'],
    retry: 1,
  }))

  const itemsQuery = createQuery(() => ({
    queryFn: async () => {
      const res = await fetch('/api/items')
      if (!res.ok) throw new Error('Failed to fetch items')
      return res.json() as Promise<ItemsResponse>
    },
    queryKey: ['admin', 'items'],
    retry: 1,
  }))

  const userCount = $derived(usersQuery.data?.total ?? 0)
  const postCount = $derived(postsQuery.data?.posts?.length ?? 0)
  const itemCount = $derived(itemsQuery.data?.items?.length ?? 0)
</script>

<h1 class="text-2xl font-bold text-text-primary">Admin Dashboard</h1>
<p class="mt-1 text-[14px] text-text-muted">Overview of your application.</p>

<!-- Stat cards -->
<div class="mt-8 grid gap-4 sm:grid-cols-3">
  <!-- Users -->
  <div class="rounded-xl border border-white/[0.06] bg-surface p-6">
    <div class="flex items-center justify-between">
      <p class="text-[13px] text-text-muted">Users</p>
      <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-brand">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
        </svg>
      </div>
    </div>
    {#if usersQuery.isPending}
      <div class="mt-3 h-8 w-16 animate-pulse rounded bg-white/[0.06]"></div>
    {:else if usersQuery.error}
      <p class="mt-2 text-[13px] text-red-400">Error loading</p>
    {:else}
      <p class="mt-2 text-2xl font-semibold text-text-primary">{userCount}</p>
    {/if}
  </div>

  <!-- Blog Posts -->
  <div class="rounded-xl border border-white/[0.06] bg-surface p-6">
    <div class="flex items-center justify-between">
      <p class="text-[13px] text-text-muted">Blog Posts</p>
      <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-brand">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      </div>
    </div>
    {#if postsQuery.isPending}
      <div class="mt-3 h-8 w-16 animate-pulse rounded bg-white/[0.06]"></div>
    {:else if postsQuery.error}
      <p class="mt-2 text-[13px] text-red-400">Error loading</p>
    {:else}
      <p class="mt-2 text-2xl font-semibold text-text-primary">{postCount}</p>
    {/if}
  </div>

  <!-- Items -->
  <div class="rounded-xl border border-white/[0.06] bg-surface p-6">
    <div class="flex items-center justify-between">
      <p class="text-[13px] text-text-muted">Items</p>
      <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-brand">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        </svg>
      </div>
    </div>
    {#if itemsQuery.isPending}
      <div class="mt-3 h-8 w-16 animate-pulse rounded bg-white/[0.06]"></div>
    {:else if itemsQuery.error}
      <p class="mt-2 text-[13px] text-red-400">Error loading</p>
    {:else}
      <p class="mt-2 text-2xl font-semibold text-text-primary">{itemCount}</p>
    {/if}
  </div>
</div>

<!-- Recent Activity -->
<div class="mt-8">
  <h2 class="text-[16px] font-semibold text-text-primary">Recent Activity</h2>
  <div class="mt-4 rounded-xl border border-white/[0.06] bg-surface p-6">
    <p class="text-[13px] text-text-muted">
      Activity data will appear here once the audit log system is populated with events.
      Check the <a href="/admin/audit" class="text-brand hover:underline">Audit Log</a> page for detailed records.
    </p>
  </div>
</div>
