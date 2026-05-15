<script lang="ts">
  import Nav from '$lib/components/nav.svelte'
  import Footer from '$lib/components/footer.svelte'
  import SeoHead from '$lib/components/seo-head.svelte'
</script>

<SeoHead
  description="Vibekit terms of service — the rules governing your use of the platform."
  title="Terms of Service"
/>

<Nav />

<section class="px-6 py-24">
  <div class="mx-auto max-w-4xl">
    <h1 class="mb-4 text-[clamp(2rem,5vw,3rem)] font-semibold tracking-[-0.02em] text-text-primary">
      Terms of Service
    </h1>
    <p class="mb-12 text-[14px] text-text-muted">Version 2 &middot; Last updated: May 2026</p>

    <div class="prose prose-invert max-w-none">
      <h2 class="text-text-primary">Acceptance</h2>
      <p>
        By using Vibekit, you agree to these terms. If you do not agree, please do not use the
        service. These terms apply to the open-source template and any hosted instance of the
        application.
      </p>

      <h2 class="text-text-primary">Service Description</h2>
      <p>
        Vibekit is a SvelteKit SaaS boilerplate designed for Cloudflare Workers. It provides a
        starter foundation including authentication, database management, admin panel, and
        internationalization. The open-source template is provided as-is under the MIT license.
      </p>

      <h2 class="text-text-primary">User Responsibilities</h2>
      <p>
        You are responsible for securing your own application instance, managing user data in
        compliance with applicable laws, and maintaining backups. You must not use the service for
        any illegal purpose or distribute harmful content through applications built with this
        template.
      </p>

      <h2 class="text-text-primary">Limitation of Liability</h2>
      <p>
        The software is provided "as is" without warranty of any kind. The maintainers shall not be
        liable for any direct, indirect, incidental, or consequential damages arising from the use
        of this software. Use at your own risk.
      </p>

      <h2 class="text-text-primary">Contact</h2>
      <p>
        For questions about these terms, please open an issue on the project's GitHub repository or
        contact the maintainers directly.
      </p>
    </div>
  </div>
</section>

<Footer />
