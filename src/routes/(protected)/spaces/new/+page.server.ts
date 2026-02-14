import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { organization, member, spaceResourceUsage, subscription } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { generateId } from 'better-auth';
import { uploadImageCollection } from '$lib/server/storage';
import { serializeImageVariants } from '$lib/types/images';
import { canCreateSpace, getUserSubscription } from '$lib/server/pricing/limits';

export const load: PageServerLoad = async ({ locals }) => {
	// Get user's subscription using pricing utility
	const userSub = await getUserSubscription(locals.user.id);

	// Get space limit check result
	const spaceCheck = await canCreateSpace(locals.user.id);

	return {
		subscription: userSub,
		currentSpaceCount: spaceCheck.currentUsage || 0,
		canCreateSpace: spaceCheck.allowed,
		limitReason: spaceCheck.reason,
		pageHeader: {
			backHref: '/spaces',
			backLabel: 'Back to Spaces'
		}
	};
};

export const actions = {
	default: async ({ request, locals }) => {
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

		// Check space creation limit using pricing utility
		const spaceCheck = await canCreateSpace(userId);

		if (!spaceCheck.allowed) {
			return fail(403, {
				name,
				error: spaceCheck.reason || 'Cannot create space at this time.'
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

			// Initialize resource usage tracking
			await db.insert(spaceResourceUsage).values({
				id: generateId(),
				organizationId: orgId,
				usedStorageMb: 0,
				submissionsThisMonth: 0,
				totalSubmissions: 0,
				activeMembers: 1,
				activeForms: 0,
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
