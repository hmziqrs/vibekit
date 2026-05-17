<script lang="ts">
  import FileX from '@lucide/svelte/icons/file-x'
  import Server from '@lucide/svelte/icons/server'

  import ErrorPageLayout from '$lib/components/error-page-layout.svelte'

  const statuses = {
    404: { description: "The page you're looking for doesn't exist.", icon: FileX, title: 'Not Found' },
    500: { description: 'Something went wrong. Please try again later.', icon: Server, title: 'Server Error' },
    503: {
      description: 'The service is temporarily unavailable. Please try again in a moment.',
      icon: Server,
      title: 'Maintenance Mode',
    },
  }
</script>

<ErrorPageLayout
  homeHref="/app/dashboard"
  homeLabel="Back to Dashboard"
  {statuses}
  fallbackIcon={Server}
/>
