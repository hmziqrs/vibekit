<script lang="ts">
  import { useSession, authClient } from '$lib/auth-client'

  const session = useSession()

  let name = $state('')
  let isEditing = $state(false)
  let loading = $state(false)
  let successMessage = $state('')
  let errorMessage = $state('')

  $effect(() => {
    const user = $session.data?.user
    if (user && !isEditing) {
      name = user.name || ''
    }
  })

  async function handleUpdateName(e: SubmitEvent) {
    e.preventDefault()
    if (!name.trim()) return

    loading = true
    successMessage = ''
    errorMessage = ''

    try {
      const result = await authClient.updateUser({ name: name.trim() })
      if (result.error) {
        errorMessage = result.error.message || 'Failed to update name'
      } else {
        successMessage = 'Name updated successfully'
        isEditing = false
      }
    } catch {
      errorMessage = 'Something went wrong'
    } finally {
      loading = false
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }
</script>

<div class="mx-auto max-w-2xl">
  <h1 class="text-2xl font-semibold text-text-primary">Profile</h1>
  <p class="mt-1 text-[14px] text-text-muted">Manage your account information.</p>

  <div class="mt-6 rounded-xl border border-white/[0.06] bg-surface p-6">
    <!-- Avatar placeholder -->
    <div class="mb-6 flex items-center gap-4">
      <div
        class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-xl font-semibold text-text-secondary"
      >
        {$session.data?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
      </div>
      <div>
        <p class="text-[15px] font-medium text-text-primary">
          {$session.data?.user?.name || 'User'}
        </p>
        <p class="text-[13px] text-text-muted">{$session.data?.user?.email || ''}</p>
      </div>
    </div>

    <!-- Role -->
    <div class="mb-6 rounded-lg border border-white/[0.06] bg-surface-elevated p-4">
      <p class="text-[11px] uppercase tracking-wider text-text-subtle">Role</p>
      <p class="mt-1 text-[14px] font-medium text-text-primary">
        {$session.data?.user?.name ? 'Member' : 'User'}
      </p>
    </div>

    <!-- Member since -->
    <div class="mb-6 rounded-lg border border-white/[0.06] bg-surface-elevated p-4">
      <p class="text-[11px] uppercase tracking-wider text-text-subtle">Member Since</p>
      <p class="mt-1 text-[14px] font-medium text-text-primary">
        {$session.data?.user?.createdAt
          ? formatDate(String($session.data.user.createdAt))
          : 'N/A'}
      </p>
    </div>

    <!-- Name section -->
    <div class="border-t border-white/[0.06] pt-6">
      <div class="mb-4 flex items-center justify-between">
        <div>
          <h2 class="text-[15px] font-medium text-text-primary">Display Name</h2>
          <p class="text-[13px] text-text-muted">This is your public display name.</p>
        </div>
        {#if !isEditing}
          <button
            onclick={() => (isEditing = true)}
            class="rounded-lg px-3 py-1.5 text-[13px] font-medium text-brand transition-colors hover:bg-white/[0.04]"
          >
            Edit
          </button>
        {/if}
      </div>

      {#if isEditing}
        <form onsubmit={handleUpdateName} class="space-y-4">
          <div>
            <label for="name" class="mb-1.5 block text-[13px] font-medium text-text-secondary"
              >Name</label
            >
            <input
              id="name"
              type="text"
              bind:value={name}
              maxlength={100}
              class="w-full rounded-lg border border-white/[0.06] bg-surface-elevated px-3 py-2 text-[14px] text-text-primary placeholder:text-text-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              placeholder="Enter your name"
            />
          </div>

          {#if successMessage}
            <p class="text-[13px] text-emerald-400">{successMessage}</p>
          {/if}
          {#if errorMessage}
            <p class="text-[13px] text-destructive">{errorMessage}</p>
          {/if}

          <div class="flex gap-2">
            <button
              type="submit"
              disabled={loading || !name.trim()}
              class="rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-brand-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onclick={() => {
                isEditing = false
                errorMessage = ''
                successMessage = ''
              }}
              class="rounded-lg px-4 py-2 text-[13px] font-medium text-text-muted transition-colors hover:bg-white/[0.04] hover:text-text-primary"
            >
              Cancel
            </button>
          </div>
        </form>
      {:else}
        <p class="text-[14px] text-text-primary">{$session.data?.user?.name || 'No name set'}</p>
      {/if}
    </div>

    <!-- Email (read-only) -->
    <div class="mt-6 border-t border-white/[0.06] pt-6">
      <h2 class="mb-1 text-[15px] font-medium text-text-primary">Email</h2>
      <p class="mb-3 text-[13px] text-text-muted">Your email address cannot be changed.</p>
      <p class="text-[14px] text-text-primary">{$session.data?.user?.email || 'N/A'}</p>
    </div>
  </div>
</div>
