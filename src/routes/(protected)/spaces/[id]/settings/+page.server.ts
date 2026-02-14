import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { organization, form } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { uploadImageCollection, deleteImageCollection, deleteFormFiles } from '$lib/server/storage';
import { serializeImageVariants, parseImageVariants } from '$lib/types/images';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	// Get the space with creator info
	const space = await db.query.organization.findFirst({
		where: eq(organization.id, params.id),
		with: {
			createdByUser: true
		}
	});

	if (!space) {
		throw error(404, 'Space not found');
	}

	// OWNER-ONLY ACCESS: Only the creator can access settings
	if (space.createdBy !== locals.user.id) {
		throw error(403, 'Only the space owner can access settings');
	}

	return {
		space: {
			id: space.id,
			name: space.name,
			logo: space.logo,
			isClientOwned: space.isClientOwned,
			isPaused: space.isPaused,
			createdAt: space.createdAt
		},
		pageHeader: {
			backHref: `/spaces/${params.id}`,
			backLabel: 'Back to Space'
		}
	};
};

export const actions = {
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

		// Get all forms in this space to clean up their files
		const formsToDelete = await db
			.select({ id: form.id })
			.from(form)
			.where(eq(form.organizationId, params.id));

		// Delete files for all forms first (before DB deletion)
		if (formsToDelete.length > 0) {
			console.log(`🗑️ Deleting files for ${formsToDelete.length} forms...`);
			try {
				const fileDeletePromises = formsToDelete.map((f) => deleteFormFiles(f.id));
				await Promise.allSettled(fileDeletePromises);
				console.log('✅ Form files deleted');
			} catch (filesErr) {
				console.error('⚠️ Failed to delete some form files (continuing anyway):', filesErr);
			}
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

		// Delete the space (cascade will delete forms, submissions, members in DB)
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
