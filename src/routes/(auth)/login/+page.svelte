<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { authClient, signIn, useSession } from '$lib/auth-client'
  import { loginSchema, type LoginInput } from '$lib/validators/auth'
  import { Button } from '$lib/components/ui/button'
  import * as Card from '$lib/components/ui/card'
  import SocialLoginButtons from '$lib/components/social-login-buttons.svelte'
  import { createForm } from '@tanstack/svelte-form'
  import { extractFormError } from '$lib/form-utils'
  import TanstackField from '$lib/components/tanstack-field.svelte'

  const session = useSession()

  let passkeyError = $state('')

  const callbackURL = $derived(page.url.searchParams.get('next') ?? '/app')

  // Redirect already-authenticated users away from login page
  $effect(() => {
    const user = $session.data?.user ?? page.data.user
    if (user) {
      goto(callbackURL, { replaceState: true })
    }
  })

  async function handlePasskeySignIn() {
    passkeyError = ''
    try {
      const result = await authClient.signIn.passkey()
      if (result.error) {
        passkeyError = result.error.message ?? 'Passkey sign-in failed'
        return
      }
      goto(callbackURL, { replaceState: true })
    } catch (error) {
      passkeyError = error instanceof Error ? error.message : 'Passkey sign-in failed'
    }
  }

  const form = createForm(() => ({
    defaultValues: {
      email: '',
      password: '',
    },
    onSubmit: async ({ value }: { value: LoginInput }) => {
      try {
        const res = await signIn.email(value)
        if (res?.error) {
          return {
            form: res.error.message ?? 'Invalid email or password',
          }
        }
        goto(callbackURL, { replaceState: true })
        return null
      } catch (error) {
        return {
          form: error instanceof Error ? error.message : 'Invalid email or password',
        }
      }
    },
    validators: {
      onSubmit: loginSchema,
    },
  }))
</script>

<div class="w-full max-w-sm">
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-text-primary">Log in</Card.Title>
      <Card.Description class="text-text-muted">Sign in to your account</Card.Description>
    </Card.Header>

    <Card.Content>
      <SocialLoginButtons {callbackURL} />

      <div class="relative my-4">
        <div class="absolute inset-0 flex items-center">
          <span class="w-full border-t border-border"></span>
        </div>
        <div class="relative flex justify-center text-xs uppercase">
          <span class="bg-background px-2 text-text-muted">or</span>
        </div>
      </div>

      <form
        onsubmit={form.handleSubmit}
        class="space-y-4"
        novalidate
      >
        <form.Subscribe selector={(state) => extractFormError(state.errorMap?.onSubmit)}>
          {#snippet children(errorMessage)}
            {#if errorMessage}
              <p class="text-sm text-red-400">{errorMessage}</p>
            {/if}
          {/snippet}
        </form.Subscribe>

        <form.Field name="email">
          {#snippet children(field)}
            <TanstackField
              {field}
              label="Email"
              type="email"
              placeholder="you@example.com"
              autocomplete="email"
            />
          {/snippet}
        </form.Field>

        <form.Field name="password">
          {#snippet children(field)}
            <TanstackField
              {field}
              label="Password"
              type="password"
              placeholder="Enter your password"
              autocomplete="current-password"
            />
          {/snippet}
        </form.Field>

        <div class="flex justify-end">
          <a
            href="/forgot-password"
            class="text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            Forgot password?
          </a>
        </div>

        <form.Subscribe selector={(state) => state.isSubmitting}>
          {#snippet children(isSubmitting)}
            <Button type="submit" class="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Loading...' : 'Sign in'}
            </Button>
          {/snippet}
        </form.Subscribe>
      </form>

      <div class="relative my-4">
        <div class="absolute inset-0 flex items-center">
          <span class="w-full border-t border-border"></span>
        </div>
        <div class="relative flex justify-center text-xs uppercase">
          <span class="bg-background px-2 text-text-muted">or</span>
        </div>
      </div>

      {#if passkeyError}
        <p class="mb-3 text-sm text-red-400">{passkeyError}</p>
      {/if}
      <Button type="button" variant="outline" class="w-full" onclick={handlePasskeySignIn}>
        <svg class="mr-2 size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z" /><circle cx="16.5" cy="7.5" r=".5" />
        </svg>
        Sign in with Passkey
      </Button>
    </Card.Content>

    <Card.Footer class="justify-center">
      <p class="text-sm text-text-muted">
        Don't have an account?
        <a href="/register" class="text-text-primary hover:underline">Create one</a>
      </p>
    </Card.Footer>
  </Card.Root>
</div>
