import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { twoFactor, organization } from 'better-auth/plugins';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { db } from './db';
import * as schema from './db/schema';
import { env } from '$env/dynamic/private';
import { sendPasswordResetEmail, sendVerificationEmail } from './email';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: 'pg',
		schema
	}),
	emailAndPassword: {
		enabled: true,
		// Note: We handle email verification in our protected layout instead
		// Setting this to false allows users to sign in and be redirected to /verify-email
		requireEmailVerification: false,
		sendResetPassword: async ({ user, url }) => {
			await sendPasswordResetEmail(user.email, url);
		}
	},
	emailVerification: {
		sendOnSignUp: true,
		autoSignInAfterVerification: true,
		getRedirectUrl: async (user: any) => {
			console.log('🔀 Getting redirect URL for verified user:', user.email);
			return '/dashboard';
		},
		sendVerificationEmail: async ({ user, url }) => {
			console.log('📧 Sending verification email to:', user.email);
			await sendVerificationEmail(user.email, url);
		},
		afterEmailVerification: async (user) => {
			console.log('✅ Email verification completed for user:', user.email);
			console.log('✅ User emailVerified status:', user.emailVerified);
		}
	},
	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 days (when Remember Me is unchecked)
		updateAge: 60 * 60 * 24, // Update session every 24 hours (rolling sessions)
		freshAge: 60 * 60, // Refresh token after 1 hour
		cookieCache: {
			enabled: true,
			maxAge: 5 * 60 // Cache for 5 minutes
		}
	},
	rateLimit: {
		enabled: true,
		window: 15 * 60, // 15 minutes in seconds
		max: 30 // 15 complete login attempts per window (2 requests per attempt)
	},
	advanced: {
		cookiePrefix: 'better-auth',
		defaultCookieAttributes: {
			sameSite: 'lax',
			path: '/',
			secure: process.env.NODE_ENV === 'production'
		},
		sessionCookieExpiresIn: 60 * 60 * 24 * 30 // 30 days when "Remember Me" is checked
	},
	user: {
		additionalFields: {
			role: {
				type: 'string',
				defaultValue: 'user',
				required: true
			}
		},
		deleteUser: {
			enabled: true,
			// Cleanup user files before deletion
			beforeDelete: async (user) => {
				// Delete user's avatar image if exists
				if (user.image) {
					const imagePath = join(process.cwd(), 'static', user.image);
					if (existsSync(imagePath)) {
						try {
							await unlink(imagePath);
							console.log(`Deleted avatar for user ${user.id}: ${imagePath}`);
						} catch (err) {
							console.error('Failed to delete user avatar:', err);
							// Don't throw - allow deletion to continue even if file cleanup fails
						}
					}
				}

				// TODO: Add additional file cleanup here as your SaaS grows
				// Examples:
				// - Delete files from R2/S3 buckets
				// - Delete user-uploaded documents
				// - Delete generated reports/exports
				// - Clean up temporary files
			}
		}
	},
	plugins: [
		twoFactor({
			issuer: env.PUBLIC_COMPANY_NAME || 'SvelteKit SaaS'
		}),
		organization({
			// Allow users to create spaces (organizations)
			allowUserToCreateOrganization: true,
			// Organization creator becomes owner with full permissions
			creatorRole: 'owner',
			// Available member roles
			memberRoles: ['owner', 'admin', 'member']
		}),
		sveltekitCookies(getRequestEvent)
	],
	secret: env.BETTER_AUTH_SECRET,
	baseURL: env.BETTER_AUTH_URL || 'http://localhost:5173'
});
