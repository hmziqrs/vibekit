<script lang="ts">
  import { createQuery } from '@tanstack/svelte-query'
  import { cn } from '$lib/utils'

  interface UserRow {
    id: string
    name: string | null
    email: string
    role: 'user' | 'admin' | null
    status: 'active' | 'suspended' | null
    createdAt: string
  }

  let search = $state('')
  let statusFilter = $state('')
  let pageNum = $state(1)
  let openMenuId = $state<string | null>(null)
  let confirmDelete = $state<UserRow | null>(null)
  let searchTimeout: ReturnType<typeof setTimeout> | null = null

  let debouncedSearch = $state('')

  $effect(() => {
    debouncedSearch = search
  })

  const usersQuery = createQuery(() => ({
    queryKey: ['admin', 'users', { search: debouncedSearch, status: statusFilter, page: pageNum }],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (statusFilter) params.set('status', statusFilter)
      params.set('page', String(pageNum))
      params.set('limit', '20')
      const res = await fetch(`/api/admin/users?${params}`)
      if (!res.ok) throw new Error('Failed to fetch users')
      return res.json() as Promise<{ users: UserRow[]; total: number }>
    },
    retry: 1,
  }))

  async function changeRole(user: UserRow, newRole: 'user' | 'admin') {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    if (res.ok) {
      openMenuId = null
      usersQuery.refetch()
    }
  }

  async function toggleStatus(user: UserRow) {
    const newStatus = user.status === 'active' ? 'suspended' : 'active'
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      openMenuId = null
      usersQuery.refetch()
    }
  }

  async function deleteUser(user: UserRow) {
    const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
    if (res.ok) {
      confirmDelete = null
      openMenuId = null
      usersQuery.refetch()
    }
  }

  function toggleMenu(id: string, e: Event) {
    e.stopPropagation()
    openMenuId = openMenuId === id ? null : id
  }

  function closeMenus() {
    openMenuId = null
    confirmDelete = null
  }

  const totalPages = $derived(
    usersQuery.data ? Math.ceil(usersQuery.data.total / 20) : 1,
  )
</script>

<svelte:window onclick={closeMenus} />

<h1 class="text-2xl font-bold text-text-primary">Users</h1>
<p class="mt-1 text-[14px] text-text-muted">Manage user accounts.</p>

<!-- Filters -->
<div class="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
  <div class="relative flex-1 sm:max-w-xs">
    <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
    <input
      type="text"
      placeholder="Search by email or name..."
      bind:value={search}
      class="w-full rounded-lg border border-white/[0.06] bg-surface px-9 py-2 text-[13px] text-text-primary placeholder:text-text-subtle outline-none transition-colors focus:border-brand/50"
    />
  </div>
  <div class="flex gap-2">
    {#each ['all', 'active', 'suspended'] as status}
      <button
        class={cn(
          'rounded-lg px-3 py-2 text-[12px] font-medium transition-colors',
          (statusFilter || 'all') === status
            ? 'bg-brand/10 text-brand'
            : 'text-text-muted hover:bg-white/[0.04] hover:text-text-primary',
        )}
        onclick={() => { statusFilter = status === 'all' ? '' : status; pageNum = 1 }}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </button>
    {/each}
  </div>
</div>

<!-- Table -->
<div class="mt-6 overflow-x-auto rounded-xl border border-white/[0.06] bg-surface">
  {#if usersQuery.isPending}
    <div class="space-y-3 p-6">
      {#each Array(5) as _}
        <div class="h-10 w-full animate-pulse rounded bg-white/[0.06]"></div>
      {/each}
    </div>
  {:else if usersQuery.error}
    <div class="p-6 text-center">
      <p class="text-[13px] text-red-400">Failed to load users. Please try again.</p>
      <button class="mt-3 text-[13px] text-brand hover:underline" onclick={() => usersQuery.refetch()}>Retry</button>
    </div>
  {:else if !usersQuery.data?.users.length}
    <div class="p-6 text-center">
      <p class="text-[13px] text-text-muted">No users found.</p>
    </div>
  {:else}
    <table class="w-full min-w-[640px]">
      <thead>
        <tr class="border-b border-white/[0.06]">
          <th class="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-text-subtle">User</th>
          <th class="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-text-subtle">Role</th>
          <th class="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-text-subtle">Status</th>
          <th class="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-text-subtle">Joined</th>
          <th class="px-5 py-3 text-right text-[12px] font-medium uppercase tracking-wider text-text-subtle">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-white/[0.04]">
        {#each usersQuery.data.users as user}
          <tr class="transition-colors hover:bg-white/[0.02]">
            <td class="px-5 py-3.5">
              <div>
                <p class="text-[13px] font-medium text-text-primary">{user.name || '—'}</p>
                <p class="text-[12px] text-text-subtle">{user.email}</p>
              </div>
            </td>
            <td class="px-5 py-3.5">
              <span class={cn(
                'inline-block rounded-full px-2 py-0.5 text-[11px] font-medium',
                user.role === 'admin' ? 'bg-brand/15 text-brand' : 'bg-white/[0.06] text-text-muted',
              )}>
                {user.role ?? 'user'}
              </span>
            </td>
            <td class="px-5 py-3.5">
              <span class={cn(
                'inline-block rounded-full px-2 py-0.5 text-[11px] font-medium',
                user.status === 'active' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400',
              )}>
                {user.status ?? 'active'}
              </span>
            </td>
            <td class="px-5 py-3.5 text-[12px] text-text-subtle">
              {new Date(user.createdAt).toLocaleDateString()}
            </td>
            <td class="px-5 py-3.5 text-right">
              <div class="relative inline-block">
                <button
                  class="rounded-md p-1.5 text-text-muted transition-colors hover:bg-white/[0.04] hover:text-text-primary"
                  onclick={(e) => toggleMenu(user.id, e)}
                  aria-label="User actions"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
                  </svg>
                </button>
                {#if openMenuId === user.id}
                  <div class="absolute right-0 z-10 mt-1 w-44 rounded-lg border border-white/[0.06] bg-surface py-1 shadow-lg">
                    {#if user.role !== 'admin'}
                      <button class="w-full px-4 py-2 text-left text-[12px] text-text-secondary hover:bg-white/[0.04]" onclick={() => changeRole(user, 'admin')}>Promote to Admin</button>
                    {:else}
                      <button class="w-full px-4 py-2 text-left text-[12px] text-text-secondary hover:bg-white/[0.04]" onclick={() => changeRole(user, 'user')}>Demote to User</button>
                    {/if}
                    {#if user.status === 'active'}
                      <button class="w-full px-4 py-2 text-left text-[12px] text-yellow-400 hover:bg-white/[0.04]" onclick={() => toggleStatus(user)}>Suspend</button>
                    {:else}
                      <button class="w-full px-4 py-2 text-left text-[12px] text-green-400 hover:bg-white/[0.04]" onclick={() => toggleStatus(user)}>Activate</button>
                    {/if}
                    <button class="w-full px-4 py-2 text-left text-[12px] text-red-400 hover:bg-white/[0.04]" onclick={() => { openMenuId = null; confirmDelete = user }}>Delete</button>
                  </div>
                {/if}
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>

    <!-- Pagination -->
    {#if totalPages > 1}
      <div class="flex items-center justify-between border-t border-white/[0.06] px-5 py-3">
        <p class="text-[12px] text-text-subtle">
          Page {pageNum} of {totalPages}
        </p>
        <div class="flex gap-2">
          <button
            class="rounded-lg border border-white/[0.06] px-3 py-1.5 text-[12px] text-text-muted transition-colors hover:bg-white/[0.04] disabled:opacity-40"
            disabled={pageNum <= 1}
            onclick={() => (pageNum -= 1)}
          >
            Previous
          </button>
          <button
            class="rounded-lg border border-white/[0.06] px-3 py-1.5 text-[12px] text-text-muted transition-colors hover:bg-white/[0.04] disabled:opacity-40"
            disabled={pageNum >= totalPages}
            onclick={() => (pageNum += 1)}
          >
            Next
          </button>
        </div>
      </div>
    {/if}
  {/if}
</div>

<!-- Delete confirmation modal -->
{#if confirmDelete}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onclick={() => (confirmDelete = null)} onkeydown={(e) => e.key === 'Escape' && (confirmDelete = null)} role="dialog" aria-modal="true" tabindex="-1">
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="mx-4 w-full max-w-sm rounded-xl border border-white/[0.06] bg-surface p-6" onclick={(e) => e.stopPropagation()}>
      <h3 class="text-[15px] font-semibold text-text-primary">Delete User</h3>
      <p class="mt-2 text-[13px] text-text-muted">
        Are you sure you want to delete <span class="text-text-primary">{confirmDelete.email}</span>? This action cannot be undone.
      </p>
      <div class="mt-5 flex justify-end gap-3">
        <button class="rounded-lg border border-white/[0.06] px-4 py-2 text-[13px] text-text-muted transition-colors hover:bg-white/[0.04]" onclick={() => (confirmDelete = null)}>Cancel</button>
        <button class="rounded-lg bg-red-500/90 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-red-500" onclick={() => deleteUser(confirmDelete!)}>Delete</button>
      </div>
    </div>
  </div>
{/if}
