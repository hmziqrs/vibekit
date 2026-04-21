<script lang="ts">
  import { seo } from '$lib/seo'
  import { enhance } from '$app/forms'

  const meta = seo({
    title: 'Contact',
    description: 'Get in touch with the Vibekit team.',
  })

  let { form } = $props()

  let errors = $derived(form?.errors ?? [])
  let values = $derived(form?.values ?? {})
  let success = $derived(form?.success ?? false)
</script>

<svelte:head>
  <title>{meta.title}</title>
  <meta name="description" content={meta.description} />
</svelte:head>

<div class="mx-auto max-w-2xl px-6 py-24">
  <h1 class="mb-2 text-3xl font-bold text-text-primary">Contact us</h1>
  <p class="mb-10 text-text-muted">Send us a message and we'll get back to you soon.</p>

  {#if success}
    <div class="rounded-xl border border-brand/30 bg-brand/5 p-6 text-center">
      <h2 class="mb-2 text-lg font-semibold text-text-primary">Message sent!</h2>
      <p class="text-text-muted">Thank you for reaching out. We'll respond within 24 hours.</p>
    </div>
  {:else}
    <form method="POST" use:enhance class="space-y-6">
      <div>
        <label for="name" class="mb-2 block text-sm font-medium text-text-secondary">Name</label>
        <input
          type="text"
          id="name"
          name="name"
          value={values.name ?? ''}
          required
          class="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-[14px] text-text-primary placeholder:text-text-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          placeholder="Your name"
        />
      </div>

      <div>
        <label for="email" class="mb-2 block text-sm font-medium text-text-secondary">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          value={values.email ?? ''}
          required
          class="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-[14px] text-text-primary placeholder:text-text-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label for="subject" class="mb-2 block text-sm font-medium text-text-secondary">Subject</label>
        <input
          type="text"
          id="subject"
          name="subject"
          value={values.subject ?? ''}
          required
          class="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-[14px] text-text-primary placeholder:text-text-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          placeholder="How can we help?"
        />
      </div>

      <div>
        <label for="message" class="mb-2 block text-sm font-medium text-text-secondary">Message</label>
        <textarea
          id="message"
          name="message"
          rows="5"
          required
          class="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-[14px] text-text-primary placeholder:text-text-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          placeholder="Tell us more..."
        >{values.message ?? ''}</textarea>
      </div>

      {#if errors.length > 0}
        <div class="space-y-1">
          {#each errors as error}
            <p class="text-[13px] text-destructive">{error.field}: {error.message}</p>
          {/each}
        </div>
      {/if}

      <button
        type="submit"
        class="rounded-xl bg-brand px-7 py-3 text-[14px] font-semibold text-brand-foreground transition-all hover:bg-brand-hover"
      >
        Send message
      </button>
    </form>
  {/if}
</div>
