#!/usr/bin/env bun
/**
 * Set test user to Pro tier
 * Usage: bun scripts/set-test-user-pro.ts
 */

// Load .env FIRST before any imports
import { config } from 'dotenv';
config();

// Now we can import functions that depend on environment variables
import { setTestSubscription } from '../src/lib/server/pricing/subscription';

const testEmail = 'persegonajunk@gmail.com';

try {
	await setTestSubscription(testEmail, 'pro');
	console.log('\n✨ Success! User is now on Pro tier.');
	console.log('- They can now allocate resources across spaces');
	console.log('- Visit /usage to see the new limits');
	console.log('- Visit /usage/allocate to manage allocations\n');
} catch (error) {
	console.error('❌ Error:', error);
	process.exit(1);
}

process.exit(0);
