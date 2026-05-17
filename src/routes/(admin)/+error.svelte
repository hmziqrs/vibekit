<script lang="ts">
  import FileX from '@lucide/svelte/icons/file-x'
  import Server from '@lucide/svelte/icons/server'
  import ShieldAlert from '@lucide/svelte/icons/shield-alert'

  import ErrorPageLayout from '$lib/components/error-page-layout.svelte'

  const statuses = {
    403: { description: "You don't have permission to access this resource.", icon: ShieldAlert, title: 'Forbidden' },
    404: { description: "The page you're looking for doesn't exist.", icon: FileX, title: 'Not Found' },
    500: { description: 'Something went wrong. Please try again later.', icon: Server, title: 'Server Error' },
  }
</script>

<ErrorPageLayout
  homeHref="/admin/dashboard"
  homeLabel="Back to Dashboard"
  {statuses}
  fallbackIcon={Server}
/>
