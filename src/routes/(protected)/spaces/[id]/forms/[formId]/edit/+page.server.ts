import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { form, organization } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { requireSpaceMember } from '$lib/server/spaces/permissions';
import { getUserSubscription } from '$lib/server/pricing/limits';

export const load: PageServerLoad = async ({ locals, params }) => {
	const userId = locals.user.id;
	const spaceId = params.id;
	const formId = params.formId;

	// Check if user is a member
	await requireSpaceMember(userId, spaceId);

	// Get space details
	const space = await db.query.organization.findFirst({
		where: eq(organization.id, spaceId)
	});

	if (!space) {
		throw error(404, 'Space not found');
	}

	// Get form details
	const formData = await db.query.form.findFirst({
		where: eq(form.id, formId),
		with: {
			createdByUser: {
				columns: {
					name: true,
					email: true,
					image: true
				}
			}
		}
	});

	if (!formData) {
		throw error(404, 'Form not found');
	}

	// Verify form belongs to this space
	if (formData.organizationId !== spaceId) {
		throw error(404, 'Form not found');
	}

	// Get subscription for tier-based limits
	const subscription = await getUserSubscription(userId);

	return {
		space,
		form: formData,
		subscription,
		pageHeader: {
			backHref: `/spaces/${spaceId}/forms/${formId}`,
			backLabel: 'Back to Form'
		}
	};
};

export const actions = {
	default: async ({ request, locals, params }) => {
		const userId = locals.user.id;
		const spaceId = params.id;
		const formId = params.formId;

		// Verify user is a member
		await requireSpaceMember(userId, spaceId);

		// Get existing form
		const existingForm = await db.query.form.findFirst({
			where: eq(form.id, formId)
		});

		if (!existingForm || existingForm.organizationId !== spaceId) {
			throw error(404, 'Form not found');
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

		// Validate webhook URL if provided
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

		try {
			await db
				.update(form)
				.set({
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
					successMessage:
						successMessage?.trim() || 'Thank you! Your submission has been received.',
					webhookUrl: webhookUrl || null,
					sendEmailNotifications,
					notificationEmails: notificationEmailsJson || null,
					updatedAt: new Date()
				})
				.where(eq(form.id, formId));
		} catch (err) {
			console.error('Failed to update form:', err);
			return fail(500, {
				name,
				error: 'Failed to update form. Please try again.'
			});
		}

		throw redirect(303, `/spaces/${spaceId}/forms/${formId}`);
	}
} satisfies Actions;
