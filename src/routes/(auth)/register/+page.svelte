<script lang="ts">
  import { goto } from '$app/navigation'
  import { signUp } from '$lib/auth-client'
  import { registerSchema } from '$lib/validators/auth'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import * as Card from '$lib/components/ui/card'

  let name = $state('')
  let email = $state('')
  let password = $state('')
  let confirmPassword = $state('')
  let errors = $state<Record<string, string>>({})
  let serverError = $state('')
  let loading = $state(false)

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    errors = {}
    serverError = ''

    const result = registerSchema.safeParse({ name, email, password, confirmPassword })
    if (!result.success) {
      errors = Object.fromEntries(
        result.error.issues.map((i) => [i.path[0] as string, i.message]),
      )
      return
    }

    loading = true
    try {
      const res = await signUp.email({ name, email, password })
      if (res.error) {
        serverError = res.error.message ?? 'Registration failed. Please try again.'
        return
      }
      goto(`/verify-email?email=${encodeURIComponent(email)}`, { replaceState: true })
    } catch {
      serverError = 'Something went wrong. Please try again.'
    } finally {
      loading = false
    }
  }
</script>

<div class="w-full max-w-sm">
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-text-primary">Create account</Card.Title>
      <Card.Description class="text-text-muted">Get started with Vibekit</Card.Description>
    </Card.Header>

    <Card.Content>
      <form onsubmit={handleSubmit} class="space-y-4">
        {#if serverError}
          <p class="text-sm text-red-400">{serverError}</p>
        {/if}

        <div class="space-y-2">
          <Label for="name">Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="Your name"
            bind:value={name}
            disabled={loading}
            autocomplete="name"
          />
          {#if errors.name}
            <p class="text-[12px] text-red-400">{errors.name}</p>
          {/if}
        </div>

        <div class="space-y-2">
          <Label for="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            bind:value={email}
            disabled={loading}
            autocomplete="email"
          />
          {#if errors.email}
            <p class="text-[12px] text-red-400">{errors.email}</p>
          {/if}
        </div>

        <div class="space-y-2">
          <Label for="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Create a password"
            bind:value={password}
            disabled={loading}
            autocomplete="new-password"
          />
          {#if errors.password}
            <p class="text-[12px] text-red-400">{errors.password}</p>
          {/if}
        </div>

        <div class="space-y-2">
          <Label for="confirm-password">Confirm password</Label>
          <Input
            id="confirm-password"
            type="password"
            placeholder="Confirm your password"
            bind:value={confirmPassword}
            disabled={loading}
            autocomplete="new-password"
          />
          {#if errors.confirmPassword}
            <p class="text-[12px] text-red-400">{errors.confirmPassword}</p>
          {/if}
        </div>

        <Button type="submit" class="w-full" disabled={loading}>
          {loading ? 'Loading...' : 'Create account'}
        </Button>
      </form>
    </Card.Content>

    <Card.Footer class="justify-center">
      <p class="text-sm text-text-muted">
        Already have an account?
        <a href="/login" class="text-text-primary hover:underline">Sign in</a>
      </p>
    </Card.Footer>
  </Card.Root>
</div>
