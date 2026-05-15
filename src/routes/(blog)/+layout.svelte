<script lang="ts">
  import CfBeacon from '$lib/components/cf-beacon.svelte'

  const { children, data } = $props()
</script>

<svelte:head>
  <link rel="alternate" type="application/rss+xml" title="Vibekit Blog" href="/blog/feed.xml" />
</svelte:head>

<CfBeacon nonce={data.nonce} token={data.cfToken} />
{@render children()}
