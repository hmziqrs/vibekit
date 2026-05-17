<script lang="ts">
  import CircleAlert from '@lucide/svelte/icons/circle-alert'
  import Server from '@lucide/svelte/icons/server'

  import ErrorPageLayout from '$lib/components/error-page-layout.svelte'

  const statuses = {
    400: {
      description: 'The request was invalid. Please check your input and try again.',
      icon: Server,
      title: 'Bad Request',
    },
    429: {
      description: "You've made too many attempts. Please wait a moment and try again.",
      icon: CircleAlert,
      title: 'Too Many Requests',
    },
    500: { description: 'Something went wrong. Please try again later.', icon: Server, title: 'Server Error' },
  }
</script>

<ErrorPageLayout
  homeHref="/login"
  homeLabel="Back to Login"
  {statuses}
  fallbackIcon={Server}
/>
