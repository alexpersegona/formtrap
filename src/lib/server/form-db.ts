/**
 * Form Database Router
 *
 * Determines whether to use the user's own DB (BYOI/Pro) or FormTrap's
 * hosted DB (free trial users) for form and submission queries.
 */

import { db } from './db';
import { subscription, connection } from './db/schema';
import { eq } from 'drizzle-orm';
import { getUserDb } from './user-db';
import * as platformSchema from './db/schema';
import * as userSchema from './db/user-schema';

export type FormDb = {
	type: 'user';
	db: Awaited<ReturnType<typeof getUserDb>>;
	schema: typeof userSchema;
} | {
	type: 'platform';
	db: typeof db;
	schema: typeof platformSchema;
};

/**
 * Get the appropriate database for form/submission operations.
 * Pro users with BYOI connections use their own DB.
 * Free trial users use FormTrap's platform DB.
 */
export async function getFormDb(userId: string): Promise<FormDb> {
	// Check if user has a BYOI connection
	const conn = await db.query.connection.findFirst({
		where: eq(connection.userId, userId),
		columns: {
			dbStatus: true,
			schemaInitialized: true
		}
	});

	if (conn && conn.dbStatus === 'connected' && conn.schemaInitialized) {
		const userDb = await getUserDb(userId);
		return { type: 'user', db: userDb, schema: userSchema };
	}

	// Fall back to platform DB (free trial)
	return { type: 'platform', db, schema: platformSchema };
}

/**
 * Check if user is on free trial.
 * A user is NOT on free trial if:
 * - They have a Pro subscription, OR
 * - They have a connected BYOI database
 */
export async function isFreeTrial(userId: string): Promise<boolean> {
	// Check subscription tier first
	const sub = await db.query.subscription.findFirst({
		where: eq(subscription.userId, userId),
		columns: { tier: true, status: true }
	});

	// Pro users are never on free trial
	if (sub && sub.tier === 'pro' && sub.status === 'active') {
		return false;
	}

	// Check if user has a working BYOI connection
	const conn = await db.query.connection.findFirst({
		where: eq(connection.userId, userId),
		columns: { dbStatus: true, schemaInitialized: true }
	});

	// If they have BYOI set up, they're not on free trial
	if (conn && conn.dbStatus === 'connected' && conn.schemaInitialized) {
		return false;
	}

	// Otherwise, they're on free trial
	return true;
}
