<script lang="ts">
  import { goto } from '$app/navigation'
  import ArticleEditor from '$lib/editor/article-editor.svelte'
  import ImageUpload from '$lib/components/image-upload.svelte'
  import { createPostSchema } from '$lib/validators/blog'

  let title = $state('')
  let slug = $state('')
  let excerpt = $state('')
  let contentBody = $state('')
  let coverImageUrl = $state('')
  let saving = $state(false)
  let errors = $state<Record<string, string>>({})
  let serverError = $state('')

  function generateSlug() {
    slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  function handleEditorUpdate(payload: { html: string; json: object; text: string }) {
    contentBody = JSON.stringify(payload.json)
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    errors = {}
    serverError = ''

    const result = createPostSchema.safeParse({
      contentBody: contentBody || undefined,
      coverImageUrl: coverImageUrl || undefined,
      excerpt: excerpt || undefined,
      slug,
      status: 'draft',
      title,
    })
    if (!result.success) {
      errors = Object.fromEntries(
        result.error.issues.map((i) => [i.path[0] as string, i.message]),
      )
      return
    }

    saving = true
    try {
      const res = await fetch('/api/blog', {
        body: JSON.stringify({
          contentBody,
          coverImageUrl: coverImageUrl || undefined,
          excerpt,
          slug,
          status: 'draft',
          title,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        serverError = data.error ?? 'Failed to create post'
        saving = false
        return
      }

      const data = (await res.json()) as { id: string }
      saving = false
      goto(`/admin/blog/${data.id}/edit`)
    } catch {
      serverError = 'Network error'
      saving = false
    }
  }
</script>

<div class="flex items-center justify-between">
  <h1 class="text-2xl font-bold text-text-primary">New Post</h1>
  <a href="/admin/blog" class="text-[13px] text-text-muted hover:text-text-primary">Back to list</a>
</div>

<form onsubmit={handleSubmit} class="mt-8 space-y-6 max-w-4xl" novalidate>
  {#if serverError}
    <p class="rounded-lg bg-destructive/10 px-4 py-2 text-[13px] text-destructive">{serverError}</p>
  {/if}

  <div>
    <label for="title" class="mb-2 block text-sm font-medium text-text-secondary">Title</label>
    <input
      id="title"
      bind:value={title}
      oninput={generateSlug}
      aria-invalid={errors.title ? 'true' : 'false'}
      aria-describedby={errors.title ? 'title-error' : undefined}
      class="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-[14px] text-text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
    />
    {#if errors.title}
      <p id="title-error" class="mt-1 text-[12px] text-destructive">{errors.title}</p>
    {/if}
  </div>

  <div>
    <label for="slug" class="mb-2 block text-sm font-medium text-text-secondary">Slug</label>
    <input
      id="slug"
      bind:value={slug}
      aria-invalid={errors.slug ? 'true' : 'false'}
      aria-describedby={errors.slug ? 'slug-error' : undefined}
      class="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-[14px] text-text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
    />
    {#if errors.slug}
      <p id="slug-error" class="mt-1 text-[12px] text-destructive">{errors.slug}</p>
    {/if}
  </div>

  <div>
    <label for="excerpt" class="mb-2 block text-sm font-medium text-text-secondary">Excerpt</label>
    <input
      id="excerpt"
      bind:value={excerpt}
      aria-invalid={errors.excerpt ? 'true' : 'false'}
      aria-describedby={errors.excerpt ? 'excerpt-error' : undefined}
      class="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-[14px] text-text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
    />
    {#if errors.excerpt}
      <p id="excerpt-error" class="mt-1 text-[12px] text-destructive">{errors.excerpt}</p>
    {/if}
  </div>

  <ImageUpload
    currentUrl={coverImageUrl}
    onUpload={(url) => (coverImageUrl = url)}
    onRemove={() => (coverImageUrl = '')}
  />
  {#if errors.coverImageUrl}
    <p id="cover-image-error" class="mt-1 text-[12px] text-destructive">{errors.coverImageUrl}</p>
  {/if}

  <div>
    <label for="content-editor" class="mb-2 block text-sm font-medium text-text-secondary">Content</label>
    <div id="content-editor">
      <ArticleEditor onUpdate={handleEditorUpdate} />
    </div>
    {#if errors.contentBody}
      <p id="content-error" class="mt-1 text-[12px] text-destructive">{errors.contentBody}</p>
    {/if}
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
