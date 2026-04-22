<script lang="ts">
  import CfBeacon from '$lib/components/cf-beacon.svelte'

  let { children, data } = $props()
</script>

<CfBeacon token={data.cfToken} />
{@render children()}
