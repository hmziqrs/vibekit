<script lang="ts">
  import QRCode from 'qrcode'
  import { authClient } from '$lib/auth-client'
  import { z } from 'zod/v4'
  import { createForm } from '@tanstack/svelte-form'
  import { extractFormError } from '$lib/form-utils'
  import { password } from '$lib/validators/common'
  import PasswordStrength from '$lib/components/password-strength.svelte'
  import TanstackField from '$lib/components/tanstack-field.svelte'
  import { acceptConsent, getConsentStatus, initConsent, withdrawConsent as withdrawConsentAction } from '$lib/consent.svelte'

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
  let qrDataUrl = $state('')
  let backupCodes = $state<string[]>([])
  let verifyCode = $state('')
  let disablePassword = $state('')
  let showDisableConfirm = $state(false)
  let showBackupCodes = $state(false)
  let enablePassword = $state('')
  let showEnableConfirm = $state(false)

  // Generate QR code client-side when TOTP URI changes
  $effect(() => {
    if (totpUri) {
      QRCode.toDataURL(totpUri, { margin: 2, width: 200 }).then(
        (url) => (qrDataUrl = url),
      )
    } else {
      qrDataUrl = ''
    }
  })

  // Passkey state
  let passkeyLoading = $state(false)
  let passkeyError = $state('')
  let userPasskeys = $state<{ createdAt?: Date | null; id: string; name?: string }[]>([])
  let deletePasskeyId = $state('')
  let passkeyName = $state('')

  // Push notification state
  let pushSupported = $state(false)
  let pushPermission = $state<NotificationPermission | 'default'>('default')
  let pushLoading = $state(false)
  let pushError = $state('')

  // Consent management — shared reactive store
  initConsent()

  function withdrawConsent() {
    withdrawConsentAction()
  }

  function grantConsent() {
    acceptConsent()
  }

  async function initPush() {
    pushSupported = 'serviceWorker' in navigator && 'PushManager' in window
    if (pushSupported) {
      pushPermission = Notification.permission
    }
  }

  async function enablePush() {
    pushLoading = true
    pushError = ''
    try {
      const permission = await Notification.requestPermission()
      pushPermission = permission
      if (permission !== 'granted') {
        pushError = 'Notification permission denied'
        return
      }
      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const vapidKey = document.querySelector('meta[name="vapid-key"]')?.getAttribute('content') ?? ''
      const subscription = await registration.pushManager.subscribe({
        applicationServerKey: vapidKey,
        userVisibleOnly: true,
      })
      const res = await fetch('/api/push/subscribe', {
        body: JSON.stringify(subscription.toJSON()),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to save subscription')
    } catch (error) {
      pushError = error instanceof Error ? error.message : 'Failed to enable push'
    } finally {
      pushLoading = false
    }
  }

  async function disablePush() {
    pushLoading = true
    pushError = ''
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await fetch('/api/push/unsubscribe', {
          body: JSON.stringify({ endpoint: subscription.endpoint }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        })
        await subscription.unsubscribe()
      }
    } catch (error) {
      pushError = error instanceof Error ? error.message : 'Failed to disable push'
    } finally {
      pushLoading = false
    }
  }

  // Security events state
  interface SecurityEventEntry {
    createdAt: string | null
    eventType: string
    id: string
    ipAddress: string | null
    metadata: string | null
    userAgent: string | null
  }
  let securityEvents = $state<SecurityEventEntry[]>([])
  let securityEventsLoading = $state(true)

  async function loadSecurityEvents() {
    try {
      const res = await fetch('/api/security-events')
      if (res.ok) {
        const data = (await res.json()) as { events: typeof securityEvents }
        securityEvents = data.events ?? []
      }
    } catch {
      // Silently fail
    } finally {
      securityEventsLoading = false
    }
  }

  function formatEventType(type: string): string {
    const map: Record<string, string> = {
      account_locked: 'Account Locked',
      account_unlocked: 'Account Unlocked',
      login: 'Sign In',
      login_failed: 'Failed Sign In',
      logout: 'Sign Out',
      new_device: 'New Device',
      passkey_added: 'Passkey Added',
      passkey_removed: 'Passkey Removed',
      password_change: 'Password Changed',
      social_account_linked: 'Account Linked',
      social_account_unlinked: 'Account Unlinked',
      suspicious_login: 'Suspicious Login',
      two_factor_disabled: '2FA Disabled',
      two_factor_enabled: '2FA Enabled',
    }
    return map[type] ?? type
  }

  function eventSeverity(type: string): 'info' | 'warn' | 'danger' {
    if (type === 'login_failed' || type === 'account_locked' || type === 'suspicious_login') return 'danger'
    if (type === 'new_device' || type === 'password_change' || type === 'two_factor_disabled') return 'warn'
    return 'info'
  }

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
    initPush()
  })

  // Connected accounts state
  let linkedAccounts = $state<{ accountId: string; providerId: string }[]>([])
  let accountsLoading = $state(false)
  let accountsError = $state('')

  async function loadAccounts() {
    try {
      const res = await authClient.listAccounts()
      if (res.data) {
        linkedAccounts = res.data.map((a: { accountId: string; providerId: string }) => ({
          accountId: a.accountId,
          providerId: a.providerId,
        }))
      }
    } catch {
      // Silently fail
    }
  }

  async function linkProvider(provider: 'google' | 'github') {
    accountsLoading = true
    accountsError = ''
    try {
      await authClient.linkSocial({
        callbackURL: '/app/settings',
        provider,
      })
    } catch (error) {
      accountsError = error instanceof Error ? error.message : `Failed to link ${provider}`
      accountsLoading = false
    }
  }

  async function unlinkProvider(providerId: string) {
    accountsLoading = true
    accountsError = ''
    try {
      const res = await authClient.unlinkAccount({ providerId })
      if (res.error) {
        accountsError = res.error.message ?? 'Failed to unlink account'
      }
      await loadAccounts()
    } catch (error) {
      accountsError = error instanceof Error ? error.message : 'Failed to unlink account'
    }
    accountsLoading = false
  }

  const providerNames: Record<string, string> = {
    'email-password': 'Email & Password',
    github: 'GitHub',
    google: 'Google',
  }

  // Load linked accounts on mount
  $effect(() => {
    loadAccounts()
  })

  // Session management state
  let activeSessions = $state<
    {
      createdAt?: Date | null
      currentUserAgent?: boolean
      expiresAt?: Date | null
      id: string
      ipAddress?: string | null
      token: string
      updatedAt?: Date | null
      userAgent?: string | null
      userId: string
    }[]
  >([])
  let sessionsLoading = $state(false)
  let sessionsError = $state('')
  let currentSessionId = $state('')

  function parseUserAgent(ua: string | null | undefined): { browser: string; os: string } {
    if (!ua) return { browser: 'Unknown', os: 'Unknown' }
    let browser = 'Unknown'
    let os = 'Unknown'

    if (ua.includes('Firefox/')) browser = 'Firefox'
    else if (ua.includes('Edg/')) browser = 'Edge'
    else if (ua.includes('Chrome/')) browser = 'Chrome'
    else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari'

    if (ua.includes('Mac OS X')) os = 'macOS'
    else if (ua.includes('Windows')) os = 'Windows'
    else if (ua.includes('Linux')) os = 'Linux'
    else if (ua.includes('Android')) os = 'Android'
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'

    return { browser, os }
  }

  async function loadSessions() {
    try {
      const sessionRes = await authClient.getSession()
      if (sessionRes.data?.session) {
        currentSessionId = sessionRes.data.session.id
      }
      const res = await authClient.listSessions()
      if (res.data) {
        // Sort by updatedAt descending and show the 10 most recent
        activeSessions = res.data
          .toSorted((a, b) => {
            const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
            const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
            return bTime - aTime
          })
          .slice(0, 10)
        // Ensure current session is in the list
        const hasCurrent = activeSessions.some((s) => s.id === currentSessionId)
        if (!hasCurrent && sessionRes.data?.session) {
          activeSessions.unshift({
            createdAt: sessionRes.data.session.createdAt ?? null,
            currentUserAgent: false,
            expiresAt: sessionRes.data.session.expiresAt ?? null,
            id: sessionRes.data.session.id,
            ipAddress: sessionRes.data.session.ipAddress ?? null,
            token: sessionRes.data.session.token,
            updatedAt: sessionRes.data.session.updatedAt ?? null,
            userAgent: sessionRes.data.session.userAgent ?? null,
            userId: sessionRes.data.session.userId,
          })
        }
      }
    } catch {
      // Silently fail
    }
  }

  async function revokeSession(token: string) {
    sessionsLoading = true
    sessionsError = ''
    try {
      const res = await authClient.revokeSession({ token })
      if (res.error) {
        sessionsError = res.error.message ?? 'Failed to sign out device'
      }
      await loadSessions()
    } catch (error) {
      sessionsError = error instanceof Error ? error.message : 'Failed to sign out device'
    }
    sessionsLoading = false
  }

  async function revokeOtherSessions() {
    sessionsLoading = true
    sessionsError = ''
    try {
      const res = await authClient.revokeOtherSessions()
      if (res.error) {
        sessionsError = res.error.message ?? 'Failed to sign out other devices'
      }
      await loadSessions()
    } catch (error) {
      sessionsError = error instanceof Error ? error.message : 'Failed to sign out other devices'
    }
    sessionsLoading = false
  }

  // Load sessions on mount
  $effect(() => {
    loadSessions()
  })

  // Load security events on mount
  $effect(() => {
    loadSecurityEvents()
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

  let deleteLoading = $state(false)
  let deleteError = $state('')
  let deactivateLoading = $state(false)
  let deactivateError = $state('')
  let exportLoading = $state(false)
  let exportError = $state('')

  async function handleDeleteAccount() {
    if (deleteConfirmText !== 'DELETE') return
    deleteLoading = true
    deleteError = ''
    try {
      const res = await fetch('/api/account', { method: 'DELETE' })
      if (!res.ok) {
        deleteError = 'Failed to delete account. Please try again.'
        return
      }
      await authClient.signOut()
      window.location.href = '/'
    } catch {
      deleteError = 'Something went wrong.'
    } finally {
      deleteLoading = false
    }
  }

  async function handleExportData() {
    exportLoading = true
    exportError = ''
    try {
      const res = await fetch('/api/account/export')
      if (!res.ok) {
        exportError =
          res.status === 429
            ? 'Please wait before requesting another export.'
            : 'Failed to export data. Please try again.'
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const match = disposition.match(/filename="(.+)"/)
      a.download = match?.[1] ?? 'vibekit-export.json'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      exportError = 'Something went wrong.'
    } finally {
      exportLoading = false
    }
  }

  async function handleDeactivateAccount() {
    deactivateLoading = true
    deactivateError = ''
    try {
      const res = await fetch('/api/account/deactivate', { method: 'PATCH' })
      if (!res.ok) {
        deactivateError = 'Failed to deactivate account. Please try again.'
        return
      }
      await authClient.signOut()
      window.location.href = '/'
    } catch {
      deactivateError = 'Something went wrong.'
    } finally {
      deactivateLoading = false
    }
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
              {#if qrDataUrl}
                <img
                  src={qrDataUrl}
                  alt="TOTP QR Code"
                  width="200"
                  height="200"
                  class="h-[200px] w-[200px]"
                />
              {:else}
                <div class="flex h-[200px] w-[200px] items-center justify-center text-text-muted">
                  Generating QR code...
                </div>
              {/if}
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
          <span class="inline-block h-2 w-2 rounded-full bg-success"></span>
          <p class="text-[13px] text-success">Two-factor authentication is enabled</p>
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

  <!-- Connected Accounts -->
  <div class="mt-6 rounded-xl border border-white/6 bg-surface p-6">
    <h2 class="text-[15px] font-medium text-text-primary">Connected Accounts</h2>
    <p class="mt-1 text-[13px] text-text-muted">
      Link your social accounts for easier sign-in.
    </p>

    {#if accountsError}
      <p class="mt-2 text-[13px] text-destructive">{accountsError}</p>
    {/if}

    <div class="mt-4 space-y-2">
      {#each ['google', 'github'] as provider}
        {@const isLinked = linkedAccounts.some((a) => a.providerId === provider)}
        {@const canUnlink = linkedAccounts.length > 1}
        <div class="flex items-center justify-between rounded-lg border border-white/6 bg-surface-elevated px-4 py-3">
          <div class="flex items-center gap-3">
            {#if provider === 'google'}
              <svg class="size-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            {:else}
              <svg class="size-5 text-text-muted" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            {/if}
            <div>
              <p class="text-[13px] font-medium text-text-primary">{providerNames[provider] ?? provider}</p>
              <p class="text-[11px] text-text-subtle">
                {isLinked ? 'Connected' : 'Not connected'}
              </p>
            </div>
          </div>
          {#if isLinked}
            <button
              onclick={() => unlinkProvider(provider)}
              disabled={accountsLoading || !canUnlink}
              class="rounded-lg px-3 py-1 text-[12px] font-medium text-text-muted transition-colors hover:text-destructive disabled:opacity-50"
              title={canUnlink ? 'Unlink' : 'Cannot unlink your only account'}
            >
              Remove
            </button>
          {:else}
            <button
              onclick={() => linkProvider(provider as 'google' | 'github')}
              disabled={accountsLoading}
              class="rounded-lg bg-brand px-3 py-1 text-[12px] font-medium text-brand-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
            >
              Connect
            </button>
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <!-- Active Sessions -->
  <div class="mt-6 rounded-xl border border-white/6 bg-surface p-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-[15px] font-medium text-text-primary">Active Sessions</h2>
        <p class="mt-1 text-[13px] text-text-muted">
          Devices currently signed in to your account.
        </p>
      </div>
      {#if activeSessions.length > 1}
        <button
          onclick={revokeOtherSessions}
          disabled={sessionsLoading}
          class="rounded-lg px-3 py-1 text-[12px] font-medium text-text-muted transition-colors hover:text-destructive disabled:opacity-50"
        >
          Sign out all others
        </button>
      {/if}
    </div>

    {#if sessionsError}
      <p class="mt-2 text-[13px] text-destructive">{sessionsError}</p>
    {/if}

    <div class="mt-4 space-y-2">
      {#each activeSessions as session}
        {@const isCurrent = session.id === currentSessionId}
        {@const ua = parseUserAgent(session.userAgent)}
        <div class="flex items-center justify-between rounded-lg border border-white/6 bg-surface-elevated px-4 py-3">
          <div class="flex items-center gap-3">
            <svg class="size-5 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <div>
              <p class="text-[13px] font-medium text-text-primary">
                {ua.browser} on {ua.os}
                {#if isCurrent}
                  <span class="ml-1 rounded bg-brand/20 px-1.5 py-0.5 text-[10px] font-medium text-brand">This device</span>
                {/if}
              </p>
              <p class="text-[11px] text-text-subtle">
                {session.ipAddress ?? 'Unknown IP'}
                {#if session.updatedAt}
                  &middot; Last active {new Date(session.updatedAt).toLocaleDateString()}
                {/if}
              </p>
            </div>
          </div>
          {#if !isCurrent}
            <button
              onclick={() => revokeSession(session.token)}
              disabled={sessionsLoading}
              class="rounded-lg px-3 py-1 text-[12px] font-medium text-text-muted transition-colors hover:text-destructive disabled:opacity-50"
            >
              Sign out
            </button>
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <!-- Security Activity -->
  <div class="mt-6 rounded-xl border border-white/6 bg-surface p-6">
    <h2 class="text-[15px] font-medium text-text-primary">Security Activity</h2>
    <p class="mt-1 text-[13px] text-text-muted">
      Recent security events for your account.
    </p>

    {#if securityEventsLoading}
      <div class="mt-4 space-y-2">
        {#each Array(3) as _}
          <div class="h-10 animate-pulse rounded-lg bg-white/[0.04]"></div>
        {/each}
      </div>
    {:else if securityEvents.length === 0}
      <p class="mt-4 text-[13px] text-text-subtle">No security events recorded yet.</p>
    {:else}
      <div class="mt-4 space-y-2">
        {#each securityEvents as evt}
          {@const severity = eventSeverity(evt.eventType)}
          {@const ua = parseUserAgent(evt.userAgent)}
          <div class="flex items-center justify-between rounded-lg border border-white/6 bg-surface-elevated px-4 py-3">
            <div class="flex items-center gap-3">
              <span class="flex size-2 rounded-full {severity === 'danger' ? 'bg-destructive' : severity === 'warn' ? 'bg-warning' : 'bg-success'}"></span>
              <div>
                <p class="text-[13px] font-medium text-text-primary">{formatEventType(evt.eventType)}</p>
                <p class="text-[11px] text-text-subtle">
                  {ua.browser} on {ua.os}
                  {#if evt.ipAddress}
                    &middot; {evt.ipAddress}
                  {/if}
                  {#if evt.createdAt}
                    &middot; {new Date(evt.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {/if}
                </p>
              </div>
            </div>
          </div>
        {/each}
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

  <!-- Push Notifications -->
  <div class="mt-6 rounded-xl border border-white/6 bg-surface p-6">
    <h2 class="text-[15px] font-medium text-text-primary">Push Notifications</h2>
    <p class="mt-1 text-[13px] text-text-muted">
      Receive browser notifications for important updates, even when you are not on this page.
    </p>
    {#if pushError}
      <p class="mt-2 text-[13px] text-destructive">{pushError}</p>
    {/if}
    {#if !pushSupported}
      <p class="mt-3 text-[13px] text-text-subtle">Push notifications are not supported in this browser.</p>
    {:else if pushPermission === 'granted'}
      <p class="mt-3 text-[13px] text-success">Push notifications are enabled.</p>
      <button
        onclick={disablePush}
        disabled={pushLoading}
        class="mt-3 rounded-lg border border-white/10 bg-white/3 px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:bg-white/6 disabled:opacity-50"
      >
        {pushLoading ? 'Disabling...' : 'Disable Push Notifications'}
      </button>
    {:else if pushPermission === 'denied'}
      <p class="mt-3 text-[13px] text-text-subtle">Push notifications are blocked. Enable them in your browser settings.</p>
    {:else}
      <button
        onclick={enablePush}
        disabled={pushLoading}
        class="mt-3 rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-brand-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
      >
        {pushLoading ? 'Enabling...' : 'Enable Push Notifications'}
      </button>
    {/if}
  </div>

  <!-- Export Data -->
  <div class="mt-6 rounded-xl border border-white/6 bg-surface p-6">
    <h2 class="text-[15px] font-medium text-text-primary">Export Your Data</h2>
    <p class="mt-1 text-[13px] text-text-muted">
      Download a copy of your personal data including profile, sessions, items, and activity log.
    </p>
    {#if exportError}
      <p class="mt-2 text-[13px] text-destructive">{exportError}</p>
    {/if}
    <button
      onclick={handleExportData}
      disabled={exportLoading}
      class="mt-4 rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-brand-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
    >
      {exportLoading ? 'Preparing export...' : 'Download My Data'}
    </button>
  </div>

  <!-- Cookie & Analytics Consent -->
  <div class="mt-6 rounded-xl border border-white/6 bg-surface p-6">
    <h2 class="text-[15px] font-medium text-text-primary">Cookie & Analytics Consent</h2>
    <p class="mt-1 text-[13px] text-text-muted">
      Manage your cookie and analytics preferences. Analytics help us improve your experience.
    </p>
    <div class="mt-4 flex items-center gap-3">
      {#if getConsentStatus() === 'accepted'}
        <span class="text-[13px] text-text-secondary">Status: <span class="text-green-400">Accepted</span></span>
        <button
          onclick={withdrawConsent}
          class="rounded-lg border border-white/10 px-3 py-1.5 text-[13px] text-text-secondary transition-colors hover:text-text-primary"
        >
          Withdraw Consent
        </button>
      {:else if getConsentStatus() === 'declined'}
        <span class="text-[13px] text-text-secondary">Status: <span class="text-text-muted">Declined</span></span>
        <button
          onclick={grantConsent}
          class="rounded-lg bg-brand px-3 py-1.5 text-[13px] font-medium text-brand-foreground transition-colors hover:bg-brand-hover"
        >
          Accept Analytics
        </button>
      {:else}
        <span class="text-[13px] text-text-muted">No consent decision recorded</span>
      {/if}
    </div>
  </div>

  <!-- Deactivate Account -->
  <div class="mt-6 rounded-xl border border-white/6 bg-surface p-6">
    <h2 class="text-[15px] font-medium text-text-primary">Deactivate Account</h2>
    <p class="mt-1 text-[13px] text-text-muted">
      Temporarily disable your account. You can sign back in to reactivate at any time.
    </p>
    {#if deactivateError}
      <p class="mt-2 text-[13px] text-destructive">{deactivateError}</p>
    {/if}
    <button
      onclick={handleDeactivateAccount}
      disabled={deactivateLoading}
      class="mt-4 rounded-lg border border-white/10 px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:bg-white/4 hover:text-text-primary disabled:opacity-50"
    >
      {deactivateLoading ? 'Deactivating...' : 'Deactivate Account'}
    </button>
  </div>

  <!-- Delete Account -->
  <div class="mt-6 rounded-xl border border-destructive/20 bg-surface p-6">
    <h2 class="text-[15px] font-medium text-destructive">Delete Account</h2>
    <p class="mt-1 text-[13px] text-text-muted">
      Your account will be scheduled for deletion and permanently removed after 30 days. You can
      <a href="/reactivate" class="text-brand hover:underline">reactivate it</a>
      during this period.
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
        {#if deleteError}
          <p class="text-[13px] text-destructive">{deleteError}</p>
        {/if}
        <input
          type="text"
          bind:value={deleteConfirmText}
          class="w-full max-w-xs rounded-lg border border-white/6 bg-surface-elevated px-3 py-2 text-[14px] text-text-primary placeholder:text-text-subtle focus:border-destructive focus:outline-none focus:ring-1 focus:ring-destructive"
          placeholder="Type DELETE to confirm"
        />
        <div class="flex gap-2">
          <button
            onclick={handleDeleteAccount}
            disabled={deleteConfirmText !== 'DELETE' || deleteLoading}
            class="rounded-lg bg-destructive px-4 py-2 text-[13px] font-medium text-destructive-foreground transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {deleteLoading ? 'Deleting...' : 'Confirm Delete'}
          </button>
          <button
            onclick={() => {
              showDeleteConfirm = false
              deleteConfirmText = ''
              deleteError = ''
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
