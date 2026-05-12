<script lang="ts">
  let {
    source = 'blog',
    compact = false,
  }: {
    compact?: boolean
    source?: 'blog' | 'footer' | 'post'
  } = $props()

  let email = $state('')
  let status = $state<'error' | 'idle' | 'loading' | 'success'>('idle')
  let message = $state('')

  async function handleSubmit(e: Event) {
    e.preventDefault()
    if (!email.trim()) return

    status = 'loading'
    message = ''

    try {
      const res = await fetch('/api/newsletter/subscribe', {
        body: JSON.stringify({ email: email.trim(), source }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const data = (await res.json()) as { message?: string; error?: { message?: string } }

      if (res.ok) {
        status = 'success'
        message = data.message ?? 'Check your inbox to confirm your subscription.'
        email = ''
      } else {
        status = 'error'
        message = data.error?.message ?? 'Something went wrong. Please try again.'
      }
    } catch {
      status = 'error'
      message = 'Network error. Please try again.'
    }
  }
</script>

{#if status === 'success'}
  <div class="rounded-lg border border-green-500/20 bg-green-500/5 p-4 text-center">
    <p class="text-[13px] text-green-400">{message}</p>
  </div>
{:else}
  <form onsubmit={handleSubmit} class={compact ? 'flex items-center gap-2' : ''}>
    {#if !compact}
      <p class="mb-3 text-[13px] text-text-muted">
        Get notified when new posts are published. No spam, unsubscribe anytime.
      </p>
    {/if}
    <div class={compact ? 'flex flex-1 items-center gap-2' : 'flex gap-2'}>
      <input
        type="email"
        bind:value={email}
        placeholder="your@email.com"
        required
        class="flex-1 rounded-lg border border-border bg-input px-3 py-2 text-[13px] text-text-primary placeholder:text-text-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      />
      <button
        type="submit"
        disabled={status === 'loading' || !email.trim()}
        class="shrink-0 rounded-lg bg-brand px-4 py-2 text-[13px] font-semibold text-brand-foreground transition-all hover:bg-brand-hover disabled:opacity-50"
      >
        {status === 'loading' ? '...' : 'Subscribe'}
      </button>
    </div>
    {#if status === 'error'}
      <p class="mt-2 text-[12px] text-red-400">{message}</p>
    {/if}
  </form>
{/if}
