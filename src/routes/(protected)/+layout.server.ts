import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { env } from '$env/dynamic/private';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	// Require authentication
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	// Check email verification if enabled
	const requireVerification = env.REQUIRE_EMAIL_VERIFICATION === 'true';

	if (requireVerification && !locals.user.emailVerified) {
		// Allow access to verify-email page itself
		if (!url.pathname.startsWith('/verify-email')) {
			throw redirect(303, '/verify-email');
		}
	}

	// Return user data to all protected pages
	return {
		user: locals.user
	};
};
