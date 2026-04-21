/// <reference types="vitest/config" />
import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit(),
    paraglideVitePlugin({ project: './project.inlang', outdir: './src/lib/paraglide' }),
  ],
  optimizeDeps: {
    exclude: ['better-auth', '@better-auth/core', '@better-auth/svelte'],
  },
  ssr: {
    external: ['better-auth', '@better-auth/core'],
  },
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', '.svelte-kit', 'build'],
    globals: true,
    environment: 'node',
    server: {
      deps: {
        inline: [/@sveltejs\/kit/],
      },
    },
  },
})
