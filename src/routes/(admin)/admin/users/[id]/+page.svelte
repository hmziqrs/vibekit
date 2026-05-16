<script lang="ts">
  import { page } from '$app/state'
  import { goto } from '$app/navigation'
  import ConfirmDialog from '$lib/components/confirm-dialog.svelte'
  import { formatDate } from '$lib/i18n.svelte'
  import { cn } from '$lib/utils'
  import { createQuery } from '@tanstack/svelte-query'

  interface UserDetail {
    user: {
      createdAt: string
      displayName: string | null
      email: string
      emailVerified: boolean | null
      id: string
      image: string | null
      lastLoginAt: string | null
      name: string | null
      role: string
      status: string
      updatedAt: string | null
    }
    items: number
    organizations: number
    audit: {
      action: string
      createdAt: string
      entityId: string
      entityType: string
      id: string
      metadata: string | null
    }[]
  }

  const userId = $derived(page.params.id)

  let impersonating = $state(false)
  let impersonateReason = $state('')
  let showImpersonateDialog = $state(false)
  let confirmDelete = $state(false)
  let showDeleteDialog = $state(false)
  let mutationError = $state('')

  const detailQuery = createQuery(() => ({
    queryFn: async (): Promise<UserDetail> => {
      const res = await fetch(`/api/admin/users/${userId}`)
      if (!res.ok) throw new Error('Failed to fetch user')
      return res.json()
    },
    queryKey: ['admin', 'users', userId],
    retry: 1,
  }))

  async function changeRole(newRole: 'user' | 'admin') {
    mutationError = ''
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        body: JSON.stringify({ role: newRole }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })
      if (!res.ok) throw new Error('Failed to change role')
      detailQuery.refetch()
    } catch (error) {
      mutationError = error instanceof Error ? error.message : 'Failed to change role'
    }
  }

  async function toggleStatus() {
    if (!detailQuery.data) return
    mutationError = ''
    const newStatus = detailQuery.data.user.status === 'active' ? 'suspended' : 'active'
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        body: JSON.stringify({ status: newStatus }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })
      if (!res.ok) throw new Error('Failed to update status')
      detailQuery.refetch()
    } catch (error) {
      mutationError = error instanceof Error ? error.message : 'Failed to update status'
    }
  }

  async function startImpersonation() {
    if (!impersonateReason.trim()) return
    impersonating = true
    mutationError = ''
    try {
      const res = await fetch(`/api/admin/users/${userId}/impersonate`, {
        body: JSON.stringify({ reason: impersonateReason.trim() }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (res.ok) {
        const data = await res.json() as { sessionToken?: string; targetUser?: { email?: string; name?: string } }
        if (!data.sessionToken || !data.targetUser) {
          mutationError = 'Invalid impersonation response'
          impersonating = false
          return
        }
        sessionStorage.setItem(
          'impersonation',
          JSON.stringify({
            adminEmail: '',
            sessionToken: data.sessionToken,
            targetEmail: data.targetUser.email ?? '',
            targetName: data.targetUser.name ?? '',
          }),
        )
        goto('/app/dashboard')
      } else {
        const data = await res.json().catch(() => ({})) as { error?: { message?: string } }
        mutationError = data.error?.message ?? 'Failed to start impersonation.'
        impersonating = false
      }
    } catch (error) {
      mutationError = error instanceof Error ? error.message : 'Failed to start impersonation.'
      impersonating = false
    }
  }

  async function deleteUser() {
    mutationError = ''
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete user')
      goto('/admin/users')
    } catch (error) {
      mutationError = error instanceof Error ? error.message : 'Failed to delete user'
    }
  }

  const roleColors: Record<string, string> = {
    admin: 'bg-brand/15 text-brand',
    user: 'bg-white/[0.06] text-text-muted',
  }

  const statusColors: Record<string, string> = {
    active: 'bg-success/15 text-success',
    suspended: 'bg-destructive/15 text-destructive',
  }
</script>

<ConfirmDialog
  bind:open={showDeleteDialog}
  title="Delete User"
  message="Are you sure you want to delete this user? This action cannot be undone."
  confirmLabel="Delete"
  variant="danger"
  onConfirm={deleteUser}
/>

<!-- Impersonate Dialog -->
{#if showImpersonateDialog}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60"
    role="dialog"
    aria-modal="true"
    aria-label="Impersonate user"
  >
    <div class="w-full max-w-md rounded-xl border border-white/[0.06] bg-surface p-6 shadow-xl">
      <h2 class="text-lg font-semibold text-text-primary">Impersonate User</h2>
      <p class="mt-1 text-[13px] text-text-muted">
        All actions will be logged.
      </p>

      {#if mutationError}
        <p class="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-[12px] text-destructive">{mutationError}</p>
      {/if}

      <div class="mt-4">
        <label for="impersonate-reason" class="mb-1.5 block text-[12px] font-medium text-text-secondary">
          Reason <span class="text-destructive">*</span>
        </label>
        <textarea
          id="impersonate-reason"
          bind:value={impersonateReason}
          rows={3}
          class="w-full rounded-lg border border-white/[0.08] bg-surface-elevated px-3 py-2 text-[13px] text-text-primary placeholder:text-text-faint focus:border-brand focus:outline-none"
          placeholder="Why are you impersonating this user?"
          disabled={impersonating}
        ></textarea>
      </div>

      <div class="mt-5 flex justify-end gap-3">
        <button
          class="rounded-lg border border-white/[0.06] px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:bg-white/[0.04]"
          onclick={() => { showImpersonateDialog = false; impersonateReason = ''; mutationError = '' }}
          disabled={impersonating}
        >
          Cancel
        </button>
        <button
          class="rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-brand-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
          onclick={startImpersonation}
          disabled={impersonating || !impersonateReason.trim()}
        >
          {impersonating ? 'Starting...' : 'Start Impersonation'}
        </button>
      </div>
    </div>
  </div>
{/if}

<div class="space-y-6">
  {#if detailQuery.isPending}
    <div class="animate-pulse space-y-4">
      <div class="h-8 w-64 rounded bg-white/[0.06]"></div>
      <div class="h-4 w-96 rounded bg-white/[0.06]"></div>
    </div>
  {:else if detailQuery.isError}
    <div class="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive">
      Failed to load user details
      <button class="mt-2 block mx-auto text-[13px] text-brand hover:underline" onclick={() => detailQuery.refetch()}>
        Retry
      </button>
    </div>
  {:else if detailQuery.data}
    {@const u = detailQuery.data.user}

    <!-- Header -->
    <div class="flex items-start justify-between">
      <div class="flex items-center gap-4">
        <a
          href="/admin/users"
          class="rounded-lg p-2 text-text-muted transition-colors hover:bg-white/[0.04] hover:text-text-primary"
          aria-label="Back to users"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </a>
        <div>
          <div class="flex items-center gap-3">
            <h1 class="text-2xl font-bold text-text-primary">{u.name || u.displayName || 'Unnamed User'}</h1>
            <span class="rounded-full px-2.5 py-0.5 text-[11px] font-medium {roleColors[u.role] ?? roleColors.user}">
              {u.role}
            </span>
            <span class="rounded-full px-2.5 py-0.5 text-[11px] font-medium {statusColors[u.status] ?? statusColors.active}">
              {u.status}
            </span>
          </div>
          <p class="mt-1 text-[13px] text-text-subtle">{u.email}</p>
        </div>
      </div>
      <div class="flex gap-2">
        {#if u.role !== 'admin'}
          <button
            onclick={() => changeRole('admin')}
            class="rounded-lg border border-white/[0.06] px-3 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:bg-white/[0.04]"
          >
            Promote
          </button>
        {:else}
          <button
            onclick={() => changeRole('user')}
            class="rounded-lg border border-white/[0.06] px-3 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:bg-white/[0.04]"
          >
            Demote
          </button>
        {/if}
        <button
          onclick={toggleStatus}
          class="rounded-lg border border-white/[0.06] px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-white/[0.04]"
          class:text-warning={u.status === 'active'}
          class:text-success={u.status !== 'active'}
        >
          {u.status === 'active' ? 'Suspend' : 'Activate'}
        </button>
        <button
          onclick={() => { showImpersonateDialog = true; impersonateReason = '' }}
          class="rounded-lg border border-brand/30 px-3 py-1.5 text-[12px] font-medium text-brand transition-colors hover:bg-brand/10"
        >
          Impersonate
        </button>
        <button
          onclick={() => (showDeleteDialog = true)}
          class="rounded-lg border border-destructive/30 px-3 py-1.5 text-[12px] font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          Delete
        </button>
      </div>
    </div>

    {#if mutationError}
      <p class="rounded-lg bg-destructive/10 px-4 py-2 text-[13px] text-destructive">{mutationError}</p>
    {/if}

    <!-- Info Cards -->
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div class="rounded-xl border border-white/[0.06] bg-surface p-4">
        <p class="text-[11px] font-medium uppercase tracking-wider text-text-subtle">Items</p>
        <p class="mt-1 text-xl font-semibold text-text-primary">{detailQuery.data.items}</p>
      </div>
      <div class="rounded-xl border border-white/[0.06] bg-surface p-4">
        <p class="text-[11px] font-medium uppercase tracking-wider text-text-subtle">Organizations</p>
        <p class="mt-1 text-xl font-semibold text-text-primary">{detailQuery.data.organizations}</p>
      </div>
      <div class="rounded-xl border border-white/[0.06] bg-surface p-4">
        <p class="text-[11px] font-medium uppercase tracking-wider text-text-subtle">Last Login</p>
        <p class="mt-1 text-sm font-medium text-text-primary">{u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Never'}</p>
      </div>
      <div class="rounded-xl border border-white/[0.06] bg-surface p-4">
        <p class="text-[11px] font-medium uppercase tracking-wider text-text-subtle">Joined</p>
        <p class="mt-1 text-sm font-medium text-text-primary">{formatDate(u.createdAt)}</p>
      </div>
    </div>

    <!-- Profile Details -->
    <div class="rounded-xl border border-white/[0.06] bg-surface">
      <div class="border-b border-white/[0.06] px-6 py-4">
        <h2 class="text-base font-semibold text-text-primary">Profile</h2>
      </div>
      <div class="divide-y divide-white/[0.04] px-6">
        <div class="flex justify-between py-3">
          <span class="text-[13px] text-text-muted">Display Name</span>
          <span class="text-[13px] text-text-primary">{u.displayName || '—'}</span>
        </div>
        <div class="flex justify-between py-3">
          <span class="text-[13px] text-text-muted">Email Verified</span>
          <span class="text-[13px] {u.emailVerified ? 'text-success' : 'text-text-subtle'}">
            {u.emailVerified ? 'Yes' : 'No'}
          </span>
        </div>
        <div class="flex justify-between py-3">
          <span class="text-[13px] text-text-muted">Updated</span>
          <span class="text-[13px] text-text-subtle">{u.updatedAt ? formatDate(u.updatedAt) : '—'}</span>
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="rounded-xl border border-white/[0.06] bg-surface">
      <div class="border-b border-white/[0.06] px-6 py-4">
        <h2 class="text-base font-semibold text-text-primary">Recent Activity</h2>
      </div>
      {#if !detailQuery.data.audit.length}
        <div class="px-6 py-8 text-center">
          <p class="text-[13px] text-text-muted">No recent activity found.</p>
        </div>
      {:else}
        <div class="divide-y divide-white/[0.04]">
          {#each detailQuery.data.audit as entry (entry.id)}
            <div class="flex items-center justify-between px-6 py-3">
              <div>
                <p class="text-[13px] font-medium text-text-primary">{entry.action}</p>
                <p class="text-[11px] text-text-subtle">
                  {entry.entityType} &middot; {entry.entityId.slice(0, 8)}...
                </p>
              </div>
              <span class="text-[11px] text-text-faint">{formatDate(entry.createdAt)}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>
