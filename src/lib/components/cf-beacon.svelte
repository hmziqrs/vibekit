<script lang="ts">
  let { token }: { token?: string } = $props()
</script>

{#if token}
  {@html `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${token}"}'></script>`}
{/if}
