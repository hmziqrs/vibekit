<script lang='ts'>
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<h1>Login</h1>
<form method="post" action="?/signInEmail" use:enhance>
	<label>
		Email
		<input type="email" name="email" class="mt-1 px-3 py-2 bg-background border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring" />
	</label>
	<label>
		Password
		<input type="password" name="password" class="mt-1 px-3 py-2 bg-background border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring" />
	</label>
	<label>
		Name (for registration)
		<input name="name" class="mt-1 px-3 py-2 bg-background border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring" />
	</label>
	<button class="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition">Login</button>
	<button formaction="?/signUpEmail" class="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition">Register</button>
</form>
<p class="text-destructive">{form?.message ?? ''}</p>
