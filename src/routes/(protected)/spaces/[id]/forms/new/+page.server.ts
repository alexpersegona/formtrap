import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { organization, formEndpoint } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { nanoid } from 'nanoid';
import { generateId } from 'better-auth';
import { getFormDb, isFreeTrial } from '$lib/server/form-db';
import { PLAN_LIMITS } from '$lib/server/pricing/constants';
import { getUserSubscription } from '$lib/server/pricing/subscription';

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

	// Get user subscription for tier-based limits
	const userSubscription = await getUserSubscription(userId);

	// Check form creation limits (only for free trial users)
	const freeTrial = await isFreeTrial(userId);
	let canCreateFormResult = true;
	let limitReason: string | undefined;

	if (freeTrial) {
		const formDb = await getFormDb(userId);
		const { form } = formDb.schema;
		const existingForms = await formDb.db.query.form.findMany({
			where: eq(form.organizationId, spaceId)
		});
		if (existingForms.length >= PLAN_LIMITS.free.maxFormsPerSpace) {
			canCreateFormResult = false;
			limitReason = `Free trial is limited to ${PLAN_LIMITS.free.maxFormsPerSpace} form. Connect your infrastructure for unlimited forms.`;
		}
	}

	return {
		space,
		canCreateForm: canCreateFormResult,
		limitReason,
		freeTrial,
		subscription: userSubscription,
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

		// Check form creation limit for free trial users
		const freeTrial = await isFreeTrial(userId);
		if (freeTrial) {
			const formDb = await getFormDb(userId);
			const { form: formTable } = formDb.schema;
			const existingForms = await formDb.db.query.form.findMany({
				where: eq(formTable.organizationId, spaceId)
			});
			if (existingForms.length >= PLAN_LIMITS.free.maxFormsPerSpace) {
				return fail(403, {
					error: `Free trial is limited to ${PLAN_LIMITS.free.maxFormsPerSpace} form. Connect your infrastructure for unlimited forms.`
				});
			}
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
			// Insert form into the appropriate DB
			const formDb = await getFormDb(userId);
			const { form } = formDb.schema;

			await formDb.db.insert(form).values({
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

			// Insert formEndpoint into FormTrap's platform DB (for Go API routing)
			try {
				await db.insert(formEndpoint).values({
					id: generateId(),
					formId,
					userId,
					organizationId: spaceId,
					isActive,
					createdAt: new Date(),
					updatedAt: new Date()
				});
			} catch (endpointErr) {
				// If endpoint creation fails, rollback the form
				console.error('Failed to create form endpoint, rolling back form:', endpointErr);
				await formDb.db.delete(form).where(eq(form.id, formId));
				return fail(500, {
					name,
					error: 'Failed to create form. Please try again.'
				});
			}
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
