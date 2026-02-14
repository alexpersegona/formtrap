import { beforeAll } from 'vitest';

// Setup environment variables for tests
beforeAll(() => {
	// Set test environment variables
	process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
	process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:@localhost:5432/sveltekit_test';
	process.env.BETTER_AUTH_SECRET = 'test-secret-key-for-testing-only';
	process.env.BETTER_AUTH_URL = 'http://localhost:5173';
});
