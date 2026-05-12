<script lang="ts">
  import type { Editor } from '@tiptap/core'
  import { goto, invalidateAll } from '$app/navigation'
  import ArticleEditor from '$lib/editor/article-editor.svelte'
  import ImageUpload from '$lib/components/image-upload.svelte'
  import SeoPanel from '$lib/components/seo-panel.svelte'
  import TocPanel from '$lib/components/toc-panel.svelte'
  import MediaLibrary from '$lib/components/media-library.svelte'
  import ArticleSearch from '$lib/components/article-search.svelte'
  import { updatePostSchema } from '$lib/validators/blog'

  const {
    data,
  }: {
    data: {
      post: {
        id: string
        title: string
        slug: string
        excerpt: string | null
        contentBody: string | null
        coverImageUrl: string | null
        status: string
        seoTitle: string | null
        seoDescription: string | null
        canonicalUrl: string | null
        ogImageUrl: string | null
      }
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
  let editor = $state<Editor | null>(null)
  let editorWrapperEl = $state<HTMLDivElement | undefined>(undefined)
  let showMediaLibrary = $state(false)
  let showArticleSearch = $state(false)
  let showSchedulePicker = $state(false)
  let scheduleDate = $state('')
  let activeTab = $state<'toc' | 'seo'>('toc')

  $effect(() => {
    const el = editorWrapperEl
    if (!el) return
    const handler = () => { showArticleSearch = true }
    el.addEventListener('open-article-search', handler)
    return () => el.removeEventListener('open-article-search', handler)
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

    const result = updatePostSchema.safeParse({
      canonicalUrl: canonicalUrl || null,
      contentBody: contentBody || null,
      coverImageUrl: coverImageUrl || null,
      excerpt: excerpt || null,
      ogImageUrl: ogImageUrl || null,
      seoDescription: seoDescription || null,
      seoTitle: seoTitle || null,
      slug,
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
          slug,
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
    saving = true
    await fetch(`/api/blog/${data.post.id}/publish`, { method: 'POST' })
    saving = false
    await invalidateAll()
  }

  async function schedulePublish() {
    if (!scheduleDate) return
    saving = true
    const res = await fetch(`/api/blog/${data.post.id}`, {
      body: JSON.stringify({
        scheduledAt: new Date(scheduleDate).toISOString(),
        status: 'scheduled',
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PATCH',
    })
    saving = false
    if (res.ok) {
      showSchedulePicker = false
      await invalidateAll()
    }
  }

  async function cancelSchedule() {
    saving = true
    const res = await fetch(`/api/blog/${data.post.id}`, {
      body: JSON.stringify({ scheduledAt: null, status: 'draft' }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PATCH',
    })
    saving = false
    if (res.ok) await invalidateAll()
  }

  async function unpublish() {
    saving = true
    await fetch(`/api/blog/${data.post.id}/unpublish`, { method: 'POST' })
    saving = false
    await invalidateAll()
  }

  async function archive() {
    if (!confirm('Archive this post?')) {
      return
    }
    await fetch(`/api/blog/${data.post.id}/archive`, { method: 'POST' })
    goto('/admin/blog')
  }

  async function deletePost() {
    if (!confirm('Delete this post? This action can be undone by restoring from the blog list.')) {
      return
    }
    await fetch(`/api/blog/${data.post.id}`, { method: 'DELETE' })
    goto('/admin/blog')
  }
</script>

<div class="flex items-center justify-between">
  <div class="flex items-center gap-3">
    <h1 class="text-2xl font-bold text-text-primary">Edit Post</h1>
    <span
      class="rounded-full px-2.5 py-0.5 text-[11px] font-medium {data.post.status === 'published'
        ? 'bg-green-500/10 text-green-400'
        : data.post.status === 'draft'
          ? 'bg-yellow-500/10 text-yellow-400'
          : data.post.status === 'scheduled'
            ? 'bg-blue-500/10 text-blue-400'
            : 'bg-red-500/10 text-red-400'}"
    >
      {data.post.status}
    </span>
  </div>
  <a href="/admin/blog" class="text-[13px] text-text-muted hover:text-text-primary">Back to list</a>
</div>

<form onsubmit={handleSubmit} class="mt-8" novalidate>
  {#if serverError}
    <p class="rounded-lg bg-red-500/10 px-4 py-2 text-[13px] text-red-400 mb-6">{serverError}</p>
  {/if}

  <div class="flex gap-6">
    <!-- Main content area -->
    <div class="flex-1 min-w-0 space-y-6">
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
          <p id="title-error" class="mt-1 text-[12px] text-red-400">{errors.title}</p>
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
          <p id="slug-error" class="mt-1 text-[12px] text-red-400">{errors.slug}</p>
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
          <p id="excerpt-error" class="mt-1 text-[12px] text-red-400">{errors.excerpt}</p>
        {/if}
      </div>

      <ImageUpload
        currentUrl={coverImageUrl}
        onUpload={(url) => (coverImageUrl = url)}
        onRemove={() => (coverImageUrl = '')}
      />
      {#if errors.coverImageUrl}
        <p id="cover-image-error" class="mt-1 text-[12px] text-red-400">{errors.coverImageUrl}</p>
      {/if}

      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text-secondary">Content</label>
          <button
            type="button"
            onclick={() => (showMediaLibrary = true)}
            class="text-[12px] text-text-muted hover:text-brand transition-colors"
          >
            Media Library
          </button>
        </div>
        <!-- svelte-ignore binding_property_non_reactive -->
        <div bind:this={editorWrapperEl}>
          <ArticleEditor
            content={parseContent(contentBody)}
            onUpdate={handleEditorUpdate}
            onReady={handleEditorReady}
          />
        </div>
        {#if errors.contentBody}
          <p id="content-error" class="mt-1 text-[12px] text-red-400">{errors.contentBody}</p>
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
          class="rounded-lg border border-white/[0.1] px-5 py-2.5 text-[13px] font-medium text-text-secondary hover:text-text-primary"
        >
          Preview
        </a>

        {#if data.post.status === 'draft' || data.post.status === 'archived'}
          <button
            type="button"
            onclick={publish}
            disabled={saving}
            class="rounded-lg bg-green-600 px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-green-700 disabled:opacity-50"
          >
            Publish
          </button>
          <button
            type="button"
            onclick={() => showSchedulePicker = true}
            disabled={saving}
            class="rounded-lg border border-blue-500/30 px-5 py-2.5 text-[13px] font-medium text-blue-400 transition-colors hover:bg-blue-500/10"
          >
            Schedule
          </button>
        {/if}

        {#if data.post.status === 'scheduled'}
          <button
            type="button"
            onclick={cancelSchedule}
            disabled={saving}
            class="rounded-lg border border-white/[0.1] px-5 py-2.5 text-[13px] font-medium text-text-secondary hover:text-text-primary"
          >
            Cancel Schedule
          </button>
        {/if}

        {#if data.post.status === 'published'}
          <button
            type="button"
            onclick={unpublish}
            disabled={saving}
            class="rounded-lg border border-white/[0.1] px-5 py-2.5 text-[13px] font-medium text-text-secondary hover:text-text-primary"
          >
            Unpublish
          </button>
        {/if}

        <button
          type="button"
          onclick={archive}
          class="rounded-lg border border-white/[0.1] px-5 py-2.5 text-[13px] font-medium text-text-secondary hover:text-text-primary"
        >
          Archive
        </button>

        <button
          type="button"
          onclick={deletePost}
          class="rounded-lg border border-red-500/30 px-5 py-2.5 text-[13px] font-medium text-red-400 transition-colors hover:bg-red-500/10"
        >
          Delete
        </button>
      </div>
    </div>

    <!-- Sidebar -->
    <div class="w-72 shrink-0">
      <div class="sticky top-8 space-y-0">
        <div class="flex border-b border-border mb-4">
          <button
            type="button"
            onclick={() => (activeTab = 'toc')}
            class="flex-1 px-3 py-2 text-xs font-medium transition-colors {activeTab === 'toc'
              ? 'text-brand border-b-2 border-brand'
              : 'text-text-muted hover:text-text-secondary'}"
          >
            Outline
          </button>
          <button
            type="button"
            onclick={() => (activeTab = 'seo')}
            class="flex-1 px-3 py-2 text-xs font-medium transition-colors {activeTab === 'seo'
              ? 'text-brand border-b-2 border-brand'
              : 'text-text-muted hover:text-text-secondary'}"
          >
            SEO & Social
          </button>
        </div>

        <div class="rounded-lg border border-border bg-surface-base p-4">
          {#if activeTab === 'toc'}
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
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    onclick={() => (showSchedulePicker = false)}
  >
    <div
      class="w-full max-w-sm rounded-lg border border-border bg-surface p-6"
      onclick={(e) => e.stopPropagation()}
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
          class="rounded-lg border border-white/[0.1] px-4 py-2 text-[13px] font-medium text-text-secondary hover:text-text-primary"
        >
          Cancel
        </button>
        <button
          type="button"
          onclick={schedulePublish}
          disabled={saving || !scheduleDate}
          class="rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-50"
        >
          Schedule
        </button>
      </div>
    </div>
  </div>
{/if}
