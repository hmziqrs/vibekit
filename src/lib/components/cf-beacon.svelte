<script lang="ts">
  const { token, nonce }: { nonce?: string; token?: string } = $props()
</script>

<svelte:head>
  {#if token}
    <script
      defer
      nonce={nonce}
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={`{"token":"${token}"`}
    ></script>
  {/if}
</svelte:head>
