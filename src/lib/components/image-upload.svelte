<script lang="ts">
  const {
    currentUrl = '',
    onUpload,
    onRemove,
  }: {
    currentUrl?: string
    onUpload: (url: string) => void
    onRemove: () => void
  } = $props()

  let uploading = $state(false)
  let error = $state('')
  let dragOver = $state(false)

  const MAX_SIZE = 5 * 1024 * 1024
  const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      error = 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF.'
      return
    }
    if (file.size > MAX_SIZE) {
      error = `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max: 5MB.`
      return
    }

    error = ''
    uploading = true

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/admin/upload', { body: formData, method: 'POST' })
      const data = (await res.json()) as { url?: string; error?: string }

      if (!res.ok || data.error) {
        error = data.error ?? 'Upload failed'
        return
      }

      onUpload(data.url!)
    } catch (e) {
      console.error('Failed to upload image', e)
      error = 'Network error'
    } finally {
      uploading = false
    }
  }

  function onFileInput(e: Event) {
    const input = e.target as HTMLInputElement
    if (input.files?.[0]) {handleFile(input.files[0])}
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    dragOver = false
    const file = e.dataTransfer?.files?.[0]
    if (file) {handleFile(file)}
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault()
    dragOver = true
  }

  function onDragLeave() {
    dragOver = false
  }
</script>

<div class="space-y-2">
  <label id="cover-image-label" class="mb-2 block text-sm font-medium text-text-secondary">Cover Image</label>

  {#if error}
    <p class="rounded-lg bg-red-500/10 px-4 py-2 text-[13px] text-red-400">{error}</p>
  {/if}

  {#if currentUrl}
    <div class="relative group">
      <img
        src={currentUrl}
        alt="Cover preview"
        class="h-40 w-full rounded-lg border border-border object-cover"
      />
      <button
        type="button"
        onclick={onRemove}
        class="absolute top-2 right-2 rounded-md bg-surface/90 px-2 py-1 text-[12px] text-text-secondary opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
      >
        Remove
      </button>
    </div>
  {:else}
    <div
      class="relative flex h-32 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border transition-colors {dragOver
        ? 'border-brand bg-brand/5'
        : 'hover:border-text-muted'}"
      ondrop={onDrop}
      ondragover={onDragOver}
      ondragleave={onDragLeave}
      role="button"
      tabindex="0"
      aria-label="Upload image"
    >
      {#if uploading}
        <p class="text-[13px] text-text-muted">Uploading...</p>
      {:else}
        <div class="text-center">
          <p class="text-[13px] text-text-muted">Drop image here or click to upload</p>
          <p class="mt-1 text-[11px] text-text-faint">JPEG, PNG, WebP, GIF — Max 5MB</p>
        </div>
      {/if}
      <input
        type="file"
        accept={ACCEPT}
        onchange={onFileInput}
        aria-labelledby="cover-image-label"
        class="absolute inset-0 cursor-pointer opacity-0"
        disabled={uploading}
      />
    </div>
  {/if}
</div>
