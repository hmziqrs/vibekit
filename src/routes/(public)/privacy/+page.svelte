<script lang="ts">
  import Nav from '$lib/components/nav.svelte'
  import Footer from '$lib/components/footer.svelte'
  import SeoHead from '$lib/components/seo-head.svelte'
</script>

<SeoHead
  description="Vibekit privacy policy — how we collect, use, and protect your data."
  title="Privacy Policy"
/>

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

      <h2 class="text-text-primary">Data Portability</h2>
      <p>
        You have the right to download a copy of all personal data we hold about you. This includes
        your profile information, connected accounts, session history, items, and activity logs.
        You can export your data at any time from
        <a href="/app/settings" class="text-brand hover:underline">Account Settings</a>.
        The export is provided as a JSON file and is rate-limited to one download per hour.
      </p>

      <h2 class="text-text-primary">Data Retention</h2>
      <p>
        When you delete your account, your data is soft-deleted and retained for a 30-day grace
        period. During this time, you can
        <a href="/reactivate" class="text-brand hover:underline">reactivate your account</a>
        to restore all your data. After 30 days, your account and associated data are permanently
        deleted and cannot be recovered.
      </p>
      <p>
        If you deactivate your account instead, your data is preserved indefinitely. You can sign
        back in at any time to reactivate. Deactivated accounts do not count toward any user limits.
      </p>
    </div>
  </div>
</section>

<Footer />
