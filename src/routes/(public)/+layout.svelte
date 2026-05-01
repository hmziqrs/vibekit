<script lang="ts">
  import CfBeacon from '$lib/components/cf-beacon.svelte'

  const { children } = $props()

  const cfToken = import.meta.env.PUBLIC_CF_WEB_ANALYTICS_TOKEN
</script>

<CfBeacon token={cfToken} />
{@render children()}
