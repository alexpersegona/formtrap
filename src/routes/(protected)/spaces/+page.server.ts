import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { organization, member, form } from '$lib/server/db/schema';
import { eq, sql, inArray } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { getUserSpaceRole, type OrganizationRole } from '$lib/server/spaces/permissions';
import { deleteFormFiles } from '$lib/server/storage';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user.id;

	// Get all memberships with organization data
	const memberships = await db.query.member.findMany({
		where: eq(member.userId, userId),
		with: {
			organization: true
		}
	});

	const spaceIds = memberships.map((m) => m.organizationId);

	if (spaceIds.length === 0) {
		return {
			spaces: [],
			pageHeader: undefined
		};
	}

	// Get form counts per space
	const formCounts = await db
		.select({
			organizationId: form.organizationId,
			count: sql<number>`count(*)::int`
		})
		.from(form)
		.where(inArray(form.organizationId, spaceIds))
		.groupBy(form.organizationId);

	// Get member counts per space
	const memberCounts = await db
		.select({
			organizationId: member.organizationId,
			count: sql<number>`count(*)::int`
		})
		.from(member)
		.where(inArray(member.organizationId, spaceIds))
		.groupBy(member.organizationId);

	// Create lookup maps
	const formCountMap = new Map(formCounts.map((f) => [f.organizationId, f.count]));
	const memberCountMap = new Map(memberCounts.map((m) => [m.organizationId, m.count]));

	// Combine the data
	const spaces = memberships.map((m) => ({
		...m.organization,
		role: m.role as OrganizationRole,
		formCount: formCountMap.get(m.organizationId) ?? 0,
		memberCount: memberCountMap.get(m.organizationId) ?? 0
	}));

	return {
		spaces,
		pageHeader: undefined // No back button on main spaces list
	};
};

export const actions = {
	bulkDelete: async ({ request, locals }) => {
		const userId = locals.user.id;
		const formData = await request.formData();
		const spaceIdsJson = formData.get('spaceIds') as string;

		if (!spaceIdsJson) {
			return fail(400, { message: 'No spaces selected' });
		}

		const spaceIds: string[] = JSON.parse(spaceIdsJson);

		if (spaceIds.length === 0) {
			return fail(400, { message: 'No spaces selected' });
		}

		// Verify user is owner of all selected spaces
		for (const spaceId of spaceIds) {
			const role = await getUserSpaceRole(userId, spaceId);
			if (role !== 'owner') {
				return fail(403, { message: 'You can only delete spaces you own' });
			}
		}

		// Get all forms in these spaces to clean up their files
		const formsToDelete = await db
			.select({ id: form.id })
			.from(form)
			.where(inArray(form.organizationId, spaceIds));

		// Delete files for all forms first (before DB deletion)
		if (formsToDelete.length > 0) {
			console.log(`🗑️ Deleting files for ${formsToDelete.length} forms in ${spaceIds.length} spaces`);
			const fileDeletePromises = formsToDelete.map((f) => deleteFormFiles(f.id));
			await Promise.allSettled(fileDeletePromises);
		}

		// Delete the spaces (cascade will handle members, forms, submissions in DB)
		await db.delete(organization).where(inArray(organization.id, spaceIds));

		return { success: true };
	}
} satisfies Actions;
