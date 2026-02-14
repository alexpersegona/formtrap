import { auth } from '$lib/server/auth';
import { logAuth } from '$lib/server/logger';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';

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

		// Log session info for debugging verification flow
		if (url.includes('/verify-email') || url.includes('/dashboard') || url === '/') {
			console.log(`🔐 [${url}] Session:`, session?.session ? 'EXISTS' : 'NULL');
			console.log(`🔐 [${url}] User:`, session?.user?.email ?? 'NULL');
			console.log(`🔐 [${url}] Email Verified:`, session?.user?.emailVerified ?? 'N/A');
		}
	} catch (error) {
		// If session validation fails, continue without user
		console.error('Session validation error:', error);
		event.locals.session = null;
		event.locals.user = null;
	}

	return svelteKitHandler({ event, resolve, auth, building });
};
