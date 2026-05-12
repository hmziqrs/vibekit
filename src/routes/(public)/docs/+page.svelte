<script lang="ts">
  import { onMount } from 'svelte'
  import Footer from '$lib/components/footer.svelte'
  import Nav from '$lib/components/nav.svelte'
  import SeoHead from '$lib/components/seo-head.svelte'
  import SmartLink from '$lib/components/smart-link.svelte'

  const tabs = ['overview', 'authentication', 'reference'] as const
  type Tab = (typeof tabs)[number]
  let activeTab: Tab = $state('overview')

  function setTab(tab: Tab) {
    activeTab = tab
  }

  const codeExamples = {
    curl: `curl -X GET https://vibekit.dev/api/items \\
  -H "Authorization: Bearer vk_your_api_key_here" \\
  -H "Content-Type: application/json"`,
    go: `req, _ := http.NewRequest("GET",
    "https://vibekit.dev/api/items", nil)
req.Header.Set("Authorization",
    "Bearer vk_your_api_key_here")
req.Header.Set("Content-Type", "application/json")

client := &http.Client{}
resp, _ := client.Do(req)`,
    javascript: `const response = await fetch('https://vibekit.dev/api/items', {
  headers: {
    'Authorization': 'Bearer vk_your_api_key_here',
    'Content-Type': 'application/json',
  },
})

const items = await response.json()`,
    python: `import requests

response = requests.get(
    'https://vibekit.dev/api/items',
    headers={
        'Authorization': 'Bearer vk_your_api_key_here',
        'Content-Type': 'application/json',
    },
)

items = response.json()`,
  }

  let selectedLang = $state<keyof typeof codeExamples>('curl')
  let scalarLoaded = $state(false)

  onMount(() => {
    // Load Scalar script
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/@scalar/api-reference@latest/dist/browser/standalone.min.js'
    script.async = true
    script.onload = () => {
      scalarLoaded = true
    }
    document.head.appendChild(script)
  })

  $effect(() => {
    if (activeTab === 'reference' && scalarLoaded) {
      const tryInit = () => {
        const container = document.getElementById('scalar-container')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const {Scalar} = (window as any)
        if (container && Scalar) {
          // Clear any existing content
          container.innerHTML = ''
          Scalar.createApiReference(container, {
            hideDownloadButton: false,
            hideModels: false,
            layout: 'modern',
            searchHotKey: 'k',
            spec: { url: '/openapi.yaml' },
            theme: 'dark',
          })
        } else {
          setTimeout(tryInit, 200)
        }
      }
      setTimeout(tryInit, 100)
    }
  })
</script>

<SeoHead
  title="API Documentation — Vibekit"
  description="Complete API reference for Vibekit. Learn how to authenticate, manage resources, and integrate with the Vibekit API."
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
        Public API v1.0
      </div>
      <h1
        class="bg-gradient-to-b from-text-primary to-text-secondary bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl"
      >
        API Documentation
      </h1>
      <p class="mx-auto mt-4 max-w-2xl text-lg text-text-muted">
        Everything you need to integrate with Vibekit. Authenticate with API keys, manage resources,
        and build powerful automations.
      </p>
      <div class="mt-8 flex items-center justify-center gap-3">
        <SmartLink
          href="/app/settings/api-keys"
          class="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground shadow-lg shadow-brand/20 hover:bg-brand-hover"
        >
          Get API Key
        </SmartLink>
        <button
          onclick={() => setTab('reference')}
          class="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-text-primary hover:bg-surface-deep"
        >
          API Reference
        </button>
      </div>
    </div>
  </section>

  <!-- Tab Navigation -->
  <div class="border-b border-white/[0.06]">
    <div class="mx-auto max-w-6xl px-6">
      <nav class="flex gap-6" aria-label="Documentation sections">
        {#each tabs as tab (tab)}
          <button
            onclick={() => setTab(tab)}
            class="border-b-2 px-1 py-3 text-sm font-medium capitalize transition-colors {activeTab
              === tab
              ? 'border-brand text-brand'
              : 'border-transparent text-text-muted hover:text-text-primary'}"
          >
            {tab}
          </button>
        {/each}
      </nav>
    </div>
  </div>

  <!-- Content -->
  <div class="mx-auto max-w-6xl px-6 py-12">
    <!-- Overview Tab -->
    {#if activeTab === 'overview'}
      <div class="grid gap-12 lg:grid-cols-3">
        <!-- Quick Start -->
        <div class="lg:col-span-2">
          <h2 class="text-2xl font-bold text-text-primary">Quick Start</h2>
          <p class="mt-2 text-text-muted">Get up and running with the Vibekit API in minutes.</p>

          <div class="mt-8 space-y-6">
            <!-- Step 1 -->
            <div class="flex gap-4">
              <div
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-brand-foreground"
              >
                1
              </div>
              <div>
                <h3 class="font-semibold text-text-primary">Create an API Key</h3>
                <p class="mt-1 text-sm text-text-muted">
                  Go to
                  <SmartLink href="/app/settings/api-keys" class="text-brand hover:underline"
                    >Settings &rarr; API Keys</SmartLink
                  >
                  and create a new key with the scopes you need.
                </p>
                <div
                  class="mt-3 rounded-lg border border-white/[0.06] bg-surface-deep p-4 font-mono text-sm text-text-secondary"
                >
                  Key prefix: <span class="text-brand">vk_</span>••••••••
                </div>
              </div>
            </div>

            <!-- Step 2 -->
            <div class="flex gap-4">
              <div
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-brand-foreground"
              >
                2
              </div>
              <div>
                <h3 class="font-semibold text-text-primary">Make Your First Request</h3>
                <p class="mt-1 text-sm text-text-muted">
                  Use your API key in the Authorization header:
                </p>

                <!-- Language selector -->
                <div class="mt-3 flex gap-1 rounded-lg border border-white/[0.06] bg-surface-deep">
                  {#each Object.keys(codeExamples) as lang (lang)}
                    <button
                      onclick={() => (selectedLang = lang as keyof typeof codeExamples)}
                      class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors {selectedLang ===
                      lang
                        ? 'bg-brand/20 text-brand'
                        : 'text-text-muted hover:text-text-primary'}"
                    >
                      {lang}
                    </button>
                  {/each}
                </div>
                <div
                  class="mt-2 overflow-x-auto rounded-lg border border-white/[0.06] bg-surface-deep p-4"
                >
                  <pre
                    class="whitespace-pre font-mono text-sm leading-relaxed text-text-secondary"
                  ><code>{codeExamples[selectedLang]}</code></pre>
                </div>
              </div>
            </div>

            <!-- Step 3 -->
            <div class="flex gap-4">
              <div
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-brand-foreground"
              >
                3
              </div>
              <div>
                <h3 class="font-semibold text-text-primary">Explore the API</h3>
                <p class="mt-1 text-sm text-text-muted">
                  Browse the full API reference with the interactive explorer. Try endpoints directly
                  from the browser.
                </p>
                <button
                  onclick={() => setTab('reference')}
                  class="mt-2 text-sm font-medium text-brand hover:underline"
                >
                  Open API Reference &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="space-y-6">
          <div class="rounded-lg border border-white/[0.06] bg-surface p-5">
            <h3 class="font-semibold text-text-primary">Base URL</h3>
            <code
              class="mt-2 block rounded-md bg-surface-deep px-3 py-2 font-mono text-sm text-brand"
            >
              https://vibekit.dev/api
            </code>
          </div>

          <div class="rounded-lg border border-white/[0.06] bg-surface p-5">
            <h3 class="font-semibold text-text-primary">Response Format</h3>
            <p class="mt-2 text-sm text-text-muted">All responses are JSON:</p>
            <div class="mt-2 rounded-md bg-surface-deep p-3 font-mono text-xs text-text-secondary">
              <pre>{"{\n  \"Content-Type\": \"application/json\"\n}"}</pre>
            </div>
          </div>

          <div class="rounded-lg border border-white/[0.06] bg-surface p-5">
            <h3 class="font-semibold text-text-primary">Rate Limits</h3>
            <dl class="mt-3 space-y-2 text-sm">
              <div class="flex justify-between">
                <dt class="text-text-muted">Standard</dt>
                <dd class="text-text-secondary">60 req/min</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-text-muted">API Key create</dt>
                <dd class="text-text-secondary">10 req/min</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-text-muted">Webhook create</dt>
                <dd class="text-text-secondary">10 req/min</dd>
              </div>
            </dl>
          </div>

          <div class="rounded-lg border border-white/[0.06] bg-surface p-5">
            <h3 class="font-semibold text-text-primary">Error Format</h3>
            <div class="mt-2 rounded-md bg-surface-deep p-3 font-mono text-xs text-text-secondary">
              <pre>{"{\n  \"error\": \"Not found\",\n  \"status\": 404\n}"}</pre>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <!-- Authentication Tab -->
    {#if activeTab === 'authentication'}
      <div class="mx-auto max-w-3xl">
        <h2 class="text-2xl font-bold text-text-primary">Authentication</h2>
        <p class="mt-2 text-text-muted">
          The Vibekit API supports two authentication methods.
        </p>

        <!-- Method 1: Session -->
        <div class="mt-8 rounded-lg border border-white/[0.06] bg-surface p-6">
          <div class="flex items-center gap-3">
            <div
              class="flex h-8 w-8 items-center justify-center rounded-full bg-brand/20 text-brand"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                ><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path
                  d="M7 11V7a5 5 0 0 1 10 0v4"
                /></svg
              >
            </div>
            <h3 class="text-lg font-semibold text-text-primary">Session Cookies</h3>
          </div>
          <p class="mt-3 text-sm text-text-muted">
            When users log in through the web UI, a session cookie is automatically set. This method
            is used by the dashboard and is suitable for same-origin requests from the browser.
          </p>
          <div class="mt-4 rounded-md bg-surface-deep p-4 font-mono text-sm text-text-secondary">
            <pre>{"Cookie: better-auth.session_token=..."}</pre>
          </div>
          <p class="mt-3 text-xs text-text-subtle">
            Sessions expire after 7 days of inactivity. Use API keys for programmatic access.
          </p>
        </div>

        <!-- Method 2: API Keys -->
        <div class="mt-6 rounded-lg border border-white/[0.06] bg-surface p-6">
          <div class="flex items-center gap-3">
            <div
              class="flex h-8 w-8 items-center justify-center rounded-full bg-brand/20 text-brand"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                ><path
                  d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"
                /></svg
            ></div>
            <h3 class="text-lg font-semibold text-text-primary">API Keys</h3>
          </div>
          <p class="mt-3 text-sm text-text-muted">
            API keys are the recommended method for programmatic access. Each key has scoped
            permissions and can be rotated or revoked independently.
          </p>

          <h4 class="mt-4 text-sm font-semibold text-text-primary">Creating an API Key</h4>
          <div class="mt-2 rounded-md bg-surface-deep p-4 font-mono text-sm text-text-secondary">
            <pre>{"curl -X POST https://vibekit.dev/api/api-keys \\\n  -H 'Content-Type: application/json' \\\n  -H 'Cookie: better-auth.session_token=...' \\\n  -d '{\n    \"name\": \"My Integration\",\n    \"scopes\": [\"items.read\", \"items.write\"]\n  }'"}</pre>
          </div>

          <h4 class="mt-4 text-sm font-semibold text-text-primary">Using an API Key</h4>
          <p class="mt-1 text-sm text-text-muted">
            Include the key in the <code class="text-brand">Authorization</code> header:
          </p>
          <div class="mt-2 rounded-md bg-surface-deep p-4 font-mono text-sm text-text-secondary">
            <pre>{"Authorization: Bearer vk_abc123..."}</pre>
          </div>

          <h4 class="mt-4 text-sm font-semibold text-text-primary">Available Scopes</h4>
          <div class="mt-2 grid grid-cols-2 gap-2 text-sm">
            {#each [
              { desc: 'Read items', scope: 'items.read' },
              { desc: 'Create/update items', scope: 'items.write' },
              { desc: 'Read blog posts', scope: 'blog.read' },
              { desc: 'Create/update posts', scope: 'blog.write' },
              { desc: 'Read user profiles', scope: 'users.read' },
              { desc: 'Read organizations', scope: 'orgs.read' },
              { desc: 'Manage organizations', scope: 'orgs.write' },
              { desc: 'Read teams', scope: 'teams.read' },
              { desc: 'Manage teams', scope: 'teams.write' },
              { desc: 'Read webhooks', scope: 'webhooks.read' },
              { desc: 'Manage webhooks', scope: 'webhooks.write' },
              { desc: 'Read billing info', scope: 'billing.read' },
            ] as s (s.scope)}
              <div class="flex items-center gap-2">
                <code class="text-xs text-brand">{s.scope}</code>
                <span class="text-xs text-text-subtle">{s.desc}</span>
              </div>
            {/each}
          </div>

          <h4 class="mt-4 text-sm font-semibold text-text-primary">Key Management</h4>
          <ul class="mt-2 space-y-1 text-sm text-text-muted">
            <li>&bull; Keys start with <code class="text-brand">vk_</code></li>
            <li>&bull; Rotate keys without changing the ID</li>
            <li>&bull; Set optional expiration dates</li>
            <li>&bull; Revoke keys instantly</li>
            <li>&bull; Track usage per key</li>
          </ul>
        </div>

        <!-- Webhook Signature Verification -->
        <div class="mt-6 rounded-lg border border-white/[0.06] bg-surface p-6">
          <div class="flex items-center gap-3">
            <div
              class="flex h-8 w-8 items-center justify-center rounded-full bg-brand/20 text-brand"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                ><path
                  d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.42.57-2"
                /><path d="M6 17H2v4" /></svg
            ></div>
            <h3 class="text-lg font-semibold text-text-primary">Webhook Signature Verification</h3>
          </div>
          <p class="mt-3 text-sm text-text-muted">
            Webhook deliveries are signed using HMAC-SHA256. Verify the signature to ensure
            authenticity:
          </p>
          <div class="mt-3 space-y-2 text-sm">
            <p class="text-text-secondary">
              <strong class="text-text-primary">Headers:</strong>
            </p>
            <div class="rounded-md bg-surface-deep p-3 font-mono text-xs text-text-secondary">
              <pre
                >{"X-Webhook-Signature: sha256=<hex>\nX-Webhook-Timestamp: <unix_timestamp>\nX-Webhook-ID: <delivery_id>"}</pre
              >
            </div>
            <p class="mt-2 text-text-secondary">
              <strong class="text-text-primary">Verification:</strong>
            </p>
            <p class="text-text-muted">
              Compute <code class="text-brand"
                >HMAC-SHA256(secret, timestamp + "." + body)</code
              >
              and compare with the signature header. The secret is prefixed with
              <code class="text-brand">whsec_</code> — strip the prefix before using it as the HMAC
              key.
            </p>
          </div>
        </div>
      </div>
    {/if}

    <!-- API Reference Tab -->
    {#if activeTab === 'reference'}
      <div>
        <div class="mb-6 flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-bold text-text-primary">API Reference</h2>
            <p class="mt-1 text-text-muted">
              Interactive API explorer powered by Scalar. Browse all endpoints and try them directly.
            </p>
          </div>
          <a
            href="/openapi.yaml"
            target="_blank"
            class="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-deep"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              ><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline
                points="7 10 12 15 17 10"
              /><line x1="12" y1="15" x2="12" y2="3" /></svg
            >
            OpenAPI Spec
          </a>
        </div>

        <!-- Scalar API Reference Container -->
        <div id="scalar-container"></div>

        <noscript>
          <div class="rounded-lg border border-white/[0.06] bg-surface p-6">
            <p class="text-text-muted">
              JavaScript is required for the interactive API explorer. Download the
              <a href="/openapi.yaml" class="text-brand hover:underline">OpenAPI spec</a>
              to use with your preferred API client.
            </p>
          </div>
        </noscript>
      </div>
    {/if}
  </div>
</div>

<Footer />
