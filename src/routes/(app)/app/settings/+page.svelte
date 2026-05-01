<script lang="ts">
  import { authClient } from '$lib/auth-client'
  import { z } from 'zod/v4'
  import { createForm } from '@tanstack/svelte-form'
  import { extractFormError } from '$lib/form-utils'
  import TanstackField from '$lib/components/tanstack-field.svelte'

  const changePasswordSchema = z
    .object({
      confirmPassword: z.string().min(1, 'Please confirm your new password'),
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password must be at most 128 characters'),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    })
  type ChangePasswordInput = z.infer<typeof changePasswordSchema>

  let showDeleteConfirm = $state(false)
  let deleteConfirmText = $state('')

  const form = createForm(() => ({
    defaultValues: {
      confirmPassword: '',
      currentPassword: '',
      newPassword: '',
    },
    onSubmit: async ({ value }: { value: ChangePasswordInput }) => {
      try {
        const res = await authClient.changePassword({
          currentPassword: value.currentPassword,
          newPassword: value.newPassword,
          revokeOtherSessions: true,
        })
        if (res.error) {
          return { form: res.error.message || 'Failed to change password' }
        }
        form.reset()
        return null
      } catch {
        return { form: 'Something went wrong' }
      }
    },
    validators: {
      onSubmit: changePasswordSchema,
    },
  }))

  function handleDeleteAccount() {
    if (deleteConfirmText !== 'DELETE') {return}
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
  <div class="mt-6 rounded-xl border border-white/6 bg-surface p-6">
    <h2 class="text-[15px] font-medium text-text-primary">Change Password</h2>
    <p class="mt-1 text-[13px] text-text-muted">
      Update your password. You will be logged out of other sessions.
    </p>

    <form onsubmit={form.handleSubmit} class="mt-4 space-y-4" novalidate>
      <form.Field name="currentPassword">
        {#snippet children(field)}
          <TanstackField
            {field}
            label="Current Password"
            type="password"
            placeholder="Enter current password"
          />
        {/snippet}
      </form.Field>

      <form.Field name="newPassword">
        {#snippet children(field)}
          <TanstackField
            {field}
            label="New Password"
            type="password"
            placeholder="Enter new password"
          />
        {/snippet}
      </form.Field>

      <form.Field name="confirmPassword">
        {#snippet children(field)}
          <TanstackField
            {field}
            label="Confirm New Password"
            type="password"
            placeholder="Confirm new password"
          />
        {/snippet}
      </form.Field>

      <form.Subscribe selector={(state) => extractFormError(state.errorMap?.onSubmit)}>
        {#snippet children(errorMessage)}
          {#if errorMessage}
            <p class="text-[13px] text-destructive">{errorMessage}</p>
          {/if}
        {/snippet}
      </form.Subscribe>

      <form.Subscribe selector={(state) => state.isSubmitting}>
        {#snippet children(isSubmitting)}
          <button
            type="submit"
            disabled={isSubmitting}
            class="rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-brand-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
          >
            {isSubmitting ? 'Changing...' : 'Change Password'}
          </button>
        {/snippet}
      </form.Subscribe>
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
          class="w-full max-w-xs rounded-lg border border-white/6 bg-surface-elevated px-3 py-2 text-[14px] text-text-primary placeholder:text-text-subtle focus:border-destructive focus:outline-none focus:ring-1 focus:ring-destructive"
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
            class="rounded-lg px-4 py-2 text-[13px] font-medium text-text-muted transition-colors hover:bg-white/4 hover:text-text-primary"
          >
            Cancel
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>
