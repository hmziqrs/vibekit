<script lang="ts">
</script>

<!-- Hero Section -->
<section class="relative min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
  <div class="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(0_0_0/0.07)_1px,transparent_0)] bg-[size:24px_24px] dark:bg-[radial-gradient(circle_at_1px_1px,rgb(255_255_255/0.05)_1px,transparent_0)]"></div>
  
  <nav class="relative max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
    <div class="flex items-center gap-2 font-semibold text-xl">
      <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">V</div>
      Vibekit
    </div>
    <div class="hidden md:flex items-center gap-8 text-sm text-slate-600 dark:text-slate-300">
      <a href="#features">Features</a>
      <a href="#pricing">Pricing</a>
      <a href="/blog">Blog</a>
      <a href="/about">About</a>
    </div>
    <div class="flex items-center gap-4">
      <a href="/login" class="text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition">Log in</a>
      <a href="/register" class="text-sm bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-2 rounded-md font-medium hover:opacity-90 transition">Get started</a>
    </div>
  </nav>

  <div class="relative max-w-6xl mx-auto px-6 pt-24 pb-32">
    <div class="max-w-3xl mx-auto text-center">
      <div class="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-sm text-slate-700 dark:text-slate-300 mb-8">
        <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        Built for Cloudflare Workers
      </div>
      
      <h1 class="text-5xl md:text-6xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">
        Build better SaaS
        <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">faster</span>
      </h1>
      
      <p class="text-xl text-slate-600 dark:text-slate-400 mb-10 leading-relaxed">
        A production-ready SvelteKit SaaS starter. Batteries included, no lock-in. 
        Deploy to Cloudflare in seconds.
      </p>
      
      <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
        <a href="/register" class="w-full sm:w-auto px-8 py-3.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-lg font-medium text-lg hover:opacity-90 transition">
          Start building
        </a>
        <a href="#features" class="w-full sm:w-auto px-8 py-3.5 border border-slate-200 dark:border-slate-700 rounded-lg font-medium text-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
          Learn more
        </a>
      </div>

      <p class="text-sm text-slate-500 dark:text-slate-500 mt-6">
        No credit card required. Open source.
      </p>
    </div>

    <div class="mt-24 relative">
      <div class="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 to-purple-600/20 rounded-2xl blur-3xl"></div>
      <div class="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
        <div class="h-9 bg-slate-100 dark:bg-slate-800 flex items-center px-4 gap-2">
          <div class="w-3 h-3 rounded-full bg-red-400"></div>
          <div class="w-3 h-3 rounded-full bg-yellow-400"></div>
          <div class="w-3 h-3 rounded-full bg-green-400"></div>
        </div>
        <div class="p-8 bg-slate-50 dark:bg-slate-900/50">
          <pre class="text-sm text-slate-700 dark:text-slate-300 font-mono"><code><span class="text-slate-400"># Deploy in seconds</span>
bun create vibekit@latest
cd my-project
bun install
bun run deploy</code></pre>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Features Section -->
<section id="features" class="py-24 bg-white dark:bg-slate-900">
  <div class="max-w-6xl mx-auto px-6">
    <div class="text-center max-w-2xl mx-auto mb-16">
      <h2 class="text-3xl font-bold text-slate-900 dark:text-white mb-4">Everything you need</h2>
      <p class="text-slate-600 dark:text-slate-400">Pre-configured, production-ready stack. Stop building boilerplate.</p>
    </div>

    <div class="grid md:grid-cols-3 gap-6">
      <div class="group p-6 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 transition-all hover:shadow-lg">
        <div class="w-12 h-12 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </div>
        <h3 class="font-semibold text-lg text-slate-900 dark:text-white mb-2">Authentication</h3>
        <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">Better Auth with email/password, sessions, and admin roles. Fully typed with Drizzle.</p>
      </div>

      <div class="group p-6 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 transition-all hover:shadow-lg">
        <div class="w-12 h-12 rounded-lg bg-purple-50 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4 group-hover:scale-110 transition-transform">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>
        </div>
        <h3 class="font-semibold text-lg text-slate-900 dark:text-white mb-2">Edge Database</h3>
        <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">Cloudflare D1 with Drizzle ORM. Type-safe queries, migrations included.</p>
      </div>

      <div class="group p-6 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 transition-all hover:shadow-lg">
        <div class="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 group-hover:scale-110 transition-transform">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        </div>
        <h3 class="font-semibold text-lg text-slate-900 dark:text-white mb-2">Lightning Fast</h3>
        <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">Svelte 5 Runes. Cloudflare Workers. Sub-100ms responses globally.</p>
      </div>

      <div class="group p-6 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 transition-all hover:shadow-lg">
        <div class="w-12 h-12 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h3 class="font-semibold text-lg text-slate-900 dark:text-white mb-2">Admin Panel</h3>
        <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">Built-in admin dashboard. User management, blog editor, audit logs.</p>
      </div>

      <div class="group p-6 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 transition-all hover:shadow-lg">
        <div class="w-12 h-12 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4 group-hover:scale-110 transition-transform">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
        </div>
        <h3 class="font-semibold text-lg text-slate-900 dark:text-white mb-2">Blog Engine</h3>
        <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">ISR-style rendering. Markdown, drafts, on-demand regeneration.</p>
      </div>

      <div class="group p-6 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 transition-all hover:shadow-lg">
        <div class="w-12 h-12 rounded-lg bg-rose-50 dark:bg-rose-950 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-4 group-hover:scale-110 transition-transform">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        </div>
        <h3 class="font-semibold text-lg text-slate-900 dark:text-white mb-2">Full Stack</h3>
        <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">TanStack Query, Form, Table. Shadcn-svelte UI. i18n included.</p>
      </div>
    </div>
  </div>
</section>

<!-- Pricing Section -->
<section id="pricing" class="py-24 bg-white dark:bg-slate-900">
  <div class="max-w-6xl mx-auto px-6">
    <div class="text-center max-w-2xl mx-auto mb-16">
      <h2 class="text-3xl font-bold text-slate-900 dark:text-white mb-4">Simple pricing</h2>
      <p class="text-slate-600 dark:text-slate-400">Start free. Scale when you need to.</p>
    </div>

    <div class="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
      <div class="p-6 rounded-xl border border-slate-200 dark:border-slate-800">
        <h3 class="font-semibold text-lg text-slate-900 dark:text-white mb-2">Starter</h3>
        <div class="text-3xl font-bold text-slate-900 dark:text-white mb-4">Free</div>
        <p class="text-slate-600 dark:text-slate-400 text-sm mb-6">Perfect for getting started.</p>
        <a href="/register" class="block w-full py-2.5 text-center border border-slate-200 dark:border-slate-700 rounded-lg font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
          Get started
        </a>
      </div>

      <div class="p-6 rounded-xl border border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 relative">
        <div class="absolute -top-3 left-4 px-3 py-1 bg-indigo-600 text-white text-xs rounded-full font-medium">Most popular</div>
        <h3 class="font-semibold text-lg text-slate-900 dark:text-white mb-2">Pro</h3>
        <div class="text-3xl font-bold text-slate-900 dark:text-white mb-4">$29<span class="text-lg font-normal text-slate-500">/mo</span></div>
        <p class="text-slate-600 dark:text-slate-400 text-sm mb-6">For growing teams and production apps.</p>
        <a href="/register" class="block w-full py-2.5 text-center bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition">
          Start free trial
        </a>
      </div>
    </div>
  </div>
</section>

<!-- Social Proof -->
<section class="py-16 bg-slate-50 dark:bg-slate-800/50">
  <div class="max-w-6xl mx-auto px-6">
    <p class="text-center text-sm text-slate-500 dark:text-slate-400 mb-8 uppercase tracking-wider">Built with modern tools developers trust</p>
    <div class="flex flex-wrap items-center justify-center gap-12 opacity-60 grayscale">
      <span class="font-semibold text-xl text-slate-700 dark:text-slate-300">SvelteKit</span>
      <span class="font-semibold text-xl text-slate-700 dark:text-slate-300">Cloudflare</span>
      <span class="font-semibold text-xl text-slate-700 dark:text-slate-300">Drizzle</span>
      <span class="font-semibold text-xl text-slate-700 dark:text-slate-300">Tailwind</span>
      <span class="font-semibold text-xl text-slate-700 dark:text-slate-300">Bun</span>
    </div>
  </div>
</section>

<!-- CTA Section -->
<section class="py-24 bg-gradient-to-br from-indigo-600 to-purple-700">
  <div class="max-w-4xl mx-auto px-6 text-center">
    <h2 class="text-3xl md:text-4xl font-bold text-white mb-6">Ready to build?</h2>
    <p class="text-indigo-100 text-lg mb-10 max-w-2xl mx-auto">
      Skip 3 months of boilerplate. Start shipping features today.
    </p>
    <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
      <a href="/register" class="w-full sm:w-auto px-8 py-3.5 bg-white text-indigo-600 rounded-lg font-medium text-lg hover:bg-indigo-50 transition">
        Get started for free
      </a>
      <a href="https://github.com" class="w-full sm:w-auto px-8 py-3.5 border border-white/30 text-white rounded-lg font-medium text-lg hover:bg-white/10 transition">
        View on GitHub
      </a>
    </div>
  </div>
</section>

<!-- Footer -->
<footer class="py-12 bg-slate-900 text-slate-400">
  <div class="max-w-6xl mx-auto px-6">
    <div class="grid md:grid-cols-4 gap-8 mb-12">
      <div>
        <div class="flex items-center gap-2 font-semibold text-xl text-white mb-4">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">V</div>
          Vibekit
        </div>
        <p class="text-sm">Production-ready SaaS starter for SvelteKit on Cloudflare.</p>
      </div>
      
      <div>
        <h4 class="font-medium text-white mb-4">Product</h4>
        <ul class="space-y-2 text-sm">
          <li><a href="#features" class="hover:text-white transition">Features</a></li>
          <li><a href="#pricing" class="hover:text-white transition">Pricing</a></li>
          <li><a href="/blog" class="hover:text-white transition">Blog</a></li>
        </ul>
      </div>
      
      <div>
        <h4 class="font-medium text-white mb-4">Resources</h4>
        <ul class="space-y-2 text-sm">
          <li><a href="/docs" class="hover:text-white transition">Documentation</a></li>
          <li><a href="https://github.com" class="hover:text-white transition">GitHub</a></li>
          <li><a href="/support" class="hover:text-white transition">Support</a></li>
        </ul>
      </div>
      
      <div>
        <h4 class="font-medium text-white mb-4">Legal</h4>
        <ul class="space-y-2 text-sm">
          <li><a href="/privacy" class="hover:text-white transition">Privacy</a></li>
          <li><a href="/terms" class="hover:text-white transition">Terms</a></li>
        </ul>
      </div>
    </div>
    
    <div class="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
      <p>© 2026 Vibekit. All rights reserved.</p>
      <div class="flex items-center gap-6">
        <a href="#" class="hover:text-white transition">Twitter</a>
        <a href="#" class="hover:text-white transition">GitHub</a>
        <a href="#" class="hover:text-white transition">Discord</a>
      </div>
    </div>
  </div>
</footer>
