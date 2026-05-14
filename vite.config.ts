/// <reference types="vitest/config" />
import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

const adapter = process.env.ADAPTER ?? 'node'

export default defineConfig({
  define: {
    __ADAPTER__: JSON.stringify(adapter),
  },
  optimizeDeps: {
    exclude: ['better-auth', '@better-auth/core', '@better-auth/svelte'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@tanstack/svelte-query') || id.includes('@tanstack/svelte-form')) {
            return 'vendor-tanstack'
          }
          if (
            id.includes('@tiptap/core') ||
            id.includes('@tiptap/starter-kit') ||
            id.includes('@tiptap/extension-image')
          ) {
            return 'vendor-tiptap'
          }
          if (id.includes('hono')) {
            return 'vendor-hono'
          }
        },
      },
    },
  },
  plugins: [
    tailwindcss(),
    sveltekit(),
    paraglideVitePlugin({ outdir: './src/lib/paraglide', project: './project.inlang' }),
  ],
  ssr: {
    external: ['better-auth', '@better-auth/core', 'bun:sqlite', 'drizzle-orm/bun-sqlite'],
  },
})
