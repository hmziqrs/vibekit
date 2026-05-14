<script lang="ts">
  import { getContext } from 'svelte'
  import type { AuthContext } from '$lib/auth.svelte'
  import { goto } from '$app/navigation'

  const auth = getContext<AuthContext>('auth')

  const TOTAL_STEPS = 4
  let currentStep = $state(0)
  let saving = $state(false)
  let error = $state('')
  let displayName = $state(auth.user?.displayName ?? '')
  let bio = $state(auth.user?.bio ?? '')
  let timezone = $state(auth.user?.timezone ?? '')

  const timezones = Intl.supportedValuesOf('timeZone')
  let tzSearch = $state('')

  const filteredTimezones = $derived(
    tzSearch
      ? timezones.filter((tz) => tz.toLowerCase().includes(tzSearch.toLowerCase()))
      : timezones
  )

  const progress = $derived(((currentStep + 1) / TOTAL_STEPS) * 100)

  const stepTitles = ['Welcome', 'Profile', 'Timezone', 'All Set']

  async function saveStep(step: number) {
    const res = await fetch('/api/user/onboarding', {
      body: JSON.stringify({ step }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
    if (!res.ok) throw new Error('Failed to save progress')
  }

  async function completeOnboarding() {
    saving = true
    error = ''
    try {
      const res = await fetch('/api/user/onboarding', {
        body: JSON.stringify({ completed: true }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to complete onboarding')
      await goto('/app/dashboard?onboarded=true')
    } catch {
      error = 'Something went wrong. Please try again.'
    } finally {
      saving = false
    }
  }

  async function skipOnboarding() {
    saving = true
    error = ''
    try {
      const res = await fetch('/api/user/onboarding', {
        body: JSON.stringify({ completed: true }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to skip onboarding')
      await goto('/app/dashboard')
    } catch {
      error = 'Something went wrong. Please try again.'
    } finally {
      saving = false
    }
  }

  async function saveProfileAndNext() {
    saving = true
    error = ''
    try {
      const res = await fetch('/api/auth/update-user', {
        body: JSON.stringify({ bio: bio || null, displayName: displayName || null }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to save profile')
      await saveStep(1)
      currentStep = 2
    } catch {
      error = 'Failed to save profile. Please try again.'
    } finally {
      saving = false
    }
  }

  async function saveTimezoneAndNext() {
    saving = true
    error = ''
    try {
      const res = await fetch('/api/auth/update-user', {
        body: JSON.stringify({ timezone: timezone || null }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to save timezone')
      await saveStep(2)
      currentStep = 3
    } catch {
      error = 'Failed to save timezone. Please try again.'
    } finally {
      saving = false
    }
  }
</script>

<div class="flex min-h-[80vh] items-center justify-center">
  <div class="w-full max-w-lg">
    <!-- Progress -->
    <div class="mb-8">
      <div class="flex items-center justify-between text-[12px] text-text-subtle">
        <span>Step {currentStep + 1} of {TOTAL_STEPS}</span>
        <button
          onclick={skipOnboarding}
          disabled={saving}
          class="text-text-muted transition-colors hover:text-text-primary disabled:opacity-50"
        >
          Skip for now
        </button>
      </div>
      <div class="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          class="h-full rounded-full bg-brand transition-all duration-300"
          style="width: {progress}%"
        ></div>
      </div>
      <p class="mt-3 text-[15px] font-medium text-text-primary">{stepTitles[currentStep]}</p>
    </div>

    <!-- Error -->
    {#if error}
      <p class="mb-4 rounded-lg bg-destructive/10 px-4 py-2 text-[13px] text-destructive">
        {error}
      </p>
    {/if}

    <!-- Step 0: Welcome -->
    {#if currentStep === 0}
      <div class="rounded-xl border border-white/[0.06] bg-surface p-8">
        <div class="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="text-brand"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <h1 class="text-xl font-semibold text-text-primary">
          Welcome to Vibekit{auth.user?.name ? `, ${auth.user.name}` : ''}!
        </h1>
        <p class="mt-2 text-[14px] leading-relaxed text-text-muted">
          Let's set up your account in just a few steps. This will only take a minute and helps us
          personalize your experience.
        </p>
        <button
          onclick={async () => {
            saving = true
            try {
              await saveStep(0)
              currentStep = 1
            } catch {
              error = 'Something went wrong.'
            } finally {
              saving = false
            }
          }}
          disabled={saving}
          class="mt-6 w-full rounded-lg bg-brand px-4 py-2.5 text-[14px] font-medium text-brand-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
        >
          Get Started
        </button>
      </div>
    {/if}

    <!-- Step 1: Profile -->
    {#if currentStep === 1}
      <div class="rounded-xl border border-white/[0.06] bg-surface p-8">
        <p class="mb-6 text-[14px] text-text-muted">
          Tell us a bit about yourself. You can always change this later.
        </p>

        <div class="space-y-4">
          <div>
            <label for="displayName" class="mb-1.5 block text-[13px] font-medium text-text-secondary"
              >Display Name</label
            >
            <input
              id="displayName"
              type="text"
              bind:value={displayName}
              placeholder="How should we display your name?"
              maxlength="100"
              class="w-full rounded-lg border border-white/[0.06] bg-surface-deep px-3 py-2 text-[14px] text-text-primary placeholder:text-text-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label for="bio" class="mb-1.5 block text-[13px] font-medium text-text-secondary"
              >Bio</label
            >
            <textarea
              id="bio"
              bind:value={bio}
              placeholder="A short bio about yourself..."
              rows="3"
              maxlength="500"
              class="w-full resize-none rounded-lg border border-white/[0.06] bg-surface-deep px-3 py-2 text-[14px] text-text-primary placeholder:text-text-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            ></textarea>
            <p class="mt-1 text-[11px] text-text-subtle">{bio.length}/500</p>
          </div>
        </div>

        <div class="mt-6 flex gap-3">
          <button
            onclick={() => (currentStep = 0)}
            class="rounded-lg border border-white/[0.06] px-4 py-2 text-[13px] font-medium text-text-muted transition-colors hover:bg-white/[0.04]"
          >
            Back
          </button>
          <button
            onclick={saveProfileAndNext}
            disabled={saving}
            class="flex-1 rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-brand-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Continue'}
          </button>
        </div>
      </div>
    {/if}

    <!-- Step 2: Timezone -->
    {#if currentStep === 2}
      <div class="rounded-xl border border-white/[0.06] bg-surface p-8">
        <p class="mb-6 text-[14px] text-text-muted">
          Select your timezone so we can show dates and times correctly.
        </p>

        <div>
          <input
            type="text"
            bind:value={tzSearch}
            placeholder="Search timezones..."
            class="mb-3 w-full rounded-lg border border-white/[0.06] bg-surface-deep px-3 py-2 text-[14px] text-text-primary placeholder:text-text-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <select
            aria-label="Select timezone"
            bind:value={timezone}
            size="6"
            class="w-full rounded-lg border border-white/[0.06] bg-surface-deep px-3 py-2 text-[14px] text-text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="">Not set</option>
            {#each filteredTimezones.slice(0, 50) as tz (tz)}
              <option value={tz}>{tz}</option>
            {/each}
          </select>
        </div>

        <div class="mt-6 flex gap-3">
          <button
            onclick={() => (currentStep = 1)}
            class="rounded-lg border border-white/[0.06] px-4 py-2 text-[13px] font-medium text-text-muted transition-colors hover:bg-white/[0.04]"
          >
            Back
          </button>
          <button
            onclick={saveTimezoneAndNext}
            disabled={saving}
            class="flex-1 rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-brand-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Continue'}
          </button>
        </div>
      </div>
    {/if}

    <!-- Step 3: Done -->
    {#if currentStep === 3}
      <div class="rounded-xl border border-white/[0.06] bg-surface p-8 text-center">
        <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="text-success"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-text-primary">You're all set!</h2>
        <p class="mt-2 text-[14px] text-text-muted">
          Your account is ready. Here's what you can do next:
        </p>
        <ul class="mt-4 space-y-2 text-left text-[13px] text-text-secondary">
          <li class="flex items-center gap-2">
            <span class="text-brand">→</span> Create and manage items from the dashboard
          </li>
          <li class="flex items-center gap-2">
            <span class="text-brand">→</span> Edit your profile anytime from Settings
          </li>
          <li class="flex items-center gap-2">
            <span class="text-brand">→</span> Enable two-factor authentication for extra security
          </li>
        </ul>
        <button
          onclick={completeOnboarding}
          disabled={saving}
          class="mt-6 w-full rounded-lg bg-brand px-4 py-2.5 text-[14px] font-medium text-brand-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
        >
          Go to Dashboard
        </button>
      </div>
    {/if}
  </div>
</div>
