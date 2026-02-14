import { redirect, error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Require authentication
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	// Require admin role
	if (locals.user.role !== 'admin') {
		throw error(403, 'Forbidden - Admin access required');
	}

	// Return user data to all admin pages
	return {
		user: locals.user
	};
};
