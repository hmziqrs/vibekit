import adapter_cloudflare from '@sveltejs/adapter-cloudflare'
import adapter_node from '@sveltejs/adapter-node'

const adapterType = process.env.ADAPTER ?? 'node'

/** @type {import('@sveltejs/kit').Adapter} */
const adapter =
  adapterType === 'cloudflare' ? adapter_cloudflare() : adapter_node({ precompress: true })

/** @type {import('@sveltejs/kit').Config} */
const config = {
  compilerOptions: {
    // Force runes mode for the project, except for libraries. Can be removed in svelte 6.
    runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true),
  },
  kit: {
    adapter,
    experimental: {
      handleRenderingErrors: true,
    },
    prerender: {
      handleHttpError: ({ path: _path, referrer, message }) => {
        // Ignore missing linked pages during prerender while building out the site
        if (referrer === '/' && message.startsWith('404')) {
          return
        }
        throw new Error(message)
      },
    },
    typescript: {
      config: (tsConfig) => ({
        ...tsConfig,
        exclude: [
          ...(tsConfig.exclude || []),
          '**/.svelte-kit/output/**',
          '**/.svelte-kit/build/**',
          '**/src/lib/paraglide/**',
        ],
        include: [...tsConfig.include, '../drizzle.config.ts'],
      }),
    },
  },
}

export default config
