<script lang="ts">
  import { getContext } from 'svelte'
  import type { AuthContext } from '$lib/auth.svelte'
  import { authClient } from '$lib/auth-client'
  import { invalidate } from '$app/navigation'
  import { z } from 'zod/v4'
  import { createForm } from '@tanstack/svelte-form'
  import { extractFormError } from '$lib/form-utils'
  import { updateProfileSchema } from '$lib/validators/profile'
  import { formatDate } from '$lib/i18n.svelte'
  import TanstackField from '$lib/components/tanstack-field.svelte'

  type ProfileInput = z.infer<typeof updateProfileSchema>

  const auth = getContext<AuthContext>('auth')

  let isEditing = $state(false)
  let successMessage = $state('')
  let avatarUploading = $state(false)
  let avatarError = $state('')

  const commonTimezones = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Toronto',
    'America/Vancouver',
    'America/Sao_Paulo',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Madrid',
    'Europe/Amsterdam',
    'Europe/Rome',
    'Europe/Stockholm',
    'Europe/Warsaw',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Hong_Kong',
    'Asia/Singapore',
    'Asia/Kolkata',
    'Asia/Dubai',
    'Asia/Seoul',
    'Australia/Sydney',
    'Australia/Melbourne',
    'Pacific/Auckland',
  ]

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
      bio: (auth.user?.bio as string | null | undefined) ?? '',
      displayName: (auth.user?.displayName as string | null | undefined) ?? '',
      name: auth.user?.name || '',
      timezone: (auth.user?.timezone as string | null | undefined) ?? '',
    },
    onSubmit: async ({ value }: { value: { name: string; bio?: string | null; displayName?: string | null; timezone?: string | null } }) => {
      try {
        const res = await authClient.updateUser({
          bio: value.bio || null,
          displayName: value.displayName || null,
          name: value.name.trim(),
          timezone: value.timezone || null,
        } as Parameters<typeof authClient.updateUser>[0])
        if (res.error) {
          return { form: res.error.message || 'Failed to update profile' }
        }
        await invalidate('app:auth')
        successMessage = 'Profile updated successfully'
        isEditing = false
        return null
      } catch {
        return { form: 'Something went wrong' }
      }
    },
    validators: {
      // TanStack Form validator type doesn't accept Zod v4 schemas with nullable/optional fields directly
      onSubmit: updateProfileSchema as never,
    },
  }))

  async function handleAvatarUpload(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    avatarError = ''
    avatarUploading = true

    try {
      const formData = new FormData()
      formData.append('avatar', file)
      const res = await fetch('/api/upload-avatar', { body: formData, method: 'POST' })
      if (!res.ok) {
        const data = (await res.json()) as { error?: { message?: string } }
        avatarError = data.error?.message ?? 'Upload failed'
        return
      }
      await invalidate('app:auth')
    } catch {
      avatarError = 'Failed to upload avatar'
    } finally {
      avatarUploading = false
      input.value = ''
    }
  }

</script>

<div class="mx-auto max-w-2xl">
  <h1 class="text-2xl font-semibold text-text-primary">Profile</h1>
  <p class="mt-1 text-[14px] text-text-muted">Manage your account information.</p>

  <div class="mt-6 rounded-xl border border-white/6 bg-surface p-6">
    <!-- Avatar -->
    <div class="mb-6 flex items-center gap-4">
      <div class="group relative">
        {#if auth.user?.image}
          <img
            src={auth.user.image}
            alt="Avatar"
            class="h-16 w-16 rounded-full object-cover ring-2 ring-white/10"
          />
        {:else}
          <div
            class="flex h-16 w-16 items-center justify-center rounded-full bg-white/6 text-xl font-semibold text-text-secondary"
          >
            {auth.user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
        {/if}
        <label
          class="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-foreground/50 opacity-0 transition-opacity group-hover:opacity-100"
        >
          {#if avatarUploading}
            <span class="text-[11px] text-brand-foreground">...</span>
          {:else}
            <span class="text-[11px] text-brand-foreground">Change</span>
          {/if}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            class="hidden"
            onchange={handleAvatarUpload}
            disabled={avatarUploading}
          />
        </label>
      </div>
      <div>
        <p class="text-[15px] font-medium text-text-primary">
          {auth.user?.displayName || auth.user?.name || 'User'}
        </p>
        <p class="text-[13px] text-text-muted">{auth.user?.email || ''}</p>
      </div>
    </div>

    {#if avatarError}
      <p class="mb-4 text-[13px] text-destructive">{avatarError}</p>
    {/if}

    <!-- Role & Member Since (read-only) -->
    <div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div class="rounded-lg border border-white/6 bg-surface-elevated p-4">
        <p class="text-[11px] uppercase tracking-wider text-text-subtle">Role</p>
        <p class="mt-1 text-[14px] font-medium capitalize text-text-primary">
          {auth.user?.role || 'user'}
        </p>
      </div>
      <div class="rounded-lg border border-white/6 bg-surface-elevated p-4">
        <p class="text-[11px] uppercase tracking-wider text-text-subtle">Member Since</p>
        <p class="mt-1 text-[14px] font-medium text-text-primary">
          {auth.user?.createdAt ? formatDate(String(auth.user.createdAt), { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
        </p>
      </div>
    </div>

    <!-- Profile editing -->
    <div class="border-t border-white/6 pt-6">
      <div class="mb-4 flex items-center justify-between">
        <div>
          <h2 class="text-[15px] font-medium text-text-primary">Profile Details</h2>
          <p class="text-[13px] text-text-muted">Your name, bio, and preferences.</p>
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
        <form
          onsubmit={(e: SubmitEvent) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          class="space-y-4"
          novalidate
        >
          <form.Field name="name">
            {#snippet children(field)}
              <TanstackField field={field as never} label="Name" maxlength={100} placeholder="Enter your name" />
            {/snippet}
          </form.Field>

          <form.Field name="displayName">
            {#snippet children(field)}
              <TanstackField
                field={field as never}
                label="Display Name"
                maxlength={100}
                placeholder="Public display name (optional)"
              />
            {/snippet}
          </form.Field>

          <form.Field name="bio">
            {#snippet children(field)}
              <div>
                <label
                  for={field.name}
                  class="mb-1.5 block text-[13px] font-medium text-text-secondary"
                >
                  Bio
                </label>
                <textarea
                  id={field.name}
                  name={field.name}
                  maxlength={500}
                  rows={3}
                  placeholder="Tell us about yourself (optional)"
                  value={field.state.value ?? ''}
                  onblur={() => field.handleBlur()}
                  oninput={(e) => field.handleChange((e.target as HTMLTextAreaElement).value)}
                  class="w-full rounded-lg border border-white/6 bg-surface-elevated px-3 py-2 text-[14px] text-text-primary placeholder:text-text-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                ></textarea>
                {#if field.state.meta.errors.length > 0}
                  <p class="mt-1 text-[12px] text-destructive">{field.state.meta.errors[0]}</p>
                {/if}
              </div>
            {/snippet}
          </form.Field>

          <form.Field name="timezone">
            {#snippet children(field)}
              <div>
                <label
                  for={field.name}
                  class="mb-1.5 block text-[13px] font-medium text-text-secondary"
                >
                  Timezone
                </label>
                <select
                  id={field.name}
                  name={field.name}
                  value={field.state.value ?? ''}
                  onblur={() => field.handleBlur()}
                  onchange={(e) => field.handleChange((e.target as HTMLSelectElement).value)}
                  class="w-full rounded-lg border border-white/6 bg-surface-elevated px-3 py-2 text-[14px] text-text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  <option value="">Select timezone (optional)</option>
                  {#each commonTimezones as tz}
                    <option value={tz}>{tz}</option>
                  {/each}
                </select>
              </div>
            {/snippet}
          </form.Field>

          {#if successMessage}
            <p class="text-[13px] text-success">{successMessage}</p>
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
        <!-- Read-only display -->
        <div class="space-y-4">
          <div>
            <p class="text-[12px] uppercase tracking-wider text-text-subtle">Name</p>
            <p class="mt-1 text-[14px] text-text-primary">{auth.user?.name || 'No name set'}</p>
          </div>
          <div>
            <p class="text-[12px] uppercase tracking-wider text-text-subtle">Display Name</p>
            <p class="mt-1 text-[14px] text-text-primary">
              {auth.user?.displayName || 'Not set'}
            </p>
          </div>
          <div>
            <p class="text-[12px] uppercase tracking-wider text-text-subtle">Bio</p>
            <p class="mt-1 text-[14px] text-text-primary">
              {auth.user?.bio || 'Not set'}
            </p>
          </div>
          <div>
            <p class="text-[12px] uppercase tracking-wider text-text-subtle">Timezone</p>
            <p class="mt-1 text-[14px] text-text-primary">
              {auth.user?.timezone || 'Not set'}
            </p>
          </div>
        </div>
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
