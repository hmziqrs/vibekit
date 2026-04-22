<script lang="ts">
  import { page } from '$app/state'
  import { authClient } from '$lib/auth-client'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import * as Card from '$lib/components/ui/card'

  import { z } from 'zod/v4'

  const resendSchema = z.object({
    email: z.email('Please enter a valid email address'),
  })

  let errors = $state<Record<string, string>>({})
  let serverError = $state('')
  let message = $state('')
  let loading = $state(false)
  let verifying = $state(false)
  let verified = $state(false)
  let failed = $state(false)

  let token = page.url.searchParams.get('token') ?? ''
  let email = $state(page.url.searchParams.get('email') ?? '')
  let resendLoading = $state(false)

  // Trigger verification once on mount if token is present.
  // This component remounts when URL params change.
  if (token) {
    verifyEmail(token)
  }

  async function verifyEmail(t: string) {
    verifying = true
    serverError = ''
    try {
      const res = await authClient.verifyEmail({ query: { token: t } })
      if (res.error) {
        failed = true
        serverError = 'Verification failed. The link may have expired.'
      } else {
        verified = true
        message = 'Email verified! You can now log in.'
      }
    } catch {
      failed = true
      serverError = 'Verification failed. The link may have expired.'
    } finally {
      verifying = false
    }
  }

  async function handleResend(e: SubmitEvent) {
    e.preventDefault()
    errors = {}
    serverError = ''

    const result = resendSchema.safeParse({ email })
    if (!result.success) {
      errors = Object.fromEntries(
        result.error.issues.map((i) => [i.path[0] as string, i.message]),
      )
      return
    }

    resendLoading = true
    try {
      const res = await authClient.sendVerificationEmail({
        email,
        callbackURL: '/verify-email',
      })
      if (res.error) {
        serverError = res.error.message ?? 'Failed to send verification email.'
      } else {
        message = 'Verification email sent! Check your inbox.'
      }
    } catch {
      serverError = 'Something went wrong. Please try again.'
    } finally {
      resendLoading = false
    }
  }
</script>

<div class="w-full max-w-sm">
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-text-primary">Verify email</Card.Title>
      <Card.Description class="text-text-muted">Check your inbox for a verification link</Card.Description>
    </Card.Header>

    <Card.Content>
      {#if verifying}
        <div class="flex justify-center py-4">
          <p class="text-sm text-text-muted">Verifying...</p>
        </div>
      {:else if verified}
        <div class="space-y-4">
          <p class="text-sm text-green-400">{message}</p>
          <a
            href="/login"
            class="block text-center text-sm text-text-primary hover:underline"
          >
            Go to login
          </a>
        </div>
      {:else if failed}
        <div class="space-y-4">
          {#if serverError}
            <p class="text-sm text-red-400">{serverError}</p>
          {/if}

          {#if message}
            <p class="text-sm text-green-400">{message}</p>
          {/if}

          <form onsubmit={handleResend} class="space-y-3" novalidate>
            <div class="space-y-2">
              <Label for="resend-email">Email address</Label>
              <Input
                id="resend-email"
                type="email"
                placeholder="you@example.com"
                bind:value={email}
                disabled={resendLoading}
                autocomplete="email"
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? 'resend-email-error' : undefined}
              />
              {#if errors.email}
                <p id="resend-email-error" class="text-[12px] text-red-400">{errors.email}</p>
              {/if}
            </div>

            <Button type="submit" class="w-full" disabled={resendLoading}>
              {resendLoading ? 'Loading...' : 'Resend verification email'}
            </Button>
          </form>
        </div>
      {:else}
        <div class="space-y-4">
          {#if message}
            <p class="text-sm text-green-400">{message}</p>
          {/if}

          <p class="text-sm text-text-secondary">
            We've sent a verification link to your email address. Click the link to verify your
            account.
          </p>

          {#if serverError}
            <p class="text-sm text-red-400">{serverError}</p>
          {/if}

          <form onsubmit={handleResend} class="space-y-3" novalidate>
            <div class="space-y-2">
              <Label for="resend-email">Email address</Label>
              <Input
                id="resend-email"
                type="email"
                placeholder="you@example.com"
                bind:value={email}
                disabled={resendLoading}
                autocomplete="email"
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? 'resend-email-error' : undefined}
              />
              {#if errors.email}
                <p id="resend-email-error" class="text-[12px] text-red-400">{errors.email}</p>
              {/if}
            </div>

            <Button type="submit" class="w-full" variant="outline" disabled={resendLoading}>
              {resendLoading ? 'Loading...' : 'Resend verification email'}
            </Button>
          </form>
        </div>
      {/if}
    </Card.Content>

    {#if !verified}
      <Card.Footer class="justify-center">
        <a href="/login" class="text-sm text-text-muted hover:text-text-primary transition-colors">
          Back to login
        </a>
      </Card.Footer>
    {/if}
  </Card.Root>
</div>
