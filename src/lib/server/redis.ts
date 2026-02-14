import { createClient } from 'redis';
import { REDIS_URL } from '$env/static/private';

type RedisClient = ReturnType<typeof createClient>;

let client: RedisClient | null = null;

/**
 * Get or create Redis client singleton
 */
export async function getRedisClient(): Promise<RedisClient> {
	if (client) {
		return client;
	}

	client = createClient({
		url: REDIS_URL || 'redis://localhost:6379'
	});

	client.on('error', (err) => {
		console.error('Redis Client Error:', err);
	});

	client.on('connect', () => {
		console.log('Redis Client Connected');
	});

	await client.connect();

	return client;
}

/**
 * Gracefully disconnect Redis client
 */
export async function disconnectRedis(): Promise<void> {
	if (client) {
		await client.quit();
		client = null;
	}
}

/**
 * Check if Redis is available and connected
 */
export async function isRedisAvailable(): Promise<boolean> {
	try {
		if (!client) {
			await getRedisClient();
		}
		await client!.ping();
		return true;
	} catch (error) {
		console.error('Redis not available:', error);
		return false;
	}
}
