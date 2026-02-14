import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { isRedisAvailable, getRedisClient } from '$lib/server/redis';
import { sql } from 'drizzle-orm';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async () => {
	// Check database connection
	let dbStatus: 'connected' | 'error' = 'error';
	let dbVersion = '';
	let dbError = '';

	try {
		const result = await db.execute(sql`SELECT version()`);
		if (result && result.length > 0) {
			dbStatus = 'connected';
			dbVersion = (result[0] as { version: string }).version || '';
		}
	} catch (error) {
		dbError = error instanceof Error ? error.message : 'Unknown error';
	}

	// Check Redis connection
	let redisStatus: 'connected' | 'error' = 'error';
	let redisInfo = '';
	let redisError = '';

	try {
		const isAvailable = await isRedisAvailable();
		if (isAvailable) {
			redisStatus = 'connected';
			const client = await getRedisClient();
			const info = await client.info('server');
			// Extract Redis version from info
			const versionMatch = info.match(/redis_version:(\S+)/);
			redisInfo = versionMatch ? `Redis ${versionMatch[1]}` : 'Connected';
		}
	} catch (error) {
		redisError = error instanceof Error ? error.message : 'Unknown error';
	}

	// Get rate limit keys count (if Redis is connected)
	let rateLimitKeysCount = 0;
	if (redisStatus === 'connected') {
		try {
			const client = await getRedisClient();
			const keys = await client.keys('ratelimit:*');
			rateLimitKeysCount = keys.length;
		} catch {
			// Ignore errors
		}
	}

	// Environment info
	const environment = {
		nodeEnv: env.NODE_ENV || 'development',
		betterAuthUrl: env.BETTER_AUTH_URL || 'Not set',
		requireEmailVerification: env.REQUIRE_EMAIL_VERIFICATION === 'true',
		hasMailgunKey: !!env.MAILGUN_API_KEY,
		hasTurnstileKey: !!env.TURNSTILE_SECRET_KEY
	};

	return {
		database: {
			status: dbStatus,
			version: dbVersion,
			error: dbError
		},
		redis: {
			status: redisStatus,
			info: redisInfo,
			error: redisError,
			rateLimitKeys: rateLimitKeysCount
		},
		environment
	};
};
