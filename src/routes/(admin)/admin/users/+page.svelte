<script lang="ts">
  import ConfirmDialog from '$lib/components/confirm-dialog.svelte'
  import FilterTabs from '$lib/components/filter-tabs.svelte'
  import SearchInput from '$lib/components/search-input.svelte'
  import StatusBadge from '$lib/components/status-badge.svelte'
  import { cn } from '$lib/utils'
  import { createQuery } from '@tanstack/svelte-query'

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
  let showDeleteDialog = $state(false)

  const usersQuery = createQuery(() => ({
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      params.set('page', String(pageNum))
      params.set('limit', '20')
      const res = await fetch(`/api/admin/users?${params}`)
      if (!res.ok) throw new Error('Failed to fetch users')
      return res.json() as Promise<{ users: UserRow[]; total: number }>
    },
    queryKey: ['admin', 'users', { page: pageNum, search, status: statusFilter }],
    retry: 1,
  }))

  async function changeRole(user: UserRow, newRole: 'user' | 'admin') {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      body: JSON.stringify({ role: newRole }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PATCH',
    })
    if (res.ok) {
      openMenuId = null
      usersQuery.refetch()
    }
  }

  async function toggleStatus(user: UserRow) {
    const newStatus = user.status === 'active' ? 'suspended' : 'active'
    const res = await fetch(`/api/admin/users/${user.id}`, {
      body: JSON.stringify({ status: newStatus }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PATCH',
    })
    if (res.ok) {
      openMenuId = null
      usersQuery.refetch()
    }
  }

  async function deleteUser() {
    if (!confirmDelete) {return}
    const res = await fetch(`/api/admin/users/${confirmDelete.id}`, { method: 'DELETE' })
    if (res.ok) {
      confirmDelete = null
      showDeleteDialog = false
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
  }

  const totalPages = $derived(
    usersQuery.data ? Math.ceil(usersQuery.data.total / 20) : 1,
  )

  const roleColors: Record<string, string> = {
    admin: 'bg-brand/15 text-brand',
    user: 'bg-white/[0.06] text-text-muted',
  }

  const statusColors: Record<string, string> = {
    active: 'bg-green-500/15 text-green-400',
    suspended: 'bg-red-500/15 text-red-400',
  }

  const filterTabs = [
    { label: 'All', value: '' },
    { label: 'Active', value: 'active' },
    { label: 'Suspended', value: 'suspended' },
  ]
</script>

<svelte:window onclick={closeMenus} />

<ConfirmDialog
  bind:open={showDeleteDialog}
  title="Delete User"
  message="Are you sure you want to delete this user? This action cannot be undone."
  confirmLabel="Delete"
  variant="danger"
  onConfirm={deleteUser}
/>

<h1 class="text-2xl font-bold text-text-primary">Users</h1>
<p class="mt-1 text-[14px] text-text-muted">Manage user accounts.</p>

<!-- Filters -->
<div class="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  <div class="flex-1 sm:max-w-xs">
    <SearchInput bind:value={search} placeholder="Search by email or name..." />
  </div>
  <FilterTabs tabs={filterTabs} bind:active={statusFilter} />
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
        {#each usersQuery.data.users as user (user.id)}
          <tr class="transition-colors hover:bg-white/[0.02]">
            <td class="px-5 py-3.5">
              <div>
                <p class="text-[13px] font-medium text-text-primary">{user.name || '—'}</p>
                <p class="text-[12px] text-text-subtle">{user.email}</p>
              </div>
            </td>
            <td class="px-5 py-3.5">
              <StatusBadge status={user.role ?? 'user'} colorMap={roleColors} />
            </td>
            <td class="px-5 py-3.5">
              <StatusBadge status={user.status ?? 'active'} colorMap={statusColors} />
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
                    <button class="w-full px-4 py-2 text-left text-[12px] text-red-400 hover:bg-white/[0.04]" onclick={() => { openMenuId = null; confirmDelete = user; showDeleteDialog = true }}>Delete</button>
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
