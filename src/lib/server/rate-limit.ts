import type { RequestEvent } from '@sveltejs/kit';
import { getRedisClient, isRedisAvailable } from './redis';

/**
 * Identifier strategy for rate limiting
 */
export type IdentifierType = 'ip' | 'email' | 'userId' | ((event: RequestEvent) => string);

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
	/** Identifier strategy: 'ip', 'email', 'userId', or custom function */
	identifier: IdentifierType;
	/** Maximum number of requests allowed in the time window */
	limit: number;
	/** Time window in milliseconds */
	windowMs: number;
	/** Optional prefix for Redis key */
	prefix?: string;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
	/** Whether the request is allowed */
	allowed: boolean;
	/** Number of requests remaining in current window */
	remaining: number;
	/** Timestamp when the rate limit resets */
	resetAt: Date;
	/** Total limit for this window */
	limit: number;
}

/**
 * Resolve identifier from request event based on strategy
 */
function resolveIdentifier(event: RequestEvent, identifier: IdentifierType): string {
	if (typeof identifier === 'function') {
		return identifier(event);
	}

	switch (identifier) {
		case 'ip':
			return event.getClientAddress();
		case 'email':
			// Email should be extracted from request data by caller
			throw new Error('Email identifier must be provided via custom function');
		case 'userId':
			// Assuming user ID is stored in locals after auth
			return event.locals.user?.id || event.getClientAddress();
		default:
			return event.getClientAddress();
	}
}

/**
 * Core rate limiting function using Redis
 */
export async function rateLimit(
	event: RequestEvent,
	config: RateLimitConfig
): Promise<RateLimitResult> {
	const { identifier, limit, windowMs, prefix = 'ratelimit' } = config;

	try {
		// Check if Redis is available
		const redisAvailable = await isRedisAvailable();

		if (!redisAvailable) {
			console.warn('Redis not available, allowing request');
			return {
				allowed: true,
				remaining: limit,
				resetAt: new Date(Date.now() + windowMs),
				limit
			};
		}

		const redis = await getRedisClient();
		const identifierValue = resolveIdentifier(event, identifier);
		const key = `${prefix}:${identifierValue}`;

		// Get current count
		const current = await redis.get(key);
		const currentCount = current ? parseInt(current, 10) : 0;

		// Check if limit exceeded
		if (currentCount >= limit) {
			const ttl = await redis.ttl(key);
			const resetAt = new Date(Date.now() + ttl * 1000);

			return {
				allowed: false,
				remaining: 0,
				resetAt,
				limit
			};
		}

		// Increment counter
		const newCount = await redis.incr(key);

		// Set expiration on first request
		if (newCount === 1) {
			await redis.expire(key, Math.ceil(windowMs / 1000));
		}

		const ttl = await redis.ttl(key);
		const resetAt = new Date(Date.now() + ttl * 1000);

		return {
			allowed: true,
			remaining: Math.max(0, limit - newCount),
			resetAt,
			limit
		};
	} catch (error) {
		console.error('Rate limit error:', error);
		// On error, allow the request (fail open)
		return {
			allowed: true,
			remaining: limit,
			resetAt: new Date(Date.now() + windowMs),
			limit
		};
	}
}

/**
 * Convenience helper: Throttle login attempts (IP-based)
 * Default: 5 attempts per 15 minutes
 */
export async function throttleLogin(
	event: RequestEvent,
	options: { limit?: number; windowMs?: number } = {}
): Promise<RateLimitResult> {
	return rateLimit(event, {
		identifier: 'ip',
		limit: options.limit ?? 5,
		windowMs: options.windowMs ?? 15 * 60 * 1000, // 15 minutes
		prefix: 'ratelimit:login'
	});
}

/**
 * Convenience helper: Throttle registration attempts (IP-based)
 * Default: 3 attempts per hour
 */
export async function throttleRegister(
	event: RequestEvent,
	options: { limit?: number; windowMs?: number } = {}
): Promise<RateLimitResult> {
	return rateLimit(event, {
		identifier: 'ip',
		limit: options.limit ?? 3,
		windowMs: options.windowMs ?? 60 * 60 * 1000, // 1 hour
		prefix: 'ratelimit:register'
	});
}

/**
 * Convenience helper: Throttle forgot password requests (IP + Email combo)
 * Default: 3 attempts per hour
 */
export async function throttleForgotPassword(
	event: RequestEvent,
	email: string,
	options: { limit?: number; windowMs?: number } = {}
): Promise<RateLimitResult> {
	return rateLimit(event, {
		identifier: (e) => `${e.getClientAddress()}:${email}`,
		limit: options.limit ?? 3,
		windowMs: options.windowMs ?? 60 * 60 * 1000, // 1 hour
		prefix: 'ratelimit:forgot-password'
	});
}

/**
 * Convenience helper: Throttle password reset attempts (IP-based)
 * Default: 5 attempts per 30 minutes
 */
export async function throttlePasswordReset(
	event: RequestEvent,
	options: { limit?: number; windowMs?: number } = {}
): Promise<RateLimitResult> {
	return rateLimit(event, {
		identifier: 'ip',
		limit: options.limit ?? 5,
		windowMs: options.windowMs ?? 30 * 60 * 1000, // 30 minutes
		prefix: 'ratelimit:reset-password'
	});
}

/**
 * Convenience helper: Throttle by authenticated user ID
 * Useful for API rate limiting per user
 */
export async function throttleByUserId(
	event: RequestEvent,
	options: { limit?: number; windowMs?: number } = {}
): Promise<RateLimitResult> {
	return rateLimit(event, {
		identifier: 'userId',
		limit: options.limit ?? 100,
		windowMs: options.windowMs ?? 60 * 60 * 1000, // 1 hour
		prefix: 'ratelimit:user'
	});
}

/**
 * Convenience helper: Throttle verification email resend attempts (User ID-based)
 * Default: 3 attempts per 15 minutes
 */
export async function throttleVerificationEmail(
	event: RequestEvent,
	options: { limit?: number; windowMs?: number } = {}
): Promise<RateLimitResult> {
	return rateLimit(event, {
		identifier: 'userId',
		limit: options.limit ?? 3,
		windowMs: options.windowMs ?? 15 * 60 * 1000, // 15 minutes
		prefix: 'ratelimit:verification-email'
	});
}
