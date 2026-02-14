// Mock for SvelteKit $env/static/private and $env/dynamic/private

export const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
export const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:@localhost:5432/sveltekit_test';
export const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET || 'test-secret-key-for-testing-only';
export const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || 'http://localhost:5173';

// For dynamic env
export const env = {
	REDIS_URL,
	DATABASE_URL,
	BETTER_AUTH_SECRET,
	BETTER_AUTH_URL
};
