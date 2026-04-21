import { defineConfig } from 'drizzle-kit';

// This config is for production deployment only
// For local development use:
// - wrangler d1 execute vibekit-db --local --file=./migrations/xxx.sql
// - wrangler d1 execute vibekit-db --local --command="SELECT * FROM users"

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'sqlite',
	driver: 'd1-http',
	dbCredentials: {
		accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
		databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
		token: process.env.CLOUDFLARE_D1_TOKEN!
	},
	verbose: true,
	strict: true
});
