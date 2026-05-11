<script lang="ts">
  import {
    getPasswordStrength,
    getPasswordStrengthBarColor,
    getPasswordStrengthColor,
  } from '$lib/password-strength'

  let { password = $bindable('') }: { password?: string } = $props()

  const result = $derived(getPasswordStrength(password ?? ''))
</script>

{#if password}
  <div class="mt-2 space-y-2">
    <div class="flex gap-1">
      {#each Array(5) as _, i}
        <div
          class="h-1.5 flex-1 rounded-full transition-all duration-200 {i <= result.score
            ? getPasswordStrengthBarColor(result.score)
            : 'bg-white/10'}"
        ></div>
      {/each}
    </div>

    {#if result.label}
      <p class="text-xs font-medium {getPasswordStrengthColor(result.score)}">
        {result.label}
      </p>
    {/if}

    {#if result.feedback.length > 0}
      <ul class="space-y-0.5">
        {#each result.feedback as tip}
          <li class="text-xs text-text-muted">{tip}</li>
        {/each}
      </ul>
    {/if}
  </div>
{/if}
