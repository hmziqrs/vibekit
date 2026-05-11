<script lang="ts">
  import { authClient } from '$lib/auth-client'
  import { z } from 'zod/v4'
  import { createForm } from '@tanstack/svelte-form'
  import { extractFormError } from '$lib/form-utils'
  import { password } from '$lib/validators/common'
  import PasswordStrength from '$lib/components/password-strength.svelte'
  import TanstackField from '$lib/components/tanstack-field.svelte'

  const changePasswordSchema = z
    .object({
      confirmPassword: z.string().min(1, 'Please confirm your new password'),
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: password,
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    })
  type ChangePasswordInput = z.infer<typeof changePasswordSchema>

  let showDeleteConfirm = $state(false)
  let deleteConfirmText = $state('')

  // 2FA state
  let twoFactorState = $state<'idle' | 'enabling' | 'enabled'>('idle')
  let twoFactorError = $state('')
  let twoFactorLoading = $state(false)
  let totpUri = $state('')
  let backupCodes = $state<string[]>([])
  let verifyCode = $state('')
  let disablePassword = $state('')
  let showDisableConfirm = $state(false)
  let showBackupCodes = $state(false)
  let enablePassword = $state('')
  let showEnableConfirm = $state(false)

  // Passkey state
  let passkeyLoading = $state(false)
  let passkeyError = $state('')
  let userPasskeys = $state<{ createdAt: Date | null; id: string; name: string | undefined }[]>([])
  let deletePasskeyId = $state('')
  let passkeyName = $state('')

  async function loadPasskeys() {
    try {
      const res = await authClient.passkey.listUserPasskeys()
      if (res.data) {
        userPasskeys = res.data
      }
    } catch {
      // Silently fail
    }
  }

  async function addPasskey() {
    passkeyLoading = true
    passkeyError = ''
    try {
      const res = await authClient.passkey.addPasskey({
        name: passkeyName || undefined,
      })
      if (res.error) {
        passkeyError = res.error.message ?? 'Failed to register passkey'
        return
      }
      passkeyName = ''
      await loadPasskeys()
    } catch (error) {
      passkeyError = error instanceof Error ? error.message : 'Failed to register passkey'
    } finally {
      passkeyLoading = false
    }
  }

  async function removePasskey() {
    if (!deletePasskeyId) return
    passkeyLoading = true
    passkeyError = ''
    try {
      const res = await authClient.passkey.deletePasskey({ id: deletePasskeyId })
      if (res.error) {
        passkeyError = res.error.message ?? 'Failed to remove passkey'
        return
      }
      deletePasskeyId = ''
      await loadPasskeys()
    } catch (error) {
      passkeyError = error instanceof Error ? error.message : 'Failed to remove passkey'
    } finally {
      passkeyLoading = false
    }
  }

  async function enableTwoFactor() {
    if (!enablePassword.trim()) {
      twoFactorError = 'Enter your password to enable 2FA'
      return
    }
    twoFactorLoading = true
    twoFactorError = ''
    try {
      const res = await authClient.twoFactor.enable({ password: enablePassword })
      if (res?.error) {
        twoFactorError = res.error.message ?? 'Failed to enable 2FA'
        return
      }
      if (res.data) {
        totpUri = res.data.totpURI ?? ''
        backupCodes = res.data.backupCodes ?? []
        twoFactorState = 'enabling'
        showEnableConfirm = false
        enablePassword = ''
      }
    } catch (error) {
      twoFactorError = error instanceof Error ? error.message : 'Failed to enable 2FA'
    } finally {
      twoFactorLoading = false
    }
  }

  async function verifyAndEnable() {
    if (!verifyCode.trim()) {
      twoFactorError = 'Enter the code from your authenticator app'
      return
    }
    twoFactorLoading = true
    twoFactorError = ''
    try {
      const res = await authClient.twoFactor.verifyTotp({ code: verifyCode.trim() })
      if (res?.error) {
        twoFactorError = res.error.message ?? 'Invalid code'
        return
      }
      twoFactorState = 'enabled'
      verifyCode = ''
    } catch (error) {
      twoFactorError = error instanceof Error ? error.message : 'Verification failed'
    } finally {
      twoFactorLoading = false
    }
  }

  async function disableTwoFactor() {
    if (!disablePassword.trim()) {
      twoFactorError = 'Enter your password to disable 2FA'
      return
    }
    twoFactorLoading = true
    twoFactorError = ''
    try {
      const res = await authClient.twoFactor.disable({ password: disablePassword })
      if (res?.error) {
        twoFactorError = res.error.message ?? 'Failed to disable 2FA'
        return
      }
      twoFactorState = 'idle'
      showDisableConfirm = false
      disablePassword = ''
    } catch (error) {
      twoFactorError = error instanceof Error ? error.message : 'Failed to disable 2FA'
    } finally {
      twoFactorLoading = false
    }
  }

  async function regenerateBackupCodes() {
    twoFactorLoading = true
    twoFactorError = ''
    try {
      const res = await authClient.twoFactor.generateBackupCodes({ password: disablePassword || '' })
      if (res?.error) {
        twoFactorError = res.error.message ?? 'Failed to regenerate codes'
        return
      }
      if (res.data) {
        backupCodes = res.data.backupCodes ?? []
        showBackupCodes = true
      }
    } catch (error) {
      twoFactorError = error instanceof Error ? error.message : 'Failed to regenerate codes'
    } finally {
      twoFactorLoading = false
    }
  }

  // Load passkeys on mount
  $effect(() => {
    loadPasskeys()
  })

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
          <PasswordStrength password={field.state.value} />
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

  <!-- Two-Factor Authentication -->
  <div class="mt-6 rounded-xl border border-white/6 bg-surface p-6">
    <h2 class="text-[15px] font-medium text-text-primary">Two-Factor Authentication</h2>
    <p class="mt-1 text-[13px] text-text-muted">
      Add an extra layer of security to your account using an authenticator app.
    </p>

    {#if twoFactorError}
      <p class="mt-2 text-[13px] text-destructive">{twoFactorError}</p>
    {/if}

    {#if twoFactorState === 'idle' && !showDisableConfirm}
      {#if !showEnableConfirm}
        <button
          onclick={() => (showEnableConfirm = true)}
          class="mt-4 rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-brand-foreground transition-colors hover:bg-brand-hover"
        >
          Enable 2FA
        </button>
      {:else}
        <div class="mt-4 space-y-3">
          <p class="text-[13px] text-text-muted">Enter your password to begin setup.</p>
          <input
            type="password"
            bind:value={enablePassword}
            placeholder="Your password"
            class="w-full max-w-xs rounded-lg border border-white/6 bg-surface-elevated px-3 py-2 text-[14px] text-text-primary placeholder:text-text-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <div class="flex gap-2">
            <button
              onclick={enableTwoFactor}
              disabled={twoFactorLoading}
              class="rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-brand-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
            >
              {twoFactorLoading ? 'Loading...' : 'Continue'}
            </button>
            <button
              onclick={() => {
                showEnableConfirm = false
                enablePassword = ''
                twoFactorError = ''
              }}
              class="rounded-lg px-4 py-2 text-[13px] font-medium text-text-muted transition-colors hover:bg-white/4 hover:text-text-primary"
            >
              Cancel
            </button>
          </div>
        </div>
      {/if}

    {:else if twoFactorState === 'enabling'}
      <div class="mt-4 space-y-4">
        <div class="rounded-lg border border-white/6 bg-surface-elevated p-4">
          <p class="text-[13px] font-medium text-text-primary">Step 1: Scan QR code</p>
          <p class="mt-1 text-[12px] text-text-muted">
            Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
          </p>
          <div class="mt-3 flex flex-col items-center gap-2">
            <div class="rounded-lg bg-white p-3">
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={encodeURIComponent(totpUri)}"
                alt="TOTP QR Code"
                width="200"
                height="200"
                class="h-[200px] w-[200px]"
              />
            </div>
            <details class="w-full">
              <summary class="cursor-pointer text-[12px] text-text-muted hover:text-text-primary">
                Can't scan? Enter manually
              </summary>
              <p class="mt-1 break-all rounded bg-surface p-2 font-mono text-[11px] text-text-secondary">
                {totpUri}
              </p>
            </details>
          </div>
        </div>

        <div class="rounded-lg border border-white/6 bg-surface-elevated p-4">
          <p class="text-[13px] font-medium text-text-primary">Step 2: Save backup codes</p>
          <p class="mt-1 text-[12px] text-text-muted">
            Store these codes in a safe place. Each can only be used once.
          </p>
          <div class="mt-2 grid grid-cols-2 gap-1">
            {#each backupCodes as code}
              <p class="font-mono text-[12px] text-text-secondary">{code}</p>
            {/each}
          </div>
        </div>

        <div>
          <p class="text-[13px] font-medium text-text-primary">Step 3: Verify setup</p>
          <p class="mt-1 text-[12px] text-text-muted">
            Enter the 6-digit code from your authenticator app to complete setup.
          </p>
          <div class="mt-2 flex gap-2">
            <input
              type="text"
              bind:value={verifyCode}
              placeholder="000000"
              autocomplete="one-time-code"
              class="w-40 rounded-lg border border-white/6 bg-surface-elevated px-3 py-2 font-mono text-[14px] text-text-primary placeholder:text-text-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
            <button
              onclick={verifyAndEnable}
              disabled={twoFactorLoading}
              class="rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-brand-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
            >
              {twoFactorLoading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </div>

        <button
          onclick={() => {
            twoFactorState = 'idle'
            verifyCode = ''
            twoFactorError = ''
          }}
          class="text-[13px] text-text-muted transition-colors hover:text-text-primary"
        >
          Cancel setup
        </button>
      </div>

    {:else if twoFactorState === 'enabled'}
      <div class="mt-4 space-y-3">
        <div class="flex items-center gap-2">
          <span class="inline-block h-2 w-2 rounded-full bg-green-500"></span>
          <p class="text-[13px] text-green-400">Two-factor authentication is enabled</p>
        </div>

        {#if showBackupCodes && backupCodes.length > 0}
          <div class="rounded-lg border border-white/6 bg-surface-elevated p-4">
            <p class="text-[13px] font-medium text-text-primary">New backup codes</p>
            <div class="mt-2 grid grid-cols-2 gap-1">
              {#each backupCodes as code}
                <p class="font-mono text-[12px] text-text-secondary">{code}</p>
              {/each}
            </div>
          </div>
        {/if}

        <div class="flex gap-2">
          <button
            onclick={regenerateBackupCodes}
            disabled={twoFactorLoading}
            class="rounded-lg border border-white/6 px-4 py-2 text-[13px] font-medium text-text-primary transition-colors hover:bg-white/4 disabled:opacity-50"
          >
            Regenerate backup codes
          </button>
          <button
            onclick={() => {
              showDisableConfirm = true
              twoFactorError = ''
            }}
            class="rounded-lg border border-destructive/30 px-4 py-2 text-[13px] font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            Disable 2FA
          </button>
        </div>
      </div>

    {/if}

    {#if showDisableConfirm}
      <div class="mt-4 space-y-3">
        <p class="text-[13px] text-text-muted">Enter your password to disable two-factor authentication.</p>
        <input
          type="password"
          bind:value={disablePassword}
          placeholder="Your password"
          class="w-full max-w-xs rounded-lg border border-white/6 bg-surface-elevated px-3 py-2 text-[14px] text-text-primary placeholder:text-text-subtle focus:border-destructive focus:outline-none focus:ring-1 focus:ring-destructive"
        />
        <div class="flex gap-2">
          <button
            onclick={disableTwoFactor}
            disabled={twoFactorLoading}
            class="rounded-lg bg-destructive px-4 py-2 text-[13px] font-medium text-destructive-foreground transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {twoFactorLoading ? 'Disabling...' : 'Confirm Disable'}
          </button>
          <button
            onclick={() => {
              showDisableConfirm = false
              disablePassword = ''
              twoFactorError = ''
            }}
            class="rounded-lg px-4 py-2 text-[13px] font-medium text-text-muted transition-colors hover:bg-white/4 hover:text-text-primary"
          >
            Cancel
          </button>
        </div>
      </div>
    {/if}
  </div>

  <!-- Passkeys -->
  <div class="mt-6 rounded-xl border border-white/6 bg-surface p-6">
    <h2 class="text-[15px] font-medium text-text-primary">Passkeys</h2>
    <p class="mt-1 text-[13px] text-text-muted">
      Use biometrics or a security key to sign in quickly and securely.
    </p>

    {#if passkeyError}
      <p class="mt-2 text-[13px] text-destructive">{passkeyError}</p>
    {/if}

    {#if userPasskeys.length > 0}
      <div class="mt-4 space-y-2">
        {#each userPasskeys as pk}
          <div class="flex items-center justify-between rounded-lg border border-white/6 bg-surface-elevated px-4 py-3">
            <div class="flex items-center gap-3">
              <svg class="size-5 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z" /><circle cx="16.5" cy="7.5" r=".5" />
              </svg>
              <div>
                <p class="text-[13px] font-medium text-text-primary">{pk.name || 'Unnamed passkey'}</p>
                {#if pk.createdAt}
                  <p class="text-[11px] text-text-subtle">Added {new Date(pk.createdAt).toLocaleDateString()}</p>
                {/if}
              </div>
            </div>
            {#if deletePasskeyId === pk.id}
              <div class="flex items-center gap-2">
                <button
                  onclick={() => removePasskey()}
                  disabled={passkeyLoading}
                  class="rounded-lg bg-destructive px-3 py-1 text-[12px] font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-50"
                >
                  Confirm
                </button>
                <button
                  onclick={() => (deletePasskeyId = '')}
                  class="rounded-lg px-3 py-1 text-[12px] font-medium text-text-muted hover:text-text-primary"
                >
                  Cancel
                </button>
              </div>
            {:else}
              <button
                onclick={() => (deletePasskeyId = pk.id)}
                class="rounded-lg px-3 py-1 text-[12px] font-medium text-text-muted transition-colors hover:text-destructive"
              >
                Remove
              </button>
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    <div class="mt-4 flex items-end gap-2">
      <div class="flex-1">
        <input
          type="text"
          bind:value={passkeyName}
          placeholder="Passkey name (optional)"
          class="w-full rounded-lg border border-white/6 bg-surface-elevated px-3 py-2 text-[14px] text-text-primary placeholder:text-text-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>
      <button
        onclick={addPasskey}
        disabled={passkeyLoading}
        class="rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-brand-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
      >
        {passkeyLoading ? 'Registering...' : 'Add Passkey'}
      </button>
    </div>
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
