import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getCurrentUsage, getUserSubscription } from '$lib/server/pricing/limits';

export const load: PageServerLoad = async ({ locals }) => {
	// Check if user is authenticated
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const userId = locals.user.id;

	// Get usage data for the dashboard cards
	const [subscription, usage] = await Promise.all([
		getUserSubscription(userId),
		getCurrentUsage(userId)
	]);

	// Return user data to the page
	return {
		user: locals.user,
		subscription,
		usage
	};
};
