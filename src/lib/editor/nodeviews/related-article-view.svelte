<script lang="ts">
  interface Props {
    articleId?: string
    excerpt?: string
    slug?: string
    title?: string
    onUpdateAttrs: (attrs: Record<string, unknown>) => void
  }

  let {
    articleId = '',
    excerpt = '',
    slug = '',
    title = '',
    onUpdateAttrs,
  }: Props = $props()
</script>

<div class="my-3 rounded-lg border border-border bg-surface p-4" contenteditable="false">
  <div class="mb-1 text-xs uppercase tracking-wide text-text-subtle">Related Article</div>

  {#if title}
    <a
      href="/blog/{slug}"
      class="text-base font-medium text-text-primary hover:underline"
    >
      {title}
    </a>
  {:else}
    <p class="text-base text-text-muted">Untitled article</p>
  {/if}

  {#if excerpt}
    <p class="mt-1 text-sm leading-relaxed text-text-muted">
      {excerpt}
    </p>
  {/if}

  {#if slug}
    <p class="mt-2 text-xs text-text-subtle">
      /blog/{slug}
    </p>
  {/if}

  {#if articleId}
    <p class="mt-1 text-xs text-text-faint">
      ID: {articleId}
    </p>
  {/if}
</div>
