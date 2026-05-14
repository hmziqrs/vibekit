<script lang="ts">
  interface Props {
    seoTitle?: string
    seoDescription?: string
    canonicalUrl?: string
    ogImageUrl?: string
    articleTitle: string
    siteOrigin: string
    onUpdate: (field: string, value: string) => void
  }

  let {
    seoTitle = '',
    seoDescription = '',
    canonicalUrl = '',
    ogImageUrl = '',
    articleTitle,
    siteOrigin,
    onUpdate,
  }: Props = $props()

  let titleLength = $derived(seoTitle.length)
  let descLength = $derived(seoDescription.length)
  function getTitleGuidance(len: number): string {
    if (len === 0) return ''
    if (len <= 60) return 'text-success'
    return 'text-warning'
  }

  function getDescGuidance(len: number): string {
    if (len === 0) return ''
    if (len <= 160) return 'text-success'
    return 'text-warning'
  }

  let titleGuidance = $derived(getTitleGuidance(titleLength))
  let descGuidance = $derived(getDescGuidance(descLength))
</script>

<div class="space-y-4">
  <h3 class="text-sm font-medium text-text-secondary">SEO & Social</h3>

  <div>
    <label for="seo-title" class="mb-1 block text-xs text-text-muted">
      SEO Title
      {#if titleLength > 0}
        <span class={titleGuidance}>({titleLength}/60)</span>
      {/if}
    </label>
    <input
      id="seo-title"
      type="text"
      value={seoTitle}
      placeholder={articleTitle}
      class="w-full rounded border border-border bg-transparent px-2 py-1.5 text-xs text-text-primary outline-none focus:border-brand"
      oninput={(e) => onUpdate('seoTitle', (e.target as HTMLInputElement).value)}
    />
  </div>

  <div>
    <label for="seo-desc" class="mb-1 block text-xs text-text-muted">
      SEO Description
      {#if descLength > 0}
        <span class={descGuidance}>({descLength}/160)</span>
      {/if}
    </label>
    <textarea
      id="seo-desc"
      rows="3"
      class="w-full rounded border border-border bg-transparent px-2 py-1.5 text-xs text-text-primary outline-none focus:border-brand resize-none"
      oninput={(e) => onUpdate('seoDescription', (e.target as HTMLTextAreaElement).value)}
    >{seoDescription}</textarea>
  </div>

  <div>
    <label for="canonical" class="mb-1 block text-xs text-text-muted">Canonical URL</label>
    <input
      id="canonical"
      type="url"
      value={canonicalUrl}
      placeholder={`${siteOrigin}/blog/...`}
      class="w-full rounded border border-border bg-transparent px-2 py-1.5 text-xs text-text-primary outline-none focus:border-brand"
      oninput={(e) => onUpdate('canonicalUrl', (e.target as HTMLInputElement).value)}
    />
  </div>

  <div>
    <label for="og-image" class="mb-1 block text-xs text-text-muted">OG Image URL</label>
    <input
      id="og-image"
      type="url"
      value={ogImageUrl}
      placeholder="https://..."
      class="w-full rounded border border-border bg-transparent px-2 py-1.5 text-xs text-text-primary outline-none focus:border-brand"
      oninput={(e) => onUpdate('ogImageUrl', (e.target as HTMLInputElement).value)}
    />
  </div>

  <div class="rounded-lg border border-border p-3 space-y-2">
    <p class="text-[10px] font-medium text-text-faint uppercase tracking-wider">Preview</p>
    <div class="rounded bg-surface p-2">
      <p class="text-xs font-medium text-text-primary truncate">{seoTitle || articleTitle || 'Untitled'}</p>
      <p class="text-[11px] text-text-muted truncate mt-0.5">{siteOrigin}</p>
      {#if seoDescription}
        <p class="text-[11px] text-text-subtle mt-1 line-clamp-2">{seoDescription}</p>
      {/if}
    </div>
  </div>
</div>
