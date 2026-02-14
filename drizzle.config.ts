import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

// Load environment variables
config();

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'postgresql',
	dbCredentials: { url: process.env.DATABASE_URL },
	verbose: true,
	strict: true,
	// Exclude River job queue tables (managed by River's own migrations)
	// Note: This doesn't exclude enums/sequences, so use db:generate + db:migrate instead of db:push
	tablesFilter: ['!river_*']
});
