import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { organization, member, invitation, form, submission } from '$lib/server/db/schema';
import { eq, and, inArray, count } from 'drizzle-orm';
import {
	requireSpaceMember,
	requireSpaceAdmin,
	getUserSpaceRole
} from '$lib/server/spaces/permissions';
import { canCreateForm, getUserSubscription } from '$lib/server/pricing/limits';
import { uploadImageCollection, deleteImageCollection } from '$lib/server/storage';
import { serializeImageVariants, parseImageVariants } from '$lib/types/images';

export const load: PageServerLoad = async ({ locals, params }) => {
	const userId = locals.user.id;
	const spaceId = params.id;

	// Check if user is a member
	await requireSpaceMember(userId, spaceId);

	// Get space details
	const space = await db.query.organization.findFirst({
		where: eq(organization.id, spaceId),
		with: {
			members: {
				with: {
					user: true
				}
			}
		}
	});

	if (!space) {
		throw new Error('Space not found');
	}

	// Get user's role
	const userRole = await getUserSpaceRole(userId, spaceId);

	// Redirect non-owners to paused page if space is paused
	if (space.isPaused && userRole !== 'owner') {
		throw redirect(303, `/spaces/${spaceId}/paused`);
	}

	// Get all forms for this space
	const forms = await db.query.form.findMany({
		where: eq(form.organizationId, spaceId),
		orderBy: (form, { desc }) => [desc(form.createdAt)],
		with: {
			createdByUser: {
				columns: {
					name: true,
					email: true
				}
			}
		}
	});

	// Get unread submission counts for all forms (single efficient query)
	const unreadCounts =
		forms.length > 0
			? await db
					.select({
						formId: submission.formId,
						unreadCount: count()
					})
					.from(submission)
					.where(
						and(
							inArray(
								submission.formId,
								forms.map((f) => f.id)
							),
							eq(submission.isRead, false),
							eq(submission.isSpam, false)
						)
					)
					.groupBy(submission.formId)
			: [];

	// Create a map for O(1) lookup of unread counts
	const unreadMap = new Map(unreadCounts.map((c) => [c.formId, Number(c.unreadCount)]));

	// Attach unread counts to each form
	const formsWithCounts = forms.map((f) => ({
		...f,
		unreadCount: unreadMap.get(f.id) || 0
	}));

	// Check if user can create more forms
	const subscription = await getUserSubscription(userId);
	const formCheck = await canCreateForm(spaceId, userId);

	// Get pending invitations (only for admins)
	const isAdmin = userRole === 'owner' || userRole === 'admin';
	const pendingInvites = isAdmin
		? await db.query.invitation.findMany({
				where: and(eq(invitation.organizationId, spaceId), eq(invitation.status, 'pending')),
				orderBy: (invitation, { desc }) => [desc(invitation.createdAt)],
				with: {
					inviter: true
				}
			})
		: [];

	return {
		space,
		userRole,
		forms: formsWithCounts,
		subscription,
		canCreateForm: formCheck.allowed,
		limitReason: formCheck.reason,
		currentFormCount: formCheck.currentUsage || 0,
		maxForms: formCheck.limit,
		isOwner: userRole === 'owner',
		isAdmin,
		pendingInvites,
		pageHeader: {
			backHref: '/spaces',
			backLabel: 'Back to Spaces'
		}
	};
};

export const actions = {
	cancelInvitation: async ({ request, locals, params }) => {
		const userId = locals.user.id;
		const spaceId = params.id;

		// Only admins can cancel invitations
		await requireSpaceAdmin(userId, spaceId);

		const formData = await request.formData();
		const inviteId = formData.get('inviteId')?.toString();

		if (!inviteId) {
			return fail(400, {
				error: 'Invalid invitation ID'
			});
		}

		try {
			// Verify the invitation belongs to this space
			const invite = await db.query.invitation.findFirst({
				where: and(eq(invitation.id, inviteId), eq(invitation.organizationId, spaceId))
			});

			if (!invite) {
				return fail(404, {
					error: 'Invitation not found'
				});
			}

			// Update invitation status to cancelled
			await db
				.update(invitation)
				.set({
					status: 'cancelled',
					updatedAt: new Date()
				})
				.where(eq(invitation.id, inviteId));

			return { success: true };
		} catch (err) {
			console.error('Failed to cancel invitation:', err);
			return fail(500, {
				error: 'Failed to cancel invitation'
			});
		}
	},

	updateGeneral: async ({ request, params, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		// Verify ownership
		const space = await db.query.organization.findFirst({
			where: eq(organization.id, params.id)
		});

		if (!space) {
			return fail(404, { error: 'Space not found' });
		}

		if (space.createdBy !== locals.user.id) {
			return fail(403, { error: 'Only the space owner can update settings' });
		}

		const formData = await request.formData();
		const name = formData.get('name')?.toString();
		const logoFile = formData.get('logo') as File | null;
		const deleteLogo = formData.get('logo_delete') === 'true';

		console.log('📝 Form submission received:');
		console.log('  - Name:', name);
		console.log('  - Logo file:', logoFile ? `${logoFile.name} (${logoFile.size} bytes)` : 'null');
		console.log('  - Delete logo:', deleteLogo);
		console.log('  - Current space logo:', space.logo);

		// Validation
		if (!name || name.trim().length === 0) {
			return fail(400, {
				errors: { name: 'Name is required' },
				values: { name }
			});
		}

		if (name.trim().length > 100) {
			return fail(400, {
				errors: { name: 'Name must be less than 100 characters' },
				values: { name }
			});
		}

		// Handle logo upload/deletion
		let newLogoData = space.logo;

		if (deleteLogo && space.logo) {
			console.log('🗑️  Deleting existing logo variants');

			// Parse existing variants and delete all
			const variants = parseImageVariants(space.logo);
			if (variants.medium) {
				await deleteImageCollection(variants.medium);
			}

			newLogoData = null;
			console.log('✅ Logo variants deleted');
		} else if (logoFile && logoFile.size > 0) {
			console.log('📤 Processing and uploading new logo:', logoFile.name);

			// Delete old logo variants if they exist
			if (space.logo) {
				console.log('🗑️  Deleting old logo variants first');
				const variants = parseImageVariants(space.logo);
				if (variants.medium) {
					await deleteImageCollection(variants.medium);
				}
			}

			// Upload new logo with all variants
			try {
				console.log('🚀 Starting image processing and upload...');
				const variants = await uploadImageCollection(logoFile, 'logos', 'spaceLogo');
				newLogoData = serializeImageVariants(variants);
				console.log('✅ Upload successful! Variants:', Object.keys(variants));
			} catch (err) {
				console.error('❌ Logo upload failed:', err);
				return fail(500, {
					errors: { logo: 'Failed to upload logo' },
					values: { name }
				});
			}
		} else {
			console.log('ℹ️  No logo changes detected');
		}

		// Update space
		try {
			console.log('💾 Updating database with:');
			console.log('  - Name:', name.trim());
			console.log('  - Logo data:', newLogoData ? 'JSON with variants' : 'null');

			await db
				.update(organization)
				.set({
					name: name.trim(),
					logo: newLogoData,
					updatedAt: new Date()
				})
				.where(eq(organization.id, params.id));

			console.log('✅ Database updated successfully');
			return { success: true, message: 'Settings updated successfully' };
		} catch (err) {
			console.error('❌ Failed to update space:', err);
			return fail(500, {
				errors: { general: 'Failed to update settings' }
			});
		}
	},

	toggleClientOwned: async ({ request, params, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		// Verify ownership
		const space = await db.query.organization.findFirst({
			where: eq(organization.id, params.id)
		});

		if (!space) {
			return fail(404, { error: 'Space not found' });
		}

		if (space.createdBy !== locals.user.id) {
			return fail(403, { error: 'Only the space owner can change privacy settings' });
		}

		const formData = await request.formData();
		const isClientOwned = formData.get('isClientOwned') === 'true';

		try {
			await db
				.update(organization)
				.set({
					isClientOwned,
					updatedAt: new Date()
				})
				.where(eq(organization.id, params.id));

			return { success: true };
		} catch (err) {
			console.error('Failed to toggle client-owned mode:', err);
			return fail(500, { error: 'Failed to update privacy settings' });
		}
	},

	togglePaused: async ({ request, params, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		// Verify ownership
		const space = await db.query.organization.findFirst({
			where: eq(organization.id, params.id)
		});

		if (!space) {
			return fail(404, { error: 'Space not found' });
		}

		if (space.createdBy !== locals.user.id) {
			return fail(403, { error: 'Only the space owner can pause/unpause spaces' });
		}

		const formData = await request.formData();
		const isPaused = formData.get('isPaused') === 'true';

		try {
			await db
				.update(organization)
				.set({
					isPaused,
					updatedAt: new Date()
				})
				.where(eq(organization.id, params.id));

			return { success: true };
		} catch (err) {
			console.error('Failed to toggle paused status:', err);
			return fail(500, { error: 'Failed to update paused status' });
		}
	},

	deleteSpace: async ({ request, params, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		// Verify ownership
		const space = await db.query.organization.findFirst({
			where: eq(organization.id, params.id)
		});

		if (!space) {
			return fail(404, { error: 'Space not found' });
		}

		if (space.createdBy !== locals.user.id) {
			return fail(403, { error: 'Only the space owner can delete this space' });
		}

		const formData = await request.formData();
		const confirmName = formData.get('confirmName')?.toString()?.toLowerCase();

		console.log('🗑️ Delete space request:', {
			spaceId: params.id,
			spaceName: space.name,
			confirmName,
			match: confirmName === space.name.toLowerCase()
		});

		// Require exact match of space name in lowercase
		if (confirmName !== space.name.toLowerCase()) {
			return fail(400, {
				error: 'Space name confirmation does not match. Please type the exact space name in lowercase.'
			});
		}

		// Delete space logo if it exists
		if (space.logo) {
			console.log('🖼️ Deleting space logo...');
			try {
				const variants = parseImageVariants(space.logo);
				if (variants.medium) {
					await deleteImageCollection(variants.medium);
					console.log('✅ Logo deleted successfully');
				}
			} catch (logoErr) {
				console.error('⚠️ Failed to delete logo (continuing anyway):', logoErr);
				// Don't fail the whole operation if logo deletion fails
			}
		}

		// Delete the space (cascade will delete forms, submissions, members, etc.)
		try {
			console.log('🗄️ Deleting space from database...');
			await db.delete(organization).where(eq(organization.id, params.id));
			console.log('✅ Space deleted successfully');
		} catch (err) {
			console.error('❌ Failed to delete space from database:', err);
			const errorMessage = err instanceof Error ? err.message : 'Unknown error';
			return fail(500, {
				error: `Failed to delete space: ${errorMessage}`
			});
		}

		// Redirect to spaces page with success message
		throw redirect(303, '/spaces?deleted=true');
	}
} satisfies Actions;
