<script lang="ts">
  import Footer from '$lib/components/footer.svelte'
  import Nav from '$lib/components/nav.svelte'
  import SeoHead from '$lib/components/seo-head.svelte'
  import SmartLink from '$lib/components/smart-link.svelte'

  const platforms = ['zapier', 'n8n', 'make'] as const
  type Platform = (typeof platforms)[number]
  let activePlatform = $state<Platform>('zapier')
</script>

<SeoHead
  title="Automation — Vibekit"
  description="Connect Vibekit with Zapier, n8n, Make, and custom webhooks to automate your workflows."
/>

<Nav />

<div class="min-h-screen bg-surface-base">
  <!-- Hero -->
  <section class="border-b border-white/[0.06] pb-16 pt-24">
    <div class="mx-auto max-w-4xl px-6 text-center">
      <div
        class="mb-4 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-3 py-1 text-xs font-medium text-brand"
      >
        <span class="h-1.5 w-1.5 rounded-full bg-brand"></span>
        Automation
      </div>
      <h1
        class="bg-gradient-to-b from-text-primary to-text-secondary bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl"
      >
        No-Code Automation
      </h1>
      <p class="mx-auto mt-4 max-w-2xl text-lg text-text-muted">
        Connect Vibekit to thousands of apps via Zapier, n8n, or Make. Use triggers and actions to
        build powerful automations without code.
      </p>
      <div class="mt-8 flex items-center justify-center gap-3">
        <SmartLink
          href="/app/settings/api-keys"
          class="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground shadow-lg shadow-brand/20 hover:bg-brand-hover"
        >
          Get API Key
        </SmartLink>
        <SmartLink
          href="/app/settings/webhooks"
          class="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-text-primary hover:bg-surface-deep"
        >
          Manage Webhooks
        </SmartLink>
      </div>
    </div>
  </section>

  <!-- Platform Tabs -->
  <div class="border-b border-white/[0.06]">
    <div class="mx-auto max-w-4xl px-6">
      <nav class="flex gap-6">
        {#each platforms as p (p)}
          <button
            onclick={() => (activePlatform = p)}
            class="border-b-2 px-1 py-3 text-sm font-medium uppercase transition-colors {activePlatform
              === p
              ? 'border-brand text-brand'
              : 'border-transparent text-text-muted hover:text-text-primary'}"
          >
            {p === 'make' ? 'Make (Integromat)' : p}
          </button>
        {/each}
      </nav>
    </div>
  </div>

  <div class="mx-auto max-w-4xl px-6 py-12">
    <!-- Zapier -->
    {#if activePlatform === 'zapier'}
      <div class="space-y-8">
        <div>
          <h2 class="text-2xl font-bold text-text-primary">Zapier Setup</h2>
          <p class="mt-2 text-text-muted">
            Use Vibekit's webhook triggers and REST API actions with Zapier's Webhooks app.
          </p>
        </div>

        <div class="rounded-lg border border-white/[0.06] bg-surface p-6">
          <h3 class="font-semibold text-text-primary">Trigger: Catch Webhooks in Zapier</h3>
          <ol class="mt-3 space-y-3 text-sm text-text-muted">
            <li>
              <span class="font-medium text-text-primary">1.</span> In your Vibekit
              <SmartLink href="/app/settings/webhooks" class="text-brand hover:underline"
                >Webhook settings</SmartLink
              >, create a new endpoint with your Zapier webhook URL
            </li>
            <li>
              <span class="font-medium text-text-primary">2.</span> Select the events you want to
              trigger on (e.g., <code class="text-brand">blog.create</code>,
              <code class="text-brand">item.create</code>)
            </li>
            <li>
              <span class="font-medium text-text-primary">3.</span> In Zapier, use "Webhooks by
              Zapier" → "Catch Hook" as your trigger
            </li>
            <li>
              <span class="font-medium text-text-primary">4.</span> Zapier will receive JSON payloads
              with event data whenever matching events occur
            </li>
          </ol>
        </div>

        <div class="rounded-lg border border-white/[0.06] bg-surface p-6">
          <h3 class="font-semibold text-text-primary">Action: Call Vibekit API from Zapier</h3>
          <ol class="mt-3 space-y-3 text-sm text-text-muted">
            <li>
              <span class="font-medium text-text-primary">1.</span> Use "Webhooks by Zapier" →
              "Custom Request" as your action
            </li>
            <li>
              <span class="font-medium text-text-primary">2.</span> Set the method (GET, POST, PATCH,
              DELETE) and URL to the Vibekit API endpoint
            </li>
            <li>
              <span class="font-medium text-text-primary">3.</span> Add headers:
              <div class="mt-2 rounded-md bg-surface-deep p-3 font-mono text-xs text-text-secondary">
                <pre>{"Authorization: Bearer vk_your_api_key\nContent-Type: application/json"}</pre>
              </div>
            </li>
            <li>
              <span class="font-medium text-text-primary">4.</span> For POST/PATCH, add JSON body with
              the request fields
            </li>
          </ol>
        </div>

        <div class="rounded-lg border border-white/[0.06] bg-surface p-6">
          <h3 class="font-semibold text-text-primary">Example Payload</h3>
          <div class="mt-2 rounded-md bg-surface-deep p-4 font-mono text-xs text-text-secondary">
            <pre>{"{\n  \"eventType\": \"blog.create\",\n  \"webhookId\": \"019e1b69...\",\n  \"occurredAt\": 1715548800000,\n  \"data\": {\n    \"id\": \"post-uuid\",\n    \"title\": \"New Blog Post\",\n    \"slug\": \"new-blog-post\",\n    \"status\": \"published\"\n  }\n}"}</pre>
          </div>
        </div>
      </div>
    {/if}

    <!-- n8n -->
    {#if activePlatform === 'n8n'}
      <div class="space-y-8">
        <div>
          <h2 class="text-2xl font-bold text-text-primary">n8n Setup</h2>
          <p class="mt-2 text-text-muted">
            Connect Vibekit to n8n workflows using the Webhook and HTTP Request nodes.
          </p>
        </div>

        <div class="rounded-lg border border-white/[0.06] bg-surface p-6">
          <h3 class="font-semibold text-text-primary">Trigger: Webhook Node</h3>
          <ol class="mt-3 space-y-3 text-sm text-text-muted">
            <li>
              <span class="font-medium text-text-primary">1.</span> Add a "Webhook" node to your n8n
              workflow and set it to production URL
            </li>
            <li>
              <span class="font-medium text-text-primary">2.</span> Copy the webhook URL from n8n
            </li>
            <li>
              <span class="font-medium text-text-primary">3.</span> In Vibekit
              <SmartLink href="/app/settings/webhooks" class="text-brand hover:underline"
                >Webhook settings</SmartLink
              >, create a new endpoint pointing to the n8n URL
            </li>
            <li>
              <span class="font-medium text-text-primary">4.</span> Select events and save — n8n will
              receive events in real-time
            </li>
          </ol>
        </div>

        <div class="rounded-lg border border-white/[0.06] bg-surface p-6">
          <h3 class="font-semibold text-text-primary">Action: HTTP Request Node</h3>
          <ol class="mt-3 space-y-3 text-sm text-text-muted">
            <li>
              <span class="font-medium text-text-primary">1.</span> Add an "HTTP Request" node to
              your workflow
            </li>
            <li>
              <span class="font-medium text-text-primary">2.</span> Set URL to the Vibekit API
              endpoint (e.g., <code class="text-brand">https://vibekit.dev/api/items</code>)
            </li>
            <li>
              <span class="font-medium text-text-primary">3.</span> Set Authentication to "Header
              Auth" with name
              <code class="text-brand">Authorization</code> and value
              <code class="text-brand">Bearer vk_your_api_key</code>
            </li>
            <li>
              <span class="font-medium text-text-primary">4.</span> Configure method, headers, and
              body as needed
            </li>
          </ol>
        </div>

        <div class="rounded-lg border border-white/[0.06] bg-surface p-6">
          <h3 class="font-semibold text-text-primary">Auto-Discovery</h3>
          <p class="mt-2 text-sm text-text-muted">
            n8n can use our automation manifest to discover available triggers and actions:
          </p>
          <div class="mt-2 rounded-md bg-surface-deep p-3 font-mono text-xs text-text-secondary">
            <pre>GET https://vibekit.dev/api/automation/manifest</pre>
          </div>
        </div>
      </div>
    {/if}

    <!-- Make -->
    {#if activePlatform === 'make'}
      <div class="space-y-8">
        <div>
          <h2 class="text-2xl font-bold text-text-primary">Make (Integromat) Setup</h2>
          <p class="mt-2 text-text-muted">
            Connect Vibekit to Make scenarios using the Webhook and HTTP modules.
          </p>
        </div>

        <div class="rounded-lg border border-white/[0.06] bg-surface p-6">
          <h3 class="font-semibold text-text-primary">Trigger: Custom Webhook</h3>
          <ol class="mt-3 space-y-3 text-sm text-text-muted">
            <li>
              <span class="font-medium text-text-primary">1.</span> In Make, add a "Webhooks" →
              "Custom webhook" module
            </li>
            <li>
              <span class="font-medium text-text-primary">2.</span> Copy the webhook URL
            </li>
            <li>
              <span class="font-medium text-text-primary">3.</span> In Vibekit, create a webhook
              endpoint pointing to the Make URL
            </li>
            <li>
              <span class="font-medium text-text-primary">4.</span> Run the Make scenario once to
              register the data structure, then it will process events automatically
            </li>
          </ol>
        </div>

        <div class="rounded-lg border border-white/[0.06] bg-surface p-6">
          <h3 class="font-semibold text-text-primary">Action: HTTP Module</h3>
          <ol class="mt-3 space-y-3 text-sm text-text-muted">
            <li>
              <span class="font-medium text-text-primary">1.</span> Add an "HTTP" → "Make a request"
              module
            </li>
            <li>
              <span class="font-medium text-text-primary">2.</span> Set URL to the Vibekit API
              endpoint
            </li>
            <li>
              <span class="font-medium text-text-primary">3.</span> Add header:
              <code class="text-brand">Authorization</code> =
              <code class="text-brand">Bearer vk_your_api_key</code>
            </li>
            <li>
              <span class="font-medium text-text-primary">4.</span> Set body type to JSON and
              configure the request payload
            </li>
          </ol>
        </div>
      </div>
    {/if}

    <!-- Available Triggers -->
    <div class="mt-12">
      <h2 class="mb-4 text-xl font-bold text-text-primary">Available Triggers</h2>
      <p class="text-text-muted">
        All webhook event types can be used as triggers. View the full list in
        <SmartLink href="/app/settings/webhooks" class="text-brand hover:underline"
          >Webhook Settings</SmartLink
        >
        or the
        <SmartLink href="/openapi.yaml" class="text-brand hover:underline">OpenAPI Spec</SmartLink>.
      </p>

      <div class="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {#each [
          'blog.create',
          'blog.publish',
          'item.create',
          'item.update',
          'comment.create',
          'organization.create',
          'team.create',
          'user.update',
          'webhook.test',
        ] as event (event)}
          <div class="rounded-md border border-white/[0.06] bg-surface px-3 py-2 font-mono text-xs text-brand">
            {event}
          </div>
        {/each}
      </div>
    </div>

    <!-- Manifest -->
    <div class="mt-12">
      <h2 class="mb-4 text-xl font-bold text-text-primary">Automation Manifest</h2>
      <p class="text-text-muted">
        A machine-readable manifest of all triggers and actions is available at:
      </p>
      <div class="mt-2 rounded-md bg-surface-deep p-3 font-mono text-sm text-text-secondary">
        <pre>GET https://vibekit.dev/api/automation/manifest</pre>
      </div>
      <p class="mt-2 text-xs text-text-subtle">
        Returns JSON with all available triggers, actions, authentication details, and webhook setup
        instructions.
      </p>
    </div>
  </div>
</div>

<Footer />
