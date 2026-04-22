<script lang="ts">
  let { token }: { token?: string } = $props()
</script>

{#if token}
  <svelte:head>
    <script
      defer
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={JSON.stringify({ token })}
    ></script>
  </svelte:head>
{/if}
