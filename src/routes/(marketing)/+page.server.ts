import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	// If user is logged in and just verified email (coming from email verification),
	// redirect them to dashboard
	if (locals.user && locals.user.emailVerified) {
		// Check if this is a redirect from email verification
		// Better Auth redirects to / after verification
		const referrer = url.searchParams.get('from');

		// If user is verified and logged in, redirect to dashboard
		// This catches users who just verified their email
		console.log('🏠 User is logged in and verified, redirecting to dashboard');
		throw redirect(303, '/dashboard');
	}

	return {};
};
