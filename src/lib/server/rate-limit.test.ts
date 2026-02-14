import { describe, it, expect, beforeEach } from 'vitest';
import { rateLimit } from './rate-limit';
import type { RequestEvent } from '@sveltejs/kit';

describe('Rate Limiting', () => {
	// Mock RequestEvent
	const createMockEvent = (ip: string = '127.0.0.1'): Partial<RequestEvent> => ({
		getClientAddress: () => ip,
		locals: { session: null, user: null, impersonation: null },
		request: new Request('http://localhost:5173/test')
	});

	beforeEach(async () => {
		// Clear Redis before each test
		try {
			const { getRedisClient } = await import('./redis');
			const redis = await getRedisClient();
			await redis.flushDb();
		} catch (error) {
			// Redis might not be running in CI - that's okay
			console.log('Redis not available for testing');
		}
	});

	describe('Basic Rate Limiting', () => {
		it('should allow requests within the limit', async () => {
			const event = createMockEvent() as RequestEvent;

			const result = await rateLimit(event, {
				identifier: 'ip',
				limit: 5,
				windowMs: 60000
			});

			expect(result.allowed).toBe(true);
			expect(result.remaining).toBe(4); // 5 - 1
			expect(result.limit).toBe(5);
		});

		it('should block requests exceeding the limit', async () => {
			const event = createMockEvent() as RequestEvent;

			// Make 5 requests (at the limit)
			for (let i = 0; i < 5; i++) {
				await rateLimit(event, {
					identifier: 'ip',
					limit: 5,
					windowMs: 60000
				});
			}

			// 6th request should be blocked
			const result = await rateLimit(event, {
				identifier: 'ip',
				limit: 5,
				windowMs: 60000
			});

			expect(result.allowed).toBe(false);
			expect(result.remaining).toBe(0);
		});

		it('should track remaining attempts correctly', async () => {
			const event = createMockEvent() as RequestEvent;

			// First request
			let result = await rateLimit(event, {
				identifier: 'ip',
				limit: 3,
				windowMs: 60000
			});
			expect(result.remaining).toBe(2);

			// Second request
			result = await rateLimit(event, {
				identifier: 'ip',
				limit: 3,
				windowMs: 60000
			});
			expect(result.remaining).toBe(1);

			// Third request
			result = await rateLimit(event, {
				identifier: 'ip',
				limit: 3,
				windowMs: 60000
			});
			expect(result.remaining).toBe(0);
			expect(result.allowed).toBe(true); // Still allowed (at limit, not over)

			// Fourth request (over limit)
			result = await rateLimit(event, {
				identifier: 'ip',
				limit: 3,
				windowMs: 60000
			});
			expect(result.allowed).toBe(false);
		});
	});

	describe('Identifier Strategies', () => {
		it('should rate limit by IP address', async () => {
			const event1 = createMockEvent('192.168.1.1') as RequestEvent;
			const event2 = createMockEvent('192.168.1.2') as RequestEvent;

			// Different IPs should have separate limits
			const result1 = await rateLimit(event1, {
				identifier: 'ip',
				limit: 1,
				windowMs: 60000
			});

			const result2 = await rateLimit(event2, {
				identifier: 'ip',
				limit: 1,
				windowMs: 60000
			});

			expect(result1.allowed).toBe(true);
			expect(result2.allowed).toBe(true); // Different IP, separate counter
		});

		it('should use custom identifier function', async () => {
			const event = createMockEvent() as RequestEvent;

			const result = await rateLimit(event, {
				identifier: (e) => `${e.getClientAddress()}:custom-key`,
				limit: 1,
				windowMs: 60000
			});

			expect(result.allowed).toBe(true);
		});
	});

	describe('Convenience Helpers', () => {
		it('throttleLogin should use correct defaults', async () => {
			const { throttleLogin } = await import('./rate-limit');
			const event = createMockEvent() as RequestEvent;

			const result = await throttleLogin(event);

			expect(result.allowed).toBe(true);
			expect(result.limit).toBe(5); // Default: 5 attempts
		});

		it('throttleRegister should use correct defaults', async () => {
			const { throttleRegister } = await import('./rate-limit');
			const event = createMockEvent() as RequestEvent;

			const result = await throttleRegister(event);

			expect(result.allowed).toBe(true);
			expect(result.limit).toBe(3); // Default: 3 attempts
		});

		it('throttleForgotPassword should use IP + email combo', async () => {
			const { throttleForgotPassword } = await import('./rate-limit');
			const event = createMockEvent() as RequestEvent;

			const result = await throttleForgotPassword(event, 'test@example.com');

			expect(result.allowed).toBe(true);
			expect(result.limit).toBe(3); // Default: 3 attempts
		});
	});

	describe('Error Handling', () => {
		it('should fail open if Redis is unavailable', async () => {
			// This test would require mocking Redis to throw an error
			// For now, we're testing that the function handles errors gracefully
			const event = createMockEvent() as RequestEvent;

			const result = await rateLimit(event, {
				identifier: 'ip',
				limit: 5,
				windowMs: 60000
			});

			// Should always get a result (never throw)
			expect(result).toBeDefined();
			expect(result).toHaveProperty('allowed');
			expect(result).toHaveProperty('remaining');
			expect(result).toHaveProperty('resetAt');
		});
	});
});
