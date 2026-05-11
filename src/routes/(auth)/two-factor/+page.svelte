<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { authClient, useSession } from '$lib/auth-client'
  import { Button } from '$lib/components/ui/button'
  import * as Card from '$lib/components/ui/card'

  const session = useSession()

  $effect(() => {
    const user = $session.data?.user ?? page.data.user
    if (user) {
      goto('/app', { replaceState: true })
    }
  })

  let mode = $state<'totp' | 'backup'>('totp')
  let code = $state('')
  let trustDevice = $state(false)
  let errorMsg = $state('')
  let loading = $state(false)

  async function handleVerifyTotp() {
    if (!code.trim()) {
      errorMsg = 'Please enter the verification code'
      return
    }

    loading = true
    errorMsg = ''

    try {
      const res = await authClient.twoFactor.verifyTotp({
        code: code.trim(),
        trustDevice,
      })

      if (res?.error) {
        errorMsg = res.error.message ?? 'Invalid verification code'
        return
      }

      goto('/app', { replaceState: true })
    } catch (error) {
      errorMsg = error instanceof Error ? error.message : 'Verification failed'
    } finally {
      loading = false
    }
  }

  async function handleVerifyBackupCode() {
    if (!code.trim()) {
      errorMsg = 'Please enter a backup code'
      return
    }

    loading = true
    errorMsg = ''

    try {
      const res = await authClient.twoFactor.verifyBackupCode({
        code: code.trim(),
        trustDevice,
      })

      if (res?.error) {
        errorMsg = res.error.message ?? 'Invalid backup code'
        return
      }

      goto('/app', { replaceState: true })
    } catch (error) {
      errorMsg = error instanceof Error ? error.message : 'Verification failed'
    } finally {
      loading = false
    }
  }

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    if (mode === 'totp') {
      handleVerifyTotp()
    } else {
      handleVerifyBackupCode()
    }
  }

  function switchMode() {
    mode = mode === 'totp' ? 'backup' : 'totp'
    code = ''
    errorMsg = ''
  }
</script>

<div class="w-full max-w-sm">
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-text-primary">Two-factor authentication</Card.Title>
      <Card.Description class="text-text-muted">
        {#if mode === 'totp'}
          Enter the code from your authenticator app
        {:else}
          Enter one of your backup codes
        {/if}
      </Card.Description>
    </Card.Header>

    <Card.Content>
      <form onsubmit={handleSubmit} class="space-y-4" novalidate>
        {#if errorMsg}
          <p class="text-sm text-red-400">{errorMsg}</p>
        {/if}

        <div>
          <label for="code" class="mb-1.5 block text-sm font-medium text-text-primary">
            {mode === 'totp' ? 'Verification code' : 'Backup code'}
          </label>
          <input
            id="code"
            type="text"
            bind:value={code}
            autocomplete={mode === 'totp' ? 'one-time-code' : 'off'}
            placeholder={mode === 'totp' ? '000000' : 'XXXX-XXXX'}
            class="w-full rounded-lg border border-white/6 bg-surface-elevated px-3 py-2 text-[14px] text-text-primary placeholder:text-text-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <label class="flex items-center gap-2">
          <input
            type="checkbox"
            bind:checked={trustDevice}
            class="h-4 w-4 rounded border-white/6 bg-surface-elevated accent-brand"
          />
          <span class="text-[13px] text-text-muted">Trust this device for 30 days</span>
        </label>

        <Button type="submit" class="w-full" disabled={loading}>
          {loading ? 'Verifying...' : 'Verify'}
        </Button>
      </form>

      <div class="mt-4 space-y-2">
        <button
          onclick={switchMode}
          class="text-sm text-text-muted transition-colors hover:text-text-primary"
        >
          {mode === 'totp' ? 'Use a backup code instead' : 'Use authenticator code instead'}
        </button>
      </div>
    </Card.Content>
  </Card.Root>
</div>
