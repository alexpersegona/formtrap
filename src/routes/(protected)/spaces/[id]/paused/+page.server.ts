import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { organization } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { requireSpaceMember, getUserSpaceRole } from '$lib/server/spaces/permissions';

export const load: PageServerLoad = async ({ locals, params }) => {
	const userId = locals.user.id;
	const spaceId = params.id;

	// Check if user is a member
	await requireSpaceMember(userId, spaceId);

	// Get space details
	const space = await db.query.organization.findFirst({
		where: eq(organization.id, spaceId)
	});

	if (!space) {
		throw error(404, 'Space not found');
	}

	// Get user's role
	const userRole = await getUserSpaceRole(userId, spaceId);

	// If space is not paused, this page shouldn't be accessible
	if (!space.isPaused) {
		throw error(404, 'Space is not paused');
	}

	return {
		space: {
			id: space.id,
			name: space.name,
			logo: space.logo,
			createdAt: space.createdAt
		},
		isOwner: userRole === 'owner'
	};
};
