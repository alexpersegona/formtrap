import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { user as userTable } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { uploadImageCollection, deleteImageCollection } from '$lib/server/storage';
import { serializeImageVariants, parseImageVariants } from '$lib/types/images';
import * as v from 'valibot';
import { profileSchema } from '$lib/validation/auth';

export const load: PageServerLoad = async ({ locals }) => {
	return {
		user: locals.user
	};
};

export const actions = {
	updateProfile: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const formData = await request.formData();
		const name = formData.get('name');
		const email = formData.get('email');
		const imageFile = formData.get('image') as File | null;
		const imageDelete = formData.get('image_delete') === 'true';

		// Validate with Valibot
		const result = v.safeParse(profileSchema, { name, email });

		if (!result.success) {
			const errors: Record<string, string> = {};
			for (const issue of result.issues) {
				if (issue.path) {
					const key = issue.path[0].key as string;
					errors[key] = issue.message;
				}
			}
			return fail(400, {
				errors,
				values: {
					name: name as string,
					email: email as string
				}
			});
		}

		// Check if email is already taken by another user
		if (result.output.email !== locals.user.email) {
			const existingUser = await db.query.user.findFirst({
				where: eq(userTable.email, result.output.email)
			});

			if (existingUser && existingUser.id !== locals.user.id) {
				return fail(400, {
					errors: { email: 'Email is already taken' },
					values: {
						name: result.output.name,
						email: result.output.email
					}
				});
			}
		}

		// Handle image deletion and upload
		let imageData = locals.user.image;

		if (imageDelete && locals.user.image) {
			// Delete all variants from R2 storage
			const existingVariants = parseImageVariants(locals.user.image);
			const anyVariantUrl = existingVariants.thumbnail || existingVariants.regular || existingVariants.small || existingVariants.medium;

			if (anyVariantUrl) {
				try {
					await deleteImageCollection(anyVariantUrl);
					console.log('✅ Deleted old avatar from R2');
				} catch (err) {
					// Log error but continue - don't fail profile update if file deletion fails
					if (process.env.NODE_ENV === 'development') {
						console.error('❌ Failed to delete old avatar:', err);
					}
				}
			}
			imageData = null;
		} else if (imageFile && imageFile.size > 0) {
			// Validate file type
			if (!imageFile.type.startsWith('image/')) {
				return fail(400, {
					errors: { image: 'File must be an image' },
					values: {
						name: name as string,
						email: email as string
					}
				});
			}

			// Validate file size (max 5MB)
			if (imageFile.size > 5 * 1024 * 1024) {
				return fail(400, {
					errors: { image: 'Image must be less than 5MB' },
					values: {
						name: name as string,
						email: email as string
					}
				});
			}

			// Delete old image if it exists
			if (locals.user.image) {
				const existingVariants = parseImageVariants(locals.user.image);
				const anyVariantUrl = existingVariants.thumbnail || existingVariants.regular || existingVariants.small || existingVariants.medium;

				if (anyVariantUrl) {
					try {
						await deleteImageCollection(anyVariantUrl);
						console.log('✅ Deleted old avatar before uploading new one');
					} catch (err) {
						console.error('❌ Failed to delete old avatar:', err);
					}
				}
			}

			// Upload new avatar with all variants (thumbnail, thumbnail@2x, regular, regular@2x)
			try {
				console.log('🚀 Starting avatar processing and upload...');
				const variants = await uploadImageCollection(imageFile, 'avatars', 'avatar');
				imageData = serializeImageVariants(variants);
				console.log('✅ Avatar upload successful! Variants:', Object.keys(variants));
			} catch (err) {
				console.error('❌ Avatar upload failed:', err);
				return fail(500, {
					errors: { image: 'Failed to upload avatar' },
					values: {
						name: name as string,
						email: email as string
					}
				});
			}
		}

		// Update user in database
		await db
			.update(userTable)
			.set({
				name: result.output.name,
				email: result.output.email,
				image: imageData,
				updatedAt: new Date()
			})
			.where(eq(userTable.id, locals.user.id));

		return {
			success: true,
			message: 'Profile updated successfully'
		};
	}
} satisfies Actions;
