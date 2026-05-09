<script lang="ts">
  import { ArticleEditor } from '$lib/editor'

  let bodyJson = $state<object | null>(null)
  let bodyHtml = $state('')
  let bodyText = $state('')
  let showJson = $state(false)
  let showHtml = $state(false)
</script>

<svelte:head>
  <title>Editor Test — Admin</title>
</svelte:head>

<div class="mx-auto max-w-4xl px-4 py-8">
  <h1 class="mb-6 text-2xl font-bold text-text-primary">Editor Test Page</h1>

  <div class="mb-8">
    <ArticleEditor
      placeholder="Start writing your article..."
      onUpdate={({ json, html, text }) => {
        bodyJson = json
        bodyHtml = html
        bodyText = text
      }}
      onAutoSave={({ json }) => {
        console.log('Auto-saved:', json)
      }}
    />
  </div>

  <div class="space-y-4">
    <div class="flex gap-2">
      <button
        class="rounded-md bg-surface px-3 py-1.5 text-sm text-text-primary hover:bg-muted"
        onclick={() => (showJson = !showJson)}
      >
        {showJson ? 'Hide' : 'Show'} JSON
      </button>
      <button
        class="rounded-md bg-surface px-3 py-1.5 text-sm text-text-primary hover:bg-muted"
        onclick={() => (showHtml = !showHtml)}
      >
        {showHtml ? 'Hide' : 'Show'} HTML
      </button>
    </div>

    {#if showJson && bodyJson}
      <pre class="overflow-auto rounded-lg bg-surface p-4 text-xs text-text-secondary">{JSON.stringify(bodyJson, null, 2)}</pre>
    {/if}

    {#if showHtml && bodyHtml}
      <pre class="overflow-auto rounded-lg bg-surface p-4 text-xs text-text-secondary">{bodyHtml}</pre>
    {/if}
  </div>
</div>
