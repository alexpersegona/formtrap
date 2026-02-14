import { auth } from '$lib/server/auth';
import { logAuth } from '$lib/server/logger';
import { alertAuthError } from '$lib/server/discord-alerts';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const handle: Handle = async ({ event, resolve }) => {
	const url = event.url.pathname;

	// Log all auth-related requests
	if (url.startsWith('/api/auth')) {
		const method = event.request.method;
		const endpoint = url.replace('/api/auth', '');

		logAuth(`${method} ${endpoint}`, {
			ip: event.getClientAddress(),
			userAgent: event.request.headers.get('user-agent')?.substring(0, 50)
		});

		// Extra logging for email verification endpoint
		if (endpoint.includes('verify-email')) {
			console.log(`🔍 Email verification endpoint hit`);
			console.log(`🔍 Query params:`, Object.fromEntries(event.url.searchParams));
		}
	}

	try {
		const session = await auth.api.getSession({
			headers: event.request.headers
		});

		event.locals.session = session?.session ?? null;
		event.locals.user = session?.user ? (session.user as App.Locals['user']) : null;
		event.locals.impersonation = null;

		// Handle impersonation
		const impersonationCookie = event.cookies.get('impersonation');
		if (impersonationCookie && event.locals.user?.role === 'superadmin') {
			try {
				const impersonation = JSON.parse(impersonationCookie);

				// Verify the superadmin is still the one who started impersonation
				if (impersonation.superadminId === event.locals.user.id) {
					// Fetch the impersonated user
					const targetUser = await db.query.user.findFirst({
						where: eq(user.id, impersonation.targetUserId)
					});

					if (targetUser && !targetUser.bannedAt && targetUser.role !== 'superadmin') {
						// Store impersonation info for the banner
						event.locals.impersonation = impersonation;

						// Override the user with the impersonated user (but keep session intact)
						event.locals.user = {
							id: targetUser.id,
							name: targetUser.name,
							email: targetUser.email,
							emailVerified: targetUser.emailVerified,
							image: targetUser.image,
							role: targetUser.role,
							createdAt: targetUser.createdAt,
							updatedAt: targetUser.updatedAt
						} as App.Locals['user'];
					} else {
						// Invalid impersonation target, clear cookie
						event.cookies.delete('impersonation', { path: '/' });
					}
				} else {
					// Superadmin mismatch, clear cookie
					event.cookies.delete('impersonation', { path: '/' });
				}
			} catch {
				// Invalid cookie format, clear it
				event.cookies.delete('impersonation', { path: '/' });
			}
		}

		// Log session info for debugging verification flow
		if (url.includes('/verify-email') || url.includes('/dashboard') || url === '/') {
			console.log(`🔐 [${url}] Session:`, session?.session ? 'EXISTS' : 'NULL');
			console.log(`🔐 [${url}] User:`, session?.user?.email ?? 'NULL');
			console.log(`🔐 [${url}] Email Verified:`, session?.user?.emailVerified ?? 'N/A');
		}
	} catch (error) {
		// If session validation fails, continue without user
		console.error('Session validation error:', error);
		alertAuthError(error, { URL: event.url.pathname });
		event.locals.session = null;
		event.locals.user = null;
		event.locals.impersonation = null;
	}

	return svelteKitHandler({ event, resolve, auth, building });
};
