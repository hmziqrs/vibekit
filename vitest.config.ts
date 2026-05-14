import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [sveltekit()],
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
