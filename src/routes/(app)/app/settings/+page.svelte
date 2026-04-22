<script lang="ts">
  import { authClient } from '$lib/auth-client'
  import { z } from 'zod/v4'

  const changePasswordSchema = z
    .object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password must be at most 128 characters'),
      confirmPassword: z.string().min(1, 'Please confirm your new password'),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    })

  let currentPassword = $state('')
  let newPassword = $state('')
  let confirmPassword = $state('')
  let passwordLoading = $state(false)
  let passwordSuccess = $state('')
  let passwordError = $state('')
  let errors = $state<Record<string, string>>({})

  let showDeleteConfirm = $state(false)
  let deleteConfirmText = $state('')

  async function handleChangePassword(e: SubmitEvent) {
    e.preventDefault()
    errors = {}
    passwordError = ''
    passwordSuccess = ''

    const result = changePasswordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    })
    if (!result.success) {
      errors = Object.fromEntries(
        result.error.issues.map((i) => [i.path[0] as string, i.message]),
      )
      return
    }

    passwordLoading = true
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      })
      if (result.error) {
        passwordError = result.error.message || 'Failed to change password'
      } else {
        passwordSuccess = 'Password changed successfully'
        currentPassword = ''
        newPassword = ''
        confirmPassword = ''
      }
    } catch {
      passwordError = 'Something went wrong'
    } finally {
      passwordLoading = false
    }
  }

  function handleDeleteAccount() {
    if (deleteConfirmText !== 'DELETE') return
    alert(
      'Account deletion is not yet implemented. This would permanently delete your account and all data.'
    )
    showDeleteConfirm = false
    deleteConfirmText = ''
  }
</script>

<div class="mx-auto max-w-2xl">
  <h1 class="text-2xl font-semibold text-text-primary">Settings</h1>
  <p class="mt-1 text-[14px] text-text-muted">Manage your account settings.</p>

  <!-- Change Password -->
  <div class="mt-6 rounded-xl border border-white/[0.06] bg-surface p-6">
    <h2 class="text-[15px] font-medium text-text-primary">Change Password</h2>
    <p class="mt-1 text-[13px] text-text-muted">
      Update your password. You will be logged out of other sessions.
    </p>

    <form onsubmit={handleChangePassword} class="mt-4 space-y-4" novalidate>
      <div>
        <label
          for="current-password"
          class="mb-1.5 block text-[13px] font-medium text-text-secondary"
        >
          Current Password
        </label>
        <input
          id="current-password"
          type="password"
          bind:value={currentPassword}
          aria-invalid={errors.currentPassword ? 'true' : 'false'}
          aria-describedby={errors.currentPassword ? 'current-password-error' : undefined}
          class="w-full rounded-lg border border-white/[0.06] bg-surface-elevated px-3 py-2 text-[14px] text-text-primary placeholder:text-text-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          placeholder="Enter current password"
        />
        {#if errors.currentPassword}
          <p id="current-password-error" class="mt-1 text-[12px] text-destructive">{errors.currentPassword}</p>
        {/if}
      </div>

      <div>
        <label
          for="new-password"
          class="mb-1.5 block text-[13px] font-medium text-text-secondary"
        >
          New Password
        </label>
        <input
          id="new-password"
          type="password"
          bind:value={newPassword}
          aria-invalid={errors.newPassword ? 'true' : 'false'}
          aria-describedby={errors.newPassword ? 'new-password-error' : undefined}
          class="w-full rounded-lg border border-white/[0.06] bg-surface-elevated px-3 py-2 text-[14px] text-text-primary placeholder:text-text-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          placeholder="Enter new password"
        />
        {#if errors.newPassword}
          <p id="new-password-error" class="mt-1 text-[12px] text-destructive">{errors.newPassword}</p>
        {/if}
      </div>

      <div>
        <label
          for="confirm-password"
          class="mb-1.5 block text-[13px] font-medium text-text-secondary"
        >
          Confirm New Password
        </label>
        <input
          id="confirm-password"
          type="password"
          bind:value={confirmPassword}
          aria-invalid={errors.confirmPassword ? 'true' : 'false'}
          aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
          class="w-full rounded-lg border border-white/[0.06] bg-surface-elevated px-3 py-2 text-[14px] text-text-primary placeholder:text-text-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          placeholder="Confirm new password"
        />
        {#if errors.confirmPassword}
          <p id="confirm-password-error" class="mt-1 text-[12px] text-destructive">{errors.confirmPassword}</p>
        {/if}
      </div>

      {#if passwordSuccess}
        <p class="text-[13px] text-emerald-400">{passwordSuccess}</p>
      {/if}
      {#if passwordError}
        <p class="text-[13px] text-destructive">{passwordError}</p>
      {/if}

      <button
        type="submit"
        disabled={passwordLoading || !currentPassword || !newPassword}
        class="rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-brand-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
      >
        {passwordLoading ? 'Changing...' : 'Change Password'}
      </button>
    </form>
  </div>

  <!-- Delete Account -->
  <div class="mt-6 rounded-xl border border-destructive/20 bg-surface p-6">
    <h2 class="text-[15px] font-medium text-destructive">Delete Account</h2>
    <p class="mt-1 text-[13px] text-text-muted">
      Permanently delete your account and all associated data. This action cannot be undone.
    </p>

    {#if !showDeleteConfirm}
      <button
        onclick={() => (showDeleteConfirm = true)}
        class="mt-4 rounded-lg border border-destructive/30 px-4 py-2 text-[13px] font-medium text-destructive transition-colors hover:bg-destructive/10"
      >
        Delete Account
      </button>
    {:else}
      <div class="mt-4 space-y-3">
        <p class="text-[13px] text-text-muted">
          Type <span class="font-mono font-medium text-text-primary">DELETE</span> to confirm.
        </p>
        <input
          type="text"
          bind:value={deleteConfirmText}
          class="w-full max-w-xs rounded-lg border border-white/[0.06] bg-surface-elevated px-3 py-2 text-[14px] text-text-primary placeholder:text-text-subtle focus:border-destructive focus:outline-none focus:ring-1 focus:ring-destructive"
          placeholder="Type DELETE to confirm"
        />
        <div class="flex gap-2">
          <button
            onclick={handleDeleteAccount}
            disabled={deleteConfirmText !== 'DELETE'}
            class="rounded-lg bg-destructive px-4 py-2 text-[13px] font-medium text-destructive-foreground transition-colors hover:opacity-90 disabled:opacity-50"
          >
            Confirm Delete
          </button>
          <button
            onclick={() => {
              showDeleteConfirm = false
              deleteConfirmText = ''
            }}
            class="rounded-lg px-4 py-2 text-[13px] font-medium text-text-muted transition-colors hover:bg-white/[0.04] hover:text-text-primary"
          >
            Cancel
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>
