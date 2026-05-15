<script lang="ts">
  let { postId }: { postId: string } = $props()

  let maxProgress = $state(0)
  let startTime = $state(Date.now())
  let sentFinalUpdate = $state(false)
  let viewId = $state<string | null>(null)

  async function recordView() {
    try {
      const referrer = document.referrer || undefined
      const res = await fetch('/api/analytics/view', {
        body: JSON.stringify({ postId, referrer }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (!res.ok) return
      const { recorded, viewId: vid } = (await res.json()) as { recorded?: boolean; viewId?: string }
      if (recorded && vid) {
        viewId = vid
      }
    } catch (error) {
      console.error('Failed to record page view', error)
    }
  }

  function getReadingProgress(): number {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight
    if (docHeight <= 0) return 100
    return Math.min(100, Math.round((window.scrollY / docHeight) * 100))
  }

  async function sendProgressUpdate() {
    if (sentFinalUpdate || !viewId) return

    const progress = getReadingProgress()
    const readTime = Math.round((Date.now() - startTime) / 1000)

    if (progress > maxProgress) {
      maxProgress = progress
    }

    try {
      await fetch('/api/analytics/reading', {
        body: JSON.stringify({ postId, progress: maxProgress, readTime }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
    } catch (error) {
      console.error('Failed to send reading progress', error)
    }
  }

  let interval: ReturnType<typeof setInterval>

  $effect(() => {
    recordView()

    interval = setInterval(() => {
      sendProgressUpdate()
    }, 15_000)

    const handleScroll = () => {
      const progress = getReadingProgress()
      if (progress > maxProgress) {
        maxProgress = progress
      }
    }

    const handleBeforeUnload = () => {
      sentFinalUpdate = true
      const readTime = Math.round((Date.now() - startTime) / 1000)
      const progress = getReadingProgress()
      if (progress > maxProgress) maxProgress = progress

      navigator.sendBeacon(
        '/api/analytics/reading',
        JSON.stringify({ postId, progress: maxProgress, readTime })
      )
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      clearInterval(interval)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  })
</script>
