<script lang="ts">
  import { getContext } from 'svelte'
  import type { AuthContext } from '$lib/auth.svelte'
  import { authClient } from '$lib/auth-client'
  import { invalidate } from '$app/navigation'
  import { z } from 'zod/v4'
  import { createForm } from '@tanstack/svelte-form'
  import { extractFormError } from '$lib/form-utils'
  import TanstackField from '$lib/components/tanstack-field.svelte'

  const nameSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters').trim(),
  })
  type NameInput = z.infer<typeof nameSchema>

  const auth = getContext<AuthContext>('auth')

  let isEditing = $state(false)
  let successMessage = $state('')

  function startEditing() {
    successMessage = ''
    isEditing = true
  }

  function cancelEditing() {
    successMessage = ''
    isEditing = false
    form.reset()
  }

  const form = createForm(() => ({
    defaultValues: {
      name: auth.user?.name || '',
    },
    onSubmit: async ({ value }: { value: NameInput }) => {
      try {
        const res = await authClient.updateUser({ name: value.name.trim() })
        if (res.error) {
          return { form: res.error.message || 'Failed to update name' }
        }
        await invalidate('app:auth')
        successMessage = 'Name updated successfully'
        isEditing = false
        return null
      } catch {
        return { form: 'Something went wrong' }
      }
    },
    validators: {
      onSubmit: nameSchema,
    },
  }))

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }
</script>

<div class="mx-auto max-w-2xl">
  <h1 class="text-2xl font-semibold text-text-primary">Profile</h1>
  <p class="mt-1 text-[14px] text-text-muted">Manage your account information.</p>

  <div class="mt-6 rounded-xl border border-white/6 bg-surface p-6">
    <!-- Avatar placeholder -->
    <div class="mb-6 flex items-center gap-4">
      <div
        class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/6 text-xl font-semibold text-text-secondary"
      >
        {auth.user?.name?.charAt(0)?.toUpperCase() || 'U'}
      </div>
      <div>
        <p class="text-[15px] font-medium text-text-primary">
          {auth.user?.name || 'User'}
        </p>
        <p class="text-[13px] text-text-muted">{auth.user?.email || ''}</p>
      </div>
    </div>

    <!-- Role -->
    <div class="mb-6 rounded-lg border border-white/6 bg-surface-elevated p-4">
      <p class="text-[11px] uppercase tracking-wider text-text-subtle">Role</p>
      <p class="mt-1 text-[14px] font-medium text-text-primary">
        {auth.user?.name ? 'Member' : 'User'}
      </p>
    </div>

    <!-- Member since -->
    <div class="mb-6 rounded-lg border border-white/6 bg-surface-elevated p-4">
      <p class="text-[11px] uppercase tracking-wider text-text-subtle">Member Since</p>
      <p class="mt-1 text-[14px] font-medium text-text-primary">
        {auth.user?.createdAt
          ? formatDate(String(auth.user.createdAt))
          : 'N/A'}
      </p>
    </div>

    <!-- Name section -->
    <div class="border-t border-white/6 pt-6">
      <div class="mb-4 flex items-center justify-between">
        <div>
          <h2 class="text-[15px] font-medium text-text-primary">Display Name</h2>
          <p class="text-[13px] text-text-muted">This is your public display name.</p>
        </div>
        {#if !isEditing}
          <button
            onclick={startEditing}
            class="rounded-lg px-3 py-1.5 text-[13px] font-medium text-brand transition-colors hover:bg-white/4"
          >
            Edit
          </button>
        {/if}
      </div>

      {#if isEditing}
        <form onsubmit={form.handleSubmit} class="space-y-4" novalidate>
          <form.Field name="name">
            {#snippet children(field)}
              <TanstackField
                {field}
                label="Name"
                maxlength={100}
                placeholder="Enter your name"
              />
            {/snippet}
          </form.Field>

          {#if successMessage}
            <p class="text-[13px] text-emerald-400">{successMessage}</p>
          {/if}

          <form.Subscribe selector={(state) => extractFormError(state.errorMap?.onSubmit)}>
            {#snippet children(errorMessage)}
              {#if errorMessage}
                <p class="text-[13px] text-destructive">{errorMessage}</p>
              {/if}
            {/snippet}
          </form.Subscribe>

          <form.Subscribe selector={(state) => state.isSubmitting}>
            {#snippet children(isSubmitting)}
              <div class="flex gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  class="rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-brand-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onclick={cancelEditing}
                  class="rounded-lg px-4 py-2 text-[13px] font-medium text-text-muted transition-colors hover:bg-white/4 hover:text-text-primary"
                >
                  Cancel
                </button>
              </div>
            {/snippet}
          </form.Subscribe>
        </form>
      {:else}
        <p class="text-[14px] text-text-primary">{auth.user?.name || 'No name set'}</p>
      {/if}
    </div>

    <!-- Email (read-only) -->
    <div class="mt-6 border-t border-white/6 pt-6">
      <h2 class="mb-1 text-[15px] font-medium text-text-primary">Email</h2>
      <p class="mb-3 text-[13px] text-text-muted">Your email address cannot be changed.</p>
      <p class="text-[14px] text-text-primary">{auth.user?.email || 'N/A'}</p>
    </div>
  </div>
</div>
