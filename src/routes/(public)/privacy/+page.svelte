<script lang="ts">
  import Nav from '$lib/components/nav.svelte'
  import Footer from '$lib/components/footer.svelte'
  import { seo } from '$lib/seo'

  const meta = seo({
    description: 'Vibekit privacy policy — how we collect, use, and protect your data.',
    title: 'Privacy Policy',
  })
</script>

<svelte:head>
  <title>{meta.title}</title>
  <meta name="description" content={meta.description} />
</svelte:head>

<Nav />

<section class="px-6 py-24">
  <div class="mx-auto max-w-4xl">
    <h1 class="mb-4 text-[clamp(2rem,5vw,3rem)] font-semibold tracking-[-0.02em] text-text-primary">
      Privacy Policy
    </h1>
    <p class="mb-12 text-[14px] text-text-muted">Last updated: April 2026</p>

    <div class="prose prose-invert max-w-none">
      <h2 class="text-text-primary">Information Collection</h2>
      <p>
        We collect only the information you voluntarily provide when creating an account — your email
        address and password. We do not use tracking cookies, analytics pixels, or third-party
        advertising networks. Your data stays in your own Cloudflare D1 database.
      </p>

      <h2 class="text-text-primary">Use of Information</h2>
      <p>
        Your information is used solely to operate and improve the service. We use your email to
        send account-related notifications such as password reset emails. We will never sell, rent,
        or share your personal data with third parties for marketing purposes.
      </p>

      <h2 class="text-text-primary">Data Protection</h2>
      <p>
        Passwords are hashed using industry-standard algorithms before storage. All data is
        encrypted in transit via TLS. Your Cloudflare D1 database is isolated and accessible only
        by your own Workers. We recommend enabling additional Cloudflare security features for
        production deployments.
      </p>

      <h2 class="text-text-primary">Contact</h2>
      <p>
        If you have questions about this privacy policy or how your data is handled, please reach
        out via the project's GitHub repository or contact the maintainers directly.
      </p>
    </div>
  </div>
</section>

<Footer />
