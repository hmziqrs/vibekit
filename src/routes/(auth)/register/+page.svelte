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
  let error = $state('')
  let loading = $state(false)

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    error = ''

    const result = registerSchema.safeParse({ name, email, password, confirmPassword })
    if (!result.success) {
      const issue = result.error.issues[0]
      error = issue?.message ?? 'Invalid input'
      return
    }

    loading = true
    try {
      const res = await signUp.email({ name, email, password })
      if (res.error) {
        error = res.error.message ?? 'Registration failed. Please try again.'
        return
      }
      goto(`/verify-email?email=${encodeURIComponent(email)}`, { replaceState: true })
    } catch {
      error = 'Something went wrong. Please try again.'
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
        {#if error}
          <p class="text-sm text-red-400">{error}</p>
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
