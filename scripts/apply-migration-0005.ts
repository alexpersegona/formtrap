#!/usr/bin/env bun
/**
 * Manually apply migration 0005 (allocation locks) and mark it as applied
 * Run with: bun scripts/apply-migration-0005.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	throw new Error('DATABASE_URL environment variable is not set');
}

const client = postgres(DATABASE_URL);
const db = drizzle(client);

async function applyMigration() {
	console.log('🔄 Applying migration 0005_equal_owl...\n');

	try {
		// Step 1: Add storageIsLocked column (if not exists)
		console.log('📝 Adding storageIsLocked column...');
		try {
			await db.execute(
				sql`ALTER TABLE "spaceResourceAllocation" ADD COLUMN "storageIsLocked" boolean DEFAULT false NOT NULL`
			);
			console.log('✅ storageIsLocked column added\n');
		} catch (error: any) {
			// Check both error.code and error.cause.code (DrizzleQueryError wraps PostgresError)
			const errorCode = error.code || error.cause?.code;
			if (errorCode === '42701') {
				console.log('⚠️  storageIsLocked column already exists\n');
			} else {
				throw error;
			}
		}

		// Step 2: Add submissionIsLocked column (if not exists)
		console.log('📝 Adding submissionIsLocked column...');
		try {
			await db.execute(
				sql`ALTER TABLE "spaceResourceAllocation" ADD COLUMN "submissionIsLocked" boolean DEFAULT false NOT NULL`
			);
			console.log('✅ submissionIsLocked column added\n');
		} catch (error: any) {
			const errorCode = error.code || error.cause?.code;
			if (errorCode === '42701') {
				console.log('⚠️  submissionIsLocked column already exists\n');
			} else {
				throw error;
			}
		}

		// Step 3: Mark migration as applied in drizzle journal
		console.log('📝 Marking migration as applied in drizzle journal...');
		const timestamp = Date.now(); // Unix timestamp in milliseconds
		try {
			await db.execute(
				sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ('0005_equal_owl', ${timestamp})`
			);
			console.log('✅ Migration marked as applied\n');
		} catch (error: any) {
			const errorCode = error.code || error.cause?.code;
			if (errorCode === '23505') {
				// Unique constraint violation - already marked
				console.log('⚠️  Migration already marked as applied\n');
			} else {
				throw error;
			}
		}

		console.log('🎉 Migration 0005 completed successfully!');
		console.log('   - storageIsLocked column ready');
		console.log('   - submissionIsLocked column ready');
		console.log('   - Drizzle journal updated');
	} catch (error: any) {
		console.error('❌ Fatal error applying migration:', error);
		throw error;
	} finally {
		await client.end();
	}
}

applyMigration().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});
