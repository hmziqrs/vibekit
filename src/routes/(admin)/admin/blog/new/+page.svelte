<script lang="ts">
  import ImageUpload from '$lib/components/image-upload.svelte'

  let title = $state('')
  let slug = $state('')
  let excerpt = $state('')
  let contentBody = $state('')
  let coverImageUrl = $state('')
  let saving = $state(false)
  let error = $state('')

  function generateSlug() {
    slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    saving = true
    error = ''

    try {
      const res = await fetch('/api/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          slug,
          excerpt,
          contentBody,
          coverImageUrl: coverImageUrl || undefined,
          status: 'draft',
        }),
      })

      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        error = data.error ?? 'Failed to create post'
        return
      }

      const data = (await res.json()) as { id: string }
      window.location.href = `/admin/blog/${data.id}/edit`
    } catch {
      error = 'Network error'
    } finally {
      saving = false
    }
  }
</script>

<div class="flex items-center justify-between">
  <h1 class="text-2xl font-bold text-text-primary">New Post</h1>
  <a href="/admin/blog" class="text-[13px] text-text-muted hover:text-text-primary">Back to list</a>
</div>

<form onsubmit={handleSubmit} class="mt-8 space-y-6 max-w-3xl">
  {#if error}
    <p class="rounded-lg bg-red-500/10 px-4 py-2 text-[13px] text-red-400">{error}</p>
  {/if}

  <div>
    <label for="title" class="mb-2 block text-sm font-medium text-text-secondary">Title</label>
    <input
      id="title"
      bind:value={title}
      oninput={generateSlug}
      required
      class="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-[14px] text-text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
    />
  </div>

  <div>
    <label for="slug" class="mb-2 block text-sm font-medium text-text-secondary">Slug</label>
    <input
      id="slug"
      bind:value={slug}
      required
      class="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-[14px] text-text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
    />
  </div>

  <div>
    <label for="excerpt" class="mb-2 block text-sm font-medium text-text-secondary">Excerpt</label>
    <input
      id="excerpt"
      bind:value={excerpt}
      class="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-[14px] text-text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
    />
  </div>

  <ImageUpload
    currentUrl={coverImageUrl}
    onUpload={(url) => (coverImageUrl = url)}
    onRemove={() => (coverImageUrl = '')}
  />

  <div>
    <label for="content" class="mb-2 block text-sm font-medium text-text-secondary">Content (Markdown)</label>
    <textarea
      id="content"
      bind:value={contentBody}
      rows="15"
      class="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-[14px] font-mono text-text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
    ></textarea>
  </div>

  <div class="flex gap-3">
    <button
      type="submit"
      disabled={saving}
      class="rounded-lg bg-brand px-5 py-2.5 text-[13px] font-semibold text-brand-foreground transition-all hover:bg-brand-hover disabled:opacity-50"
    >
      {saving ? 'Saving...' : 'Save Draft'}
    </button>
  </div>
</form>
