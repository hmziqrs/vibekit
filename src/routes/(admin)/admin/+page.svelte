<script lang="ts">
	import { goto } from '$app/navigation'

	$effect(() => {
		goto('/admin/dashboard', { replaceState: true })
	})
</script>
