import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { form, organization } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { canCreateForm, getUserSubscription } from '$lib/server/pricing/limits';
import { nanoid } from 'nanoid';

export const load: PageServerLoad = async ({ locals, params }) => {
	const userId = locals.user.id;
	const spaceId = params.id;

	// Get space details
	const space = await db.query.organization.findFirst({
		where: eq(organization.id, spaceId)
	});

	if (!space) {
		throw error(404, 'Space not found');
	}

	// Check if user can create forms
	const subscription = await getUserSubscription(userId);
	const formCheck = await canCreateForm(spaceId, userId);

	return {
		space,
		subscription,
		canCreateForm: formCheck.allowed,
		limitReason: formCheck.reason,
		currentFormCount: formCheck.currentUsage || 0,
		pageHeader: {
			backHref: `/spaces/${spaceId}?tab=forms`,
			backLabel: 'Back to Forms'
		}
	};
};

export const actions = {
	default: async ({ request, locals, params }) => {
		const userId = locals.user.id;
		const spaceId = params.id;

		// Check form creation limit
		const formCheck = await canCreateForm(spaceId, userId);
		if (!formCheck.allowed) {
			return fail(403, {
				error: formCheck.reason || 'Cannot create form at this time.'
			});
		}

		const formData = await request.formData();
		const name = formData.get('name')?.toString();
		const description = formData.get('description')?.toString();
		const isActive = formData.get('isActive') === 'on';
		const allowFileUploads = formData.get('allowFileUploads') === 'on';
		const maxFileCount = parseInt(formData.get('maxFileCount')?.toString() || '3');
		const maxFileSize = parseInt(formData.get('maxFileSize')?.toString() || '10485760');
		const allowedFileTypes = formData.get('allowedFileTypes')?.toString();
		const spamCheckEnabled = formData.get('spamCheckEnabled') === 'on';
		const honeypotFieldName = formData.get('honeypotFieldName')?.toString();
		const responseType = formData.get('responseType')?.toString();
		const redirectUrl = formData.get('redirectUrl')?.toString();
		const successMessage = formData.get('successMessage')?.toString();
		const webhookUrl = formData.get('webhookUrl')?.toString();
		const sendEmailNotifications = formData.get('sendEmailNotifications') === 'on';
		const notificationEmailsJson = formData.get('notificationEmailsJson')?.toString();

		// Validation
		if (!name || name.trim().length === 0) {
			return fail(400, {
				name,
				error: 'Form name is required'
			});
		}

		if (name.length > 100) {
			return fail(400, {
				name,
				error: 'Form name must be 100 characters or less'
			});
		}

		// Validate response type
		if (!responseType || !['redirect', 'json'].includes(responseType)) {
			return fail(400, {
				name,
				error: 'Invalid response type'
			});
		}

		// Validate redirect URL if response type is redirect
		if (responseType === 'redirect') {
			if (!redirectUrl || redirectUrl.trim().length === 0) {
				return fail(400, {
					name,
					error: 'Redirect URL is required when response type is redirect'
				});
			}
			try {
				new URL(redirectUrl);
			} catch {
				return fail(400, {
					name,
					redirectUrl,
					error: 'Invalid redirect URL'
				});
			}
		}

		// Validate success message if response type is json
		if (responseType === 'json') {
			if (!successMessage || successMessage.trim().length === 0) {
				return fail(400, {
					name,
					error: 'Success message is required when response type is JSON'
				});
			}
		}

		// Validate max file count
		if (maxFileCount < 1 || maxFileCount > 25) {
			return fail(400, {
				name,
				error: 'Max file count must be between 1 and 25'
			});
		}

		// Validate webhook URL if provided (Pro feature check happens client-side for now)
		if (webhookUrl && webhookUrl.length > 0) {
			try {
				new URL(webhookUrl);
			} catch {
				return fail(400, {
					name,
					webhookUrl,
					error: 'Invalid webhook URL'
				});
			}
		}

		const formId = nanoid();

		try {
			await db.insert(form).values({
				id: formId,
				organizationId: spaceId,
				name: name.trim(),
				description: description?.trim() || null,
				isActive,
				allowFileUploads,
				maxFileCount,
				maxFileSize,
				allowedFileTypes: allowedFileTypes || null,
				spamCheckEnabled,
				honeypotFieldName: honeypotFieldName?.trim() || 'website',
				responseType: responseType as 'redirect' | 'json',
				redirectUrl: redirectUrl?.trim() || null,
				successMessage: successMessage?.trim() || 'Thank you! Your submission has been received.',
				webhookUrl: webhookUrl || null,
				sendEmailNotifications,
				notificationEmails: notificationEmailsJson || null,
				createdBy: userId,
				createdAt: new Date(),
				updatedAt: new Date()
			});
		} catch (err) {
			console.error('Failed to create form:', err);
			return fail(500, {
				name,
				error: 'Failed to create form. Please try again.'
			});
		}

		throw redirect(303, `/spaces/${spaceId}/forms/${formId}`);
	}
} satisfies Actions;
