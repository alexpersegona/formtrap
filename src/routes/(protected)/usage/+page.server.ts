import type { PageServerLoad } from './$types';
import { getCurrentUsage, getUserSubscription, getSpaceUsageWithLimits } from '$lib/server/pricing/limits';
import { getUserSpaceAllocations } from '$lib/server/pricing/allocations';
import { db } from '$lib/server/db';
import { member, organization, form } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user.id;

	try {
		// Get allocations first (needed by getSpaceUsageWithLimits)
		const allocations = await getUserSpaceAllocations(userId);

		// Get subscription, overall usage, and per-space usage in parallel
		const [subscription, usage, spaceUsages] = await Promise.all([
			getUserSubscription(userId),
			getCurrentUsage(userId),
			getSpaceUsageWithLimits(userId, allocations)
		]);

		// Get per-space details for forms and users
		const userSpaces = await db.query.member.findMany({
			where: eq(member.userId, userId),
			with: {
				organization: true
			}
		});

		const spaceDetails = await Promise.all(
			userSpaces.map(async (membership) => {
				const [formCount, memberCount] = await Promise.all([
					db.query.form.findMany({
						where: eq(form.organizationId, membership.organizationId)
					}),
					db.query.member.findMany({
						where: eq(member.organizationId, membership.organizationId)
					})
				]);

				return {
					id: membership.organizationId,
					name: membership.organization.name,
					formCount: formCount.length,
					memberCount: memberCount.length
				};
			})
		);

		return {
			subscription,
			usage,
			spaceDetails,
			spaceUsages,
			allocations,
			pageHeader: {
				backHref: '/dashboard',
				backLabel: 'Back to Dashboard'
			}
		};
	} catch (error) {
		console.error('Error loading usage data:', error);
		throw error;
	}
};
