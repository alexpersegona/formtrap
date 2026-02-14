import { redirect, error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Require authentication
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	// Require superadmin role
	if (locals.user.role !== 'superadmin') {
		throw error(403, 'Access denied. Superadmin privileges required.');
	}

	return {
		user: locals.user
	};
};
