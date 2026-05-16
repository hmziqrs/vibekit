<script lang="ts">
  import type { Editor } from '@tiptap/core'
  import { goto, invalidateAll } from '$app/navigation'
  import ArticleEditor from '$lib/editor/article-editor.svelte'
  import ImageUpload from '$lib/components/image-upload.svelte'
  import SeoPanel from '$lib/components/seo-panel.svelte'
  import TocPanel from '$lib/components/toc-panel.svelte'
  import MediaLibrary from '$lib/components/media-library.svelte'
  import ArticleSearch from '$lib/components/article-search.svelte'
  import { createFocusTrap } from '$lib/keyboard.svelte'
  import { updatePostSchema } from '$lib/validators/blog'
  import { createQuery } from '@tanstack/svelte-query'

  const {
    data,
  }: {
    data: {
      post: {
        canonicalUrl: string | null
        contentBody: string | null
        coverImageUrl: string | null
        excerpt: string | null
        id: string
        ogImageUrl: string | null
        seoDescription: string | null
        seoTitle: string | null
        slug: string
        status: string
        title: string
      }
      postSeries: { id: string; name: string; sortOrder: number }[]
      postTags: { id: string; name: string }[]
    }
  } = $props()

  const { post } = data
  let title = $state(post.title)
  let slug = $state(post.slug)
  let excerpt = $state(post.excerpt ?? '')
  let contentBody = $state(post.contentBody ?? '')
  let coverImageUrl = $state(post.coverImageUrl ?? '')
  let seoTitle = $state(post.seoTitle ?? '')
  let seoDescription = $state(post.seoDescription ?? '')
  let canonicalUrl = $state(post.canonicalUrl ?? '')
  let ogImageUrl = $state(post.ogImageUrl ?? '')
  let saving = $state(false)
  let errors = $state<Record<string, string>>({})
  let serverError = $state('')
  let mutationError = $state('')
  let editor = $state<Editor | null>(null)
  let editorWrapperEl = $state<HTMLDivElement | undefined>(undefined)
  let showMediaLibrary = $state(false)
  let showArticleSearch = $state(false)
  let showSchedulePicker = $state(false)
  let scheduleDate = $state('')
  let scheduleEl = $state<HTMLDivElement | undefined>(undefined)
  let activeTab = $state<'metadata' | 'seo' | 'toc'>('metadata')

  let selectedTagIds = $state<Set<string>>(new Set(data.postTags.map((t) => t.id)))
  let selectedSeries = $state<Map<string, number>>(
    new Map(data.postSeries.map((s) => [s.id, s.sortOrder])),
  )
  let tagSearch = $state('')
  let seriesSearch = $state('')

  const allTagsQuery = createQuery(() => ({
    queryFn: async () => {
      const res = await fetch('/api/blog/tags')
      if (!res.ok) throw new Error('Failed to fetch tags')
      return (await res.json()) as {
        tags: { id: string; name: string; postCount: number; slug: string }[]
      }
    },
    queryKey: ['admin', 'tags'],
    retry: 1,
  }))

  const allSeriesQuery = createQuery(() => ({
    queryFn: async () => {
      const res = await fetch('/api/blog/series')
      if (!res.ok) throw new Error('Failed to fetch series')
      return (await res.json()) as {
        series: {
          coverImageUrl: string | null
          description: string | null
          id: string
          name: string
          postCount: number
          slug: string
        }[]
      }
    },
    queryKey: ['admin', 'series'],
    retry: 1,
  }))

  let filteredTags = $derived(
    tagSearch
      ? (allTagsQuery.data?.tags ?? []).filter((t) =>
          t.name.toLowerCase().includes(tagSearch.toLowerCase()),
        )
      : (allTagsQuery.data?.tags ?? []),
  )

  let filteredSeries = $derived(
    seriesSearch
      ? (allSeriesQuery.data?.series ?? []).filter((s) =>
          s.name.toLowerCase().includes(seriesSearch.toLowerCase()),
        )
      : (allSeriesQuery.data?.series ?? []),
  )

  function toggleTag(id: string) {
    const next = new Set(selectedTagIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    selectedTagIds = next
  }

  function toggleSeries(id: string) {
    const next = new Map(selectedSeries)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.set(id, next.size)
    }
    selectedSeries = next
  }

  function updateSeriesOrder(id: string, order: number) {
    const next = new Map(selectedSeries)
    next.set(id, order)
    selectedSeries = next
  }

  $effect(() => {
    const el = editorWrapperEl
    if (!el) return
    const handler = () => {
      showArticleSearch = true
    }
    el.addEventListener('open-article-search', handler)
    return () => el.removeEventListener('open-article-search', handler)
  })

  $effect(() => {
    if (showSchedulePicker && scheduleEl) {
      const trap = createFocusTrap(scheduleEl)
      return () => trap.destroy()
    }
  })

  function parseContent(raw: string): object | string | null {
    if (!raw) return null
    const trimmed = raw.trim()
    if (trimmed.startsWith('{')) {
      try {
        return JSON.parse(trimmed) as object
      } catch {
        return trimmed
      }
    }
    return trimmed
  }

  function handleEditorUpdate(payload: { html: string; json: object; text: string }) {
    contentBody = JSON.stringify(payload.json)
  }

  function handleEditorReady(e: Editor) {
    editor = e
  }

  function handleSeoUpdate(field: string, value: string) {
    if (field === 'seoTitle') seoTitle = value
    else if (field === 'seoDescription') seoDescription = value
    else if (field === 'canonicalUrl') canonicalUrl = value
    else if (field === 'ogImageUrl') ogImageUrl = value
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    errors = {}
    serverError = ''

    const seriesIds = [...selectedSeries.entries()].map(([id, sortOrder]) => ({
      id,
      sortOrder,
    }))

    const result = updatePostSchema.safeParse({
      canonicalUrl: canonicalUrl || null,
      contentBody: contentBody || null,
      coverImageUrl: coverImageUrl || null,
      excerpt: excerpt || null,
      ogImageUrl: ogImageUrl || null,
      seoDescription: seoDescription || null,
      seoTitle: seoTitle || null,
      seriesIds,
      slug,
      tagIds: [...selectedTagIds],
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
      const res = await fetch(`/api/blog/${data.post.id}`, {
        body: JSON.stringify({
          canonicalUrl: canonicalUrl || null,
          contentBody,
          coverImageUrl: coverImageUrl || null,
          excerpt,
          ogImageUrl: ogImageUrl || null,
          seoDescription: seoDescription || null,
          seoTitle: seoTitle || null,
          seriesIds,
          slug,
          tagIds: [...selectedTagIds],
          title,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })

      if (!res.ok) {
        const err = (await res.json()) as { error?: string }
        serverError = err.error ?? 'Failed to update'
        saving = false
        return
      }
      saving = false
    } catch {
      serverError = 'Network error'
      saving = false
    }
  }

  async function publish() {
    mutationError = ''
    saving = true
    try {
      const res = await fetch(`/api/blog/${data.post.id}/publish`, { method: 'POST' })
      if (!res.ok) {
        const err = (await res.json()) as { error?: string }
        mutationError = err.error ?? 'Failed to publish post.'
        saving = false
        return
      }
      saving = false
      await invalidateAll()
    } catch {
      mutationError = 'Network error. Please try again.'
      saving = false
    }
  }

  async function schedulePublish() {
    if (!scheduleDate) return
    saving = true
    serverError = ''
    try {
      const res = await fetch(`/api/blog/${data.post.id}`, {
        body: JSON.stringify({
          scheduledAt: new Date(scheduleDate).toISOString(),
          status: 'scheduled',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })
      if (res.ok) {
        showSchedulePicker = false
        await invalidateAll()
      } else {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        serverError = err.error ?? 'Failed to schedule'
      }
    } catch {
      serverError = 'Network error'
    } finally {
      saving = false
    }
  }

  async function cancelSchedule() {
    saving = true
    serverError = ''
    try {
      const res = await fetch(`/api/blog/${data.post.id}`, {
        body: JSON.stringify({ scheduledAt: null, status: 'draft' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })
      if (res.ok) {
        await invalidateAll()
      } else {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        serverError = err.error ?? 'Failed to cancel schedule'
      }
    } catch {
      serverError = 'Network error'
    } finally {
      saving = false
    }
  }

  async function unpublish() {
    mutationError = ''
    saving = true
    try {
      const res = await fetch(`/api/blog/${data.post.id}/unpublish`, { method: 'POST' })
      if (!res.ok) {
        const err = (await res.json()) as { error?: string }
        mutationError = err.error ?? 'Failed to unpublish post.'
        saving = false
        return
      }
      saving = false
      await invalidateAll()
    } catch {
      mutationError = 'Network error. Please try again.'
      saving = false
    }
  }

  async function archive() {
    if (!confirm('Archive this post?')) {
      return
    }
    mutationError = ''
    saving = true
    try {
      const res = await fetch(`/api/blog/${data.post.id}/archive`, { method: 'POST' })
      if (!res.ok) {
        const err = (await res.json()) as { error?: string }
        mutationError = err.error ?? 'Failed to archive post.'
        saving = false
        return
      }
      saving = false
      goto('/admin/blog')
    } catch {
      mutationError = 'Network error. Please try again.'
      saving = false
    }
  }

  async function deletePost() {
    if (!confirm('Delete this post? This action can be undone by restoring from the blog list.')) {
      return
    }
    mutationError = ''
    saving = true
    try {
      const res = await fetch(`/api/blog/${data.post.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = (await res.json()) as { error?: string }
        mutationError = err.error ?? 'Failed to delete post.'
        saving = false
        return
      }
      saving = false
      goto('/admin/blog')
    } catch {
      mutationError = 'Network error. Please try again.'
      saving = false
    }
  }
</script>

<div class="flex items-center justify-between">
  <div class="flex items-center gap-3">
    <h1 class="text-2xl font-bold text-text-primary">Edit Post</h1>
    <span
      class="rounded-full px-2.5 py-0.5 text-[11px] font-medium {data.post.status === 'published'
        ? 'bg-success/10 text-success'
        : data.post.status === 'draft'
          ? 'bg-warning/10 text-warning'
          : data.post.status === 'scheduled'
            ? 'bg-info/10 text-info'
            : 'bg-destructive/10 text-destructive'}"
    >
      {data.post.status}
    </span>
  </div>
  <a href="/admin/blog" class="text-[13px] text-text-muted hover:text-text-primary">Back to list</a>
</div>

<form onsubmit={handleSubmit} class="mt-8" novalidate>
  {#if serverError}
    <p class="mb-6 rounded-lg bg-destructive/10 px-4 py-2 text-[13px] text-destructive">{serverError}</p>
  {/if}

  {#if mutationError}
    <p class="mb-6 rounded-lg bg-destructive/10 px-4 py-2 text-[13px] text-destructive">{mutationError}</p>
  {/if}

  <div class="flex gap-6">
    <!-- Main content area -->
    <div class="min-w-0 flex-1 space-y-6">
      <div>
        <label for="title" class="mb-2 block text-sm font-medium text-text-secondary">Title</label>
        <input
          id="title"
          bind:value={title}
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
        <label for="excerpt" class="mb-2 block text-sm font-medium text-text-secondary"
          >Excerpt</label
        >
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
        <div class="mb-2 flex items-center justify-between">
          <label for="content-editor" class="text-sm font-medium text-text-secondary">Content</label>
          <button
            type="button"
            onclick={() => (showMediaLibrary = true)}
            class="text-[12px] text-text-muted transition-colors hover:text-brand"
          >
            Media Library
          </button>
        </div>
        <!-- svelte-ignore binding_property_non_reactive -->
        <div id="content-editor" bind:this={editorWrapperEl}>
          <ArticleEditor
            content={parseContent(contentBody)}
            onUpdate={handleEditorUpdate}
            onReady={handleEditorReady}
          />
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
          {saving ? 'Saving...' : 'Save Changes'}
        </button>

        <a
          href="/admin/blog/{data.post.id}/preview"
          target="_blank"
          rel="noopener"
          class="rounded-lg border border-border px-5 py-2.5 text-[13px] font-medium text-text-secondary hover:text-text-primary"
        >
          Preview
        </a>

        {#if data.post.status === 'draft' || data.post.status === 'archived'}
          <button
            type="button"
            onclick={publish}
            disabled={saving}
            class="rounded-lg bg-success px-5 py-2.5 text-[13px] font-semibold text-brand-foreground transition-all hover:bg-success/80 disabled:opacity-50"
          >
            Publish
          </button>
          <button
            type="button"
            onclick={() => (showSchedulePicker = true)}
            disabled={saving}
            class="rounded-lg border border-info/30 px-5 py-2.5 text-[13px] font-medium text-info transition-colors hover:bg-info/10"
          >
            Schedule
          </button>
        {/if}

        {#if data.post.status === 'scheduled'}
          <button
            type="button"
            onclick={cancelSchedule}
            disabled={saving}
            class="rounded-lg border border-border px-5 py-2.5 text-[13px] font-medium text-text-secondary hover:text-text-primary"
          >
            Cancel Schedule
          </button>
        {/if}

        {#if data.post.status === 'published'}
          <button
            type="button"
            onclick={unpublish}
            disabled={saving}
            class="rounded-lg border border-border px-5 py-2.5 text-[13px] font-medium text-text-secondary hover:text-text-primary"
          >
            Unpublish
          </button>
        {/if}

        <button
          type="button"
          onclick={archive}
          class="rounded-lg border border-border px-5 py-2.5 text-[13px] font-medium text-text-secondary hover:text-text-primary"
        >
          Archive
        </button>

        <button
          type="button"
          onclick={deletePost}
          class="rounded-lg border border-destructive/30 px-5 py-2.5 text-[13px] font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          Delete
        </button>
      </div>
    </div>

    <!-- Sidebar -->
    <div class="w-72 shrink-0">
      <div class="sticky top-8 space-y-0">
        <div class="mb-4 flex border-b border-border">
          <button
            type="button"
            onclick={() => (activeTab = 'metadata')}
            class="flex-1 px-3 py-2 text-xs font-medium transition-colors {activeTab === 'metadata'
              ? 'border-b-2 border-brand text-brand'
              : 'text-text-muted hover:text-text-secondary'}"
          >
            Tags & Series
          </button>
          <button
            type="button"
            onclick={() => (activeTab = 'toc')}
            class="flex-1 px-3 py-2 text-xs font-medium transition-colors {activeTab === 'toc'
              ? 'border-b-2 border-brand text-brand'
              : 'text-text-muted hover:text-text-secondary'}"
          >
            Outline
          </button>
          <button
            type="button"
            onclick={() => (activeTab = 'seo')}
            class="flex-1 px-3 py-2 text-xs font-medium transition-colors {activeTab === 'seo'
              ? 'border-b-2 border-brand text-brand'
              : 'text-text-muted hover:text-text-secondary'}"
          >
            SEO & Social
          </button>
        </div>

        <div class="rounded-lg border border-border bg-surface-base p-4">
          {#if activeTab === 'metadata'}
            <!-- Tags section -->
            <div class="mb-5">
              <h3 class="mb-2 text-xs font-semibold text-text-secondary">Tags</h3>
              {#if selectedTagIds.size > 0}
                <div class="mb-2 flex flex-wrap gap-1.5">
                  {#each [...selectedTagIds] as tagId}
                    {@const tag = (allTagsQuery.data?.tags ?? []).find((t) => t.id === tagId)}
                    {#if tag}
                      <span
                        class="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-medium text-brand"
                      >
                        {tag.name}
                        <button
                          type="button"
                          onclick={() => toggleTag(tagId)}
                          class="text-brand/60 hover:text-brand"
                          aria-label="Remove tag"
                        >
                          &times;
                        </button>
                      </span>
                    {/if}
                  {/each}
                </div>
              {/if}
              <input
                type="text"
                bind:value={tagSearch}
                placeholder="Search tags..."
                aria-label="Search tags"
                class="w-full rounded-md border border-border bg-input px-2.5 py-1.5 text-[12px] text-text-primary placeholder:text-text-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
              {#if allTagsQuery.isPending}
                <p class="mt-1 text-[11px] text-text-faint">Loading tags...</p>
              {:else if filteredTags.length > 0}
                <div class="mt-1.5 max-h-32 overflow-y-auto">
                  {#each filteredTags as tag (tag.id)}
                    <button
                      type="button"
                      onclick={() => toggleTag(tag.id)}
                      class="flex w-full items-center gap-2 rounded-md px-2 py-1 text-start text-[12px] transition-colors {selectedTagIds.has(tag.id)
                        ? 'bg-brand/10 text-brand'
                        : 'text-text-muted hover:bg-surface hover:text-text-primary'}"
                    >
                      <span
                        class="flex size-3.5 shrink-0 items-center justify-center rounded border {selectedTagIds.has(tag.id)
                          ? 'border-brand bg-brand text-brand-foreground'
                          : 'border-border'}"
                      >
                        {#if selectedTagIds.has(tag.id)}
                          <svg class="size-2.5" viewBox="0 0 12 12" fill="none">
                            <path
                              d="M2 6l3 3 5-5"
                              stroke="currentColor"
                              stroke-width="2"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            />
                          </svg>
                        {/if}
                      </span>
                      <span class="flex-1">{tag.name}</span>
                      <span class="text-text-faint">{tag.postCount}</span>
                    </button>
                  {/each}
                </div>
              {:else}
                <p class="mt-1 text-[11px] text-text-faint">No tags found</p>
              {/if}
            </div>

            <!-- Series section -->
            <div>
              <h3 class="mb-2 text-xs font-semibold text-text-secondary">Series</h3>
              {#if selectedSeries.size > 0}
                <div class="mb-2 space-y-1">
                  {#each [...selectedSeries.entries()] as [seriesId, order] (seriesId)}
                    {@const s = (allSeriesQuery.data?.series ?? []).find((ser) => ser.id === seriesId)}
                    {#if s}
                      <div
                        class="flex items-center gap-2 rounded-md bg-brand/10 px-2.5 py-1 text-[11px]"
                      >
                        <span class="flex-1 font-medium text-brand">{s.name}</span>
                        <input
                          type="number"
                          value={order}
                          onchange={(e) =>
                            updateSeriesOrder(seriesId, Number((e.target as HTMLInputElement).value))}
                          min="0"
                          class="w-10 rounded border border-brand/30 bg-transparent px-1 py-0.5 text-center text-[11px] text-brand focus:border-brand focus:outline-none"
                          aria-label="Sort order"
                        />
                        <button
                          type="button"
                          onclick={() => toggleSeries(seriesId)}
                          class="text-brand/60 hover:text-brand"
                          aria-label="Remove series"
                        >
                          &times;
                        </button>
                      </div>
                    {/if}
                  {/each}
                </div>
              {/if}
              <input
                type="text"
                bind:value={seriesSearch}
                placeholder="Search series..."
                aria-label="Search series"
                class="w-full rounded-md border border-border bg-input px-2.5 py-1.5 text-[12px] text-text-primary placeholder:text-text-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
              {#if allSeriesQuery.isPending}
                <p class="mt-1 text-[11px] text-text-faint">Loading series...</p>
              {:else if filteredSeries.length > 0}
                <div class="mt-1.5 max-h-32 overflow-y-auto">
                  {#each filteredSeries as s (s.id)}
                    <button
                      type="button"
                      onclick={() => toggleSeries(s.id)}
                      class="flex w-full items-center gap-2 rounded-md px-2 py-1 text-start text-[12px] transition-colors {selectedSeries.has(s.id)
                        ? 'bg-brand/10 text-brand'
                        : 'text-text-muted hover:bg-surface hover:text-text-primary'}"
                    >
                      <span
                        class="flex size-3.5 shrink-0 items-center justify-center rounded border {selectedSeries.has(s.id)
                          ? 'border-brand bg-brand text-brand-foreground'
                          : 'border-border'}"
                      >
                        {#if selectedSeries.has(s.id)}
                          <svg class="size-2.5" viewBox="0 0 12 12" fill="none">
                            <path
                              d="M2 6l3 3 5-5"
                              stroke="currentColor"
                              stroke-width="2"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            />
                          </svg>
                        {/if}
                      </span>
                      <span class="flex-1">{s.name}</span>
                      <span class="text-text-faint">{s.postCount}</span>
                    </button>
                  {/each}
                </div>
              {:else}
                <p class="mt-1 text-[11px] text-text-faint">
                  No series found.
                  <a href="/admin/blog/series" class="text-brand hover:underline">Create one</a>
                </p>
              {/if}
            </div>
          {:else if activeTab === 'toc'}
            <TocPanel {editor} />
          {:else}
            <SeoPanel
              {seoTitle}
              {seoDescription}
              {canonicalUrl}
              {ogImageUrl}
              articleTitle={title}
              siteOrigin={typeof window !== 'undefined' ? window.location.origin : ''}
              onUpdate={handleSeoUpdate}
            />
          {/if}
        </div>
      </div>
    </div>
  </div>
</form>

{#if showMediaLibrary && editor}
  <MediaLibrary {editor} onClose={() => (showMediaLibrary = false)} />
{/if}

{#if showArticleSearch && editor}
  <ArticleSearch {editor} onClose={() => (showArticleSearch = false)} />
{/if}

{#if showSchedulePicker}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50"
    role="dialog"
    tabindex="-1"
    onclick={() => (showSchedulePicker = false)}
    onkeydown={(e) => e.key === 'Escape' && (showSchedulePicker = false)}
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      bind:this={scheduleEl}
      class="w-full max-w-sm rounded-lg border border-border bg-surface p-6"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <h3 class="text-lg font-semibold text-text-primary">Schedule Publication</h3>
      <p class="mt-1 text-sm text-text-muted">Choose a date and time to publish this post.</p>
      <div class="mt-4">
        <label for="schedule-date" class="mb-1 block text-sm font-medium text-text-secondary">
          Publish at
        </label>
        <input
          id="schedule-date"
          type="datetime-local"
          bind:value={scheduleDate}
          min={new Date().toISOString().slice(0, 16)}
          class="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-text-primary focus:border-brand focus:outline-none"
        />
      </div>
      <div class="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onclick={() => (showSchedulePicker = false)}
          class="rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-text-secondary hover:text-text-primary"
        >
          Cancel
        </button>
        <button
          type="button"
          onclick={schedulePublish}
          disabled={saving || !scheduleDate}
          class="rounded-lg bg-info px-4 py-2 text-[13px] font-semibold text-brand-foreground transition-all hover:bg-info/80 disabled:opacity-50"
        >
          Schedule
        </button>
      </div>
    </div>
  </div>
{/if}
