import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { organization, member, connection } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { generateId } from 'better-auth';
import { uploadImageCollection } from '$lib/server/storage';
import { serializeImageVariants } from '$lib/types/images';
import { isFreeTrial } from '$lib/server/form-db';
import { PLAN_LIMITS } from '$lib/server/pricing/constants';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(303, '/login');
	const userId = locals.user.id;

	// Check space limit
	const freeTrial = await isFreeTrial(userId);
	const userSpaces = await db.query.member.findMany({
		where: eq(member.userId, userId)
	});
	const currentSpaceCount = userSpaces.length;

	const maxSpaces = freeTrial ? PLAN_LIMITS.free.maxSpaces : PLAN_LIMITS.pro.maxSpaces;
	const canCreate = currentSpaceCount < maxSpaces;
	const limitReason = canCreate
		? undefined
		: freeTrial
			? `Free trial is limited to ${PLAN_LIMITS.free.maxSpaces} space. Connect your infrastructure to create more.`
			: `You have reached the maximum of ${PLAN_LIMITS.pro.maxSpaces} spaces.`;

	return {
		currentSpaceCount,
		canCreateSpace: canCreate,
		limitReason,
		freeTrial,
		pageHeader: {
			backHref: '/spaces',
			backLabel: 'Back to Spaces'
		}
	};
};

export const actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) throw redirect(303, '/login');
		const userId = locals.user.id;
		const formData = await request.formData();

		const name = formData.get('name');
		const logoFile = formData.get('logo') as File | null;
		const isClientOwned = formData.get('isClientOwned') === 'on';

		const errors: Record<string, string> = {};

		// Validation: Name
		if (!name || typeof name !== 'string' || name.trim().length === 0) {
			errors.name = 'Space name is required';
		} else if (name.length > 100) {
			errors.name = 'Space name must be less than 100 characters';
		}

		// Return early if validation errors
		if (Object.keys(errors).length > 0) {
			return fail(400, { errors, name });
		}

		// Check space creation limit
		const freeTrial = await isFreeTrial(userId);
		const userSpaces = await db.query.member.findMany({
			where: eq(member.userId, userId)
		});
		const maxSpaces = freeTrial ? PLAN_LIMITS.free.maxSpaces : PLAN_LIMITS.pro.maxSpaces;

		if (userSpaces.length >= maxSpaces) {
			return fail(403, {
				name,
				error: freeTrial
					? `Free trial is limited to ${PLAN_LIMITS.free.maxSpaces} space. Connect your infrastructure to create more.`
					: `You have reached the maximum of ${PLAN_LIMITS.pro.maxSpaces} spaces.`
			});
		}

		// Handle logo upload
		let logoData: string | null = null;
		if (logoFile && logoFile.size > 0) {
			try {
				const variants = await uploadImageCollection(logoFile, 'logos', 'spaceLogo');
				logoData = serializeImageVariants(variants);
			} catch (err) {
				console.error('Failed to upload logo:', err);
				return fail(500, {
					errors: { logo: 'Failed to upload logo. Please try again.' },
					name
				});
			}
		}

		try {
			const orgId = generateId();

			// Create organization (space)
			await db.insert(organization).values({
				id: orgId,
				name: name.trim(),
				logo: logoData,
				createdBy: userId,
				isClientOwned,
				privacyIndicatorEnabled: true,
				createdAt: new Date(),
				updatedAt: new Date()
			});

			// Add creator as owner
			await db.insert(member).values({
				id: generateId(),
				organizationId: orgId,
				userId,
				role: 'owner',
				createdAt: new Date(),
				updatedAt: new Date()
			});

			// Redirect to the new space
			throw redirect(303, `/spaces/${orgId}`);
		} catch (err) {
			console.error('Failed to create space:', err);

			// Re-throw redirects
			if (err && typeof err === 'object' && 'status' in err && err.status === 303) {
				throw err;
			}

			return fail(500, {
				name,
				error: 'Failed to create space. Please try again.'
			});
		}
	}
} satisfies Actions;
