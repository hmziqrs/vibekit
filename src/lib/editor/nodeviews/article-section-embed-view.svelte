<script lang="ts">
  import { sanitizeHtml } from '$lib/editor/utils/clean-paste'

  interface Props {
    articleId: string
    articleSlug: string
    articleTitle: string
    content: string
    onUpdateAttrs: (attrs: Record<string, unknown>) => void
  }

  let {
    articleSlug,
    articleTitle,
    content,
    onUpdateAttrs,
  }: Props = $props()

  const safeContent = $derived(sanitizeHtml(content))
</script>

<div class="my-3 rounded-lg border border-brand/30 bg-brand/5 overflow-hidden" contenteditable="false">
  <div class="flex items-center gap-2 border-b border-brand/20 px-3 py-1.5">
    <svg class="size-3.5 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
    <span class="text-[11px] font-medium text-brand">From:</span>
    <a
      href="/blog/{articleSlug}"
      target="_blank"
      rel="noopener noreferrer"
      class="text-[11px] text-brand hover:underline truncate"
    >
      {articleTitle || 'Untitled article'}
    </a>
  </div>
  {#if content}
    <div class="px-4 py-3 text-sm text-text-secondary prose-sm">
      {@html safeContent}
    </div>
  {:else}
    <div class="px-4 py-3 text-sm text-text-faint italic">
      No content embedded.
    </div>
  {/if}
</div>
