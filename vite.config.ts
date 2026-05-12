/// <reference types="vitest/config" />
import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

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
        manualChunks: {
          'vendor-tanstack': ['@tanstack/svelte-query', '@tanstack/svelte-form'],
          'vendor-tiptap': ['@tiptap/core', '@tiptap/starter-kit', '@tiptap/extension-image'],
          'vendor-hono': ['hono'],
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
  test: {
    environment: 'node',
    exclude: ['node_modules', '.svelte-kit', 'build'],
    globals: true,
    include: ['tests/unit/**/*.test.{js,ts}'],
    server: {
      deps: {
        inline: [/@sveltejs\/kit/],
      },
    },
  },
})
