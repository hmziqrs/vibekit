<script lang="ts">
  import { cn } from '$lib/utils'
  import { Plus, Trash2 } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button'

  interface TimelineEntry {
    text: string
    time: string
  }

  interface Props {
    entries: TimelineEntry[]
    onUpdateAttrs: (attrs: Record<string, unknown>) => void
  }

  let { entries, onUpdateAttrs }: Props = $props()

  function update() {
    onUpdateAttrs({ entries: [...entries] })
  }

  function addEntry() {
    entries = [...entries, { text: '', time: '' }]
    update()
  }

  function removeEntry(index: number) {
    entries = entries.filter((_, i) => i !== index)
    update()
  }

  function updateEntry(index: number, field: keyof TimelineEntry, value: string) {
    entries = entries.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry))
    update()
  }
</script>

<div
  class="timeline-block rounded-lg border border-border bg-surface-elevated p-4"
  contenteditable="false"
>
  <div class="mb-2 text-sm font-semibold text-text-primary">Timeline</div>

  <div class="space-y-2">
    {#each entries as entry, i}
      <div class="flex items-start gap-2">
        <input
          type="text"
          value={entry.time}
          placeholder="10:30 AM"
          class="w-24 shrink-0 rounded border border-border bg-surface-base px-2 py-1 text-sm text-text-primary"
          oninput={(e) => updateEntry(i, 'time', (e.target as HTMLInputElement).value)}
        />
        <span class="mt-1 text-text-muted">—</span>
        <input
          type="text"
          value={entry.text}
          placeholder="Event description..."
          class="flex-1 rounded border border-border bg-surface-base px-2 py-1 text-sm text-text-primary"
          oninput={(e) => updateEntry(i, 'text', (e.target as HTMLInputElement).value)}
        />
        <button
          type="button"
          class="mt-1 shrink-0 text-text-muted hover:text-destructive"
          onclick={() => removeEntry(i)}
          aria-label="Remove entry"
        >
          <Trash2 size={14} />
        </button>
      </div>
    {/each}
  </div>

  <Button variant="ghost" size="sm" class="mt-2" onclick={addEntry}>
    <Plus size={14} />
    <span>Add entry</span>
  </Button>
</div>
