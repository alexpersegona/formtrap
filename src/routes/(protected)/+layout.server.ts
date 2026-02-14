import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { env } from '$env/dynamic/private';
import { hasUserConnection } from '$lib/server/user-db';
import { db } from '$lib/server/db';
import { subscription } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	// Require authentication
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	// Check email verification if enabled (skip when impersonating)
	const requireVerification = env.REQUIRE_EMAIL_VERIFICATION === 'true';

	if (!locals.impersonation && requireVerification && !locals.user.emailVerified) {
		// Allow access to verify-email page itself
		if (!url.pathname.startsWith('/verify-email')) {
			throw redirect(303, '/verify-email');
		}
	}

	// Check BYOI connection status for pro users
	// Skip for settings/connections path (so they can configure it)
	// Skip for settings path (general settings access)
	// Skip for free-trial users (they use hosted DB)
	// Skip when superadmin is impersonating a user
	if (
		!locals.impersonation &&
		!url.pathname.startsWith('/settings') &&
		!url.pathname.startsWith('/verify-email')
	) {
		const userSub = await db.query.subscription.findFirst({
			where: eq(subscription.userId, locals.user.id)
		});

		const isPro = userSub?.tier === 'pro';

		if (isPro) {
			const hasConnection = await hasUserConnection(locals.user.id);
			if (!hasConnection) {
				throw redirect(303, '/settings/connections');
			}
		}
	}

	// Return user data to all protected pages
	return {
		user: locals.user,
		impersonation: locals.impersonation
	};
};
