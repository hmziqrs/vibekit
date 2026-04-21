import adapter from '@sveltejs/adapter-cloudflare';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true
	},
	kit: {
		experimental: {
			handleRenderingErrors: true
		},
		adapter: adapter(),
		typescript: {
			config: (config) => ({
				...config,
				include: [...config.include, '../drizzle.config.ts']
			})
		},
		prerender: {
			handleHttpError: ({ path, referrer, message }) => {
				// Ignore missing linked pages during prerender while building out the site
				if (referrer === '/' && message.startsWith('404')) {
					return;
				}
				throw new Error(message);
			}
		}
	}
};

export default config;
