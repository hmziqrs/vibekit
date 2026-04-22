<script lang="ts">
  import CfBeacon from '$lib/components/cf-beacon.svelte'

  let { children } = $props()

  const cfToken = import.meta.env.PUBLIC_CF_WEB_ANALYTICS_TOKEN as string | undefined
</script>

<CfBeacon token={cfToken} />
{@render children()}
