/**
 * User Database Connection Manager
 *
 * Provides dynamic per-user Postgres connections with an in-memory cache.
 * Users bring their own Postgres DB; this module manages connection pools
 * with TTL-based eviction.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as userSchema from './db/user-schema';
import { db } from './db';
import { connection } from './db/schema';
import { eq } from 'drizzle-orm';
import { decrypt } from './encryption';

interface CachedConnection {
	db: ReturnType<typeof drizzle<typeof userSchema>>;
	client: ReturnType<typeof postgres>;
	lastAccessed: number;
}

const cache = new Map<string, CachedConnection>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const EVICTION_INTERVAL_MS = 60 * 1000; // Check every minute

// Periodic eviction of idle connections
let evictionTimer: ReturnType<typeof setInterval> | null = null;

function startEviction() {
	if (evictionTimer) return;
	evictionTimer = setInterval(() => {
		const now = Date.now();
		for (const [userId, cached] of cache.entries()) {
			if (now - cached.lastAccessed > CACHE_TTL_MS) {
				cached.client.end();
				cache.delete(userId);
			}
		}
	}, EVICTION_INTERVAL_MS);
}

/**
 * Get a Drizzle instance connected to a user's own Postgres database.
 * Connections are cached with a 10-minute TTL.
 */
export async function getUserDb(userId: string) {
	// Check cache first
	const cached = cache.get(userId);
	if (cached) {
		cached.lastAccessed = Date.now();
		return cached.db;
	}

	// Fetch connection credentials from FormTrap's DB
	const conn = await db.query.connection.findFirst({
		where: eq(connection.userId, userId)
	});

	if (!conn || !conn.dbConnectionStringEncrypted) {
		throw new Error('No database connection configured. Please set up your infrastructure in Settings > Connections.');
	}

	if (conn.dbStatus === 'error') {
		throw new Error(`Database connection error: ${conn.dbError || 'Unknown error'}`);
	}

	// Decrypt connection string
	const connectionString = decrypt(conn.dbConnectionStringEncrypted);

	// Create new connection
	const client = postgres(connectionString, {
		max: 5, // Small pool per user
		idle_timeout: 300, // 5 min idle timeout
		connect_timeout: 10 // 10s connect timeout
	});

	const userDb = drizzle(client, { schema: userSchema });

	// Cache the connection
	cache.set(userId, {
		db: userDb,
		client,
		lastAccessed: Date.now()
	});

	// Start eviction timer if not running
	startEviction();

	return userDb;
}

/**
 * Check if a user has a configured and connected database.
 */
export async function hasUserConnection(userId: string): Promise<boolean> {
	const conn = await db.query.connection.findFirst({
		where: eq(connection.userId, userId),
		columns: {
			dbStatus: true,
			schemaInitialized: true
		}
	});

	return !!conn && conn.dbStatus === 'connected' && conn.schemaInitialized;
}

/**
 * Evict a specific user's connection from the cache.
 * Useful when credentials are updated.
 */
export async function evictUserConnection(userId: string): Promise<void> {
	const cached = cache.get(userId);
	if (cached) {
		await cached.client.end();
		cache.delete(userId);
	}
}

/**
 * Close all cached connections. Call on server shutdown.
 */
export async function closeAllConnections(): Promise<void> {
	if (evictionTimer) {
		clearInterval(evictionTimer);
		evictionTimer = null;
	}
	for (const [userId, cached] of cache.entries()) {
		await cached.client.end();
		cache.delete(userId);
	}
}
