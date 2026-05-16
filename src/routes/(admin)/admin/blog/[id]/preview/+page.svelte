<script lang="ts">
  import purify from 'isomorphic-dompurify'
  import { formatDate } from '$lib/i18n.svelte'
  import { highlightCodeBlocks, renderAndSanitize, sanitizeHtml } from '$lib/markdown'
  import { onMount } from 'svelte'

  interface Post {
    contentBody: string | null
    contentHtml: string | null
    coverImageUrl: string | null
    createdAt: string
    excerpt: string | null
    id: string
    publishedAt: string | null
    slug: string
    status: string
    title: string
  }

  let { data }: { data: { post: Post } } = $props()

  let renderedHtml = $state('')
  let loading = $state(true)
  let errorMsg = $state('')

  const PURIFY_OPTS = {
    ADD_ATTR: ['target'],
    ALLOW_DATA_ATTR: false,
    FORBID_ATTR: ['formaction', 'xlink:href', 'data', 'dynsrc', 'lowsrc', 'style'],
    FORBID_TAGS: ['button', 'form', 'input', 'select', 'style', 'textarea'],
  }

  function sanitizeWithHighlight(html: string): string {
    return sanitizeHtml(highlightCodeBlocks(html))
  }

  onMount(async () => {
    try {
      const { id } = data.post
      const res = await fetch(`/api/blog/${id}`)
      if (!res.ok) throw new Error('Failed to fetch post')
      const post = (await res.json()) as Post

      if (post.contentBody) {
        const trimmed = post.contentBody.trim()
        if (trimmed.startsWith('{')) {
          // TipTap JSON — render via dynamic import, then sanitize
          try {
            const { generateHTML } = await import('@tiptap/html')
            const { default: StarterKit } = await import('@tiptap/starter-kit')
            const { default: Image } = await import('@tiptap/extension-image')
            const { FigureImage } = await import('$lib/editor/extensions/figure-image.svelte.ts')
            const raw = generateHTML(JSON.parse(trimmed) as Record<string, unknown>, [
              StarterKit,
              Image,
              FigureImage,
            ])
            renderedHtml = sanitizeWithHighlight(raw)
          } catch {
            renderedHtml = renderAndSanitize(trimmed)
          }
        } else {
          renderedHtml = renderAndSanitize(trimmed)
        }
      } else if (post.contentHtml) {
        renderedHtml = sanitizeWithHighlight(post.contentHtml)
      }
    } catch (error) {
      errorMsg = error instanceof Error ? error.message : 'Failed to load preview'
    } finally {
      loading = false
    }
  })
</script>

<div class="mb-6 flex items-center justify-between rounded-lg border border-warning/30 bg-warning/10 px-4 py-3">
  <div class="flex items-center gap-2">
    <span class="size-2 rounded-full bg-warning"></span>
    <span class="text-[13px] font-medium text-warning">Preview Mode</span>
    <span class="text-[13px] text-warning/60">This post is not yet published</span>
  </div>
  <a
    href="/admin/blog/{data.post.id}/edit"
    class="rounded-lg border border-warning/30 px-3 py-1.5 text-[12px] font-medium text-warning hover:bg-warning/10"
  >
    Back to Edit
  </a>
</div>

{#if loading}
  <div class="space-y-4 px-6 py-24">
    <div class="mx-auto max-w-3xl">
      <div class="h-10 w-3/4 animate-pulse rounded bg-muted"></div>
      <div class="mt-4 h-4 w-1/4 animate-pulse rounded bg-muted"></div>
      <div class="mt-10 h-64 animate-pulse rounded-xl bg-muted"></div>
      <div class="mt-8 space-y-3">
        {#each Array(8) as _}
          <div class="h-4 w-full animate-pulse rounded bg-muted"></div>
        {/each}
      </div>
    </div>
  </div>
{:else if errorMsg}
  <div class="px-6 py-24 text-center">
    <p class="text-destructive">{errorMsg}</p>
  </div>
{:else}
  <article class="px-6 py-24">
    <div class="mx-auto max-w-3xl">
      <header class="mb-10">
        <h1 class="mb-4 text-[clamp(1.8rem,4vw,2.8rem)] font-semibold leading-tight tracking-[-0.02em] text-text-primary">
          {data.post.title}
        </h1>
        <time class="text-[14px] text-text-subtle">
          {formatDate(data.post.publishedAt ?? data.post.createdAt, { year: 'numeric', month: 'long', day: 'numeric' })}
        </time>
      </header>

      {#if data.post.coverImageUrl}
        <img
          src={data.post.coverImageUrl}
          alt={data.post.title}
          class="mb-10 w-full rounded-xl border border-border"
          loading="lazy"
        />
      {/if}

      <div class="prose prose-invert max-w-none">
        {@html renderedHtml}
      </div>
    </div>
  </article>
{/if}
