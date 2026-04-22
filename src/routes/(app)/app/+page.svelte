<script lang="ts">
	import { goto } from '$app/navigation'

	$effect(() => {
		goto('/app/dashboard', { replaceState: true })
	})
</script>
