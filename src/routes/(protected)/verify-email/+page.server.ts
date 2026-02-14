import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// If user's email is already verified, redirect to dashboard
	if (locals.user?.emailVerified) {
		console.log('📧 User email already verified, redirecting to dashboard');
		throw redirect(303, '/dashboard');
	}

	return {};
};
