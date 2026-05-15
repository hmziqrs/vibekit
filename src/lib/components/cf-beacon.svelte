<script lang="ts">
  import { shouldTrack } from '$lib/consent.svelte'

  const { token, nonce }: { nonce?: string; token?: string } = $props()
  const allowed = $derived(shouldTrack())
</script>

<svelte:head>
  {#if token && allowed}
    <script
      defer
      nonce={nonce}
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={`{"token":"${token}"`}
    ></script>
  {/if}
</svelte:head>
