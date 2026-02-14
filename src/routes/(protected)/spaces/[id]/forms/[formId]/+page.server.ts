import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { form, organization, submission } from '$lib/server/db/schema';
import { eq, desc, inArray, and, count, asc, or, like } from 'drizzle-orm';
import { error, redirect, json } from '@sveltejs/kit';
import { requireSpaceMember } from '$lib/server/spaces/permissions';

export const load: PageServerLoad = async ({ locals, params, url }) => {
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

	// Tab selection (submissions vs spam)
	const tab = url.searchParams.get('tab') || 'submissions';
	const showSpam = tab === 'spam';

	// Pagination, sorting, and filter params from URL
	const page = parseInt(url.searchParams.get('page') || '1');
	const perPage = parseInt(url.searchParams.get('perPage') || '50');
	const sortBy = url.searchParams.get('sortBy') || 'createdAt';
	const sortOrder = url.searchParams.get('sortOrder') || 'desc';
	const filter = url.searchParams.get('filter') || '';

	// Validate perPage
	const validPerPage = [10, 20, 50, 100, 200].includes(perPage) ? perPage : 50;

	// Validate sortBy
	const validSortFields = ['email', 'name', 'createdAt', 'status'];
	const validSortBy = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

	// Build order by clause
	const orderByField = submission[validSortBy as keyof typeof submission];
	const orderByClause = sortOrder === 'asc' ? [asc(orderByField)] : [desc(orderByField)];

	// Base condition for this form
	const baseCondition = eq(submission.formId, formId);

	// Spam filter condition (isSpam defaults to false, so no null check needed)
	const spamCondition = showSpam
		? eq(submission.isSpam, true)
		: eq(submission.isSpam, false);

	// Build where clause with optional text filter
	const whereClause = filter
		? and(
				baseCondition,
				spamCondition,
				or(
					like(submission.name, `%${filter}%`),
					like(submission.email, `%${filter}%`)
				)
		  )
		: and(baseCondition, spamCondition);

	// Get total counts for both tabs
	const [{ value: submissionsCount }] = await db
		.select({ value: count() })
		.from(submission)
		.where(and(baseCondition, eq(submission.isSpam, false)));

	const [{ value: spamCount }] = await db
		.select({ value: count() })
		.from(submission)
		.where(and(baseCondition, eq(submission.isSpam, true)));

	// Get current tab count for pagination
	const totalCount = showSpam ? spamCount : submissionsCount;

	// Get submissions for this form with pagination, sorting, and filtering
	const submissions = await db.query.submission.findMany({
		where: whereClause,
		orderBy: orderByClause,
		limit: validPerPage,
		offset: (page - 1) * validPerPage
	});

	return {
		space,
		form: formData,
		submissions,
		submissionsCount,
		spamCount,
		activeTab: tab,
		pagination: {
			page,
			perPage: validPerPage,
			totalPages: Math.ceil(totalCount / validPerPage),
			totalCount
		},
		sorting: {
			sortBy: validSortBy,
			sortOrder
		},
		pageHeader: {
			backHref: `/spaces/${spaceId}`,
			backLabel: 'Back to Space'
		}
	};
};

export const actions: Actions = {
	delete: async ({ locals, params }) => {
		const userId = locals.user.id;
		const spaceId = params.id;
		const formId = params.formId;

		// Check if user is a member
		await requireSpaceMember(userId, spaceId);

		// Get form to verify it exists and belongs to this space
		const formData = await db.query.form.findFirst({
			where: eq(form.id, formId)
		});

		if (!formData) {
			throw error(404, 'Form not found');
		}

		if (formData.organizationId !== spaceId) {
			throw error(403, 'Unauthorized');
		}

		// Delete the form (cascade will delete related submissions)
		await db.delete(form).where(eq(form.id, formId));

		// Redirect to forms list
		throw redirect(303, `/spaces/${spaceId}?tab=forms`);
	},

	bulkUpdateStatus: async ({ locals, params, request }) => {
		const userId = locals.user.id;
		const spaceId = params.id;
		const formId = params.formId;

		// Check if user is a member
		await requireSpaceMember(userId, spaceId);

		const formData = await request.formData();
		const submissionIds = JSON.parse(formData.get('submissionIds')?.toString() || '[]');
		const statusValue = formData.get('status')?.toString();
		const status = statusValue && statusValue !== '' ? (statusValue as 'new' | 'read' | 'resolved') : undefined;
		const isSpamValue = formData.get('isSpam')?.toString();
		const isSpam = isSpamValue === 'true';
		const notSpamValue = formData.get('notSpam')?.toString();
		const notSpam = notSpamValue === 'true';

		console.log('Bulk update - Received:', { submissionIds, status, isSpam, notSpam, isSpamValue, notSpamValue });

		if (!submissionIds || submissionIds.length === 0) {
			return { success: false, error: 'No submissions selected' };
		}

		if (!status && !isSpam && !notSpam) {
			return { success: false, error: 'Invalid status' };
		}

		try {
			const updateData: any = { updatedAt: new Date() };

			if (status) {
				// When updating status, reset spam flag
				updateData.status = status;
				updateData.isSpam = false;
			}

			if (isSpam) {
				// When marking as spam, don't change status
				updateData.isSpam = true;
			}

			if (notSpam) {
				// When unmarking spam, set to new status
				updateData.isSpam = false;
				updateData.status = 'new';
			}

			console.log('Bulk update - Update data:', updateData);

			await db
				.update(submission)
				.set(updateData)
				.where(
					and(
						eq(submission.formId, formId),
						inArray(submission.id, submissionIds)
					)
				);

			return { success: true };
		} catch (err) {
			console.error('Failed to update submissions:', err);
			return { success: false, error: 'Failed to update submissions' };
		}
	},

	bulkDelete: async ({ locals, params, request }) => {
		const userId = locals.user.id;
		const spaceId = params.id;
		const formId = params.formId;

		// Check if user is a member
		await requireSpaceMember(userId, spaceId);

		const formData = await request.formData();
		const submissionIds = JSON.parse(formData.get('submissionIds')?.toString() || '[]');

		if (!submissionIds || submissionIds.length === 0) {
			return { success: false, error: 'No submissions selected' };
		}

		try {
			// Delete all selected submissions
			await db
				.delete(submission)
				.where(
					and(
						eq(submission.formId, formId),
						inArray(submission.id, submissionIds)
					)
				);

			return { success: true };
		} catch (err) {
			console.error('Failed to delete submissions:', err);
			return { success: false, error: 'Failed to delete submissions' };
		}
	},

	deleteSubmission: async ({ locals, params, request }) => {
		const userId = locals.user.id;
		const spaceId = params.id;
		const formId = params.formId;

		// Check if user is a member
		await requireSpaceMember(userId, spaceId);

		const formData = await request.formData();
		const submissionId = formData.get('submissionId')?.toString();

		if (!submissionId) {
			return { success: false, error: 'Submission ID required' };
		}

		try {
			// Delete the submission (verify it belongs to this form)
			await db
				.delete(submission)
				.where(
					and(
						eq(submission.id, submissionId),
						eq(submission.formId, formId)
					)
				);

			return { success: true };
		} catch (err) {
			console.error('Failed to delete submission:', err);
			return { success: false, error: 'Failed to delete submission' };
		}
	},

	exportSubmissions: async ({ locals, params, request }) => {
		const userId = locals.user.id;
		const spaceId = params.id;
		const formId = params.formId;

		// Check if user is a member
		await requireSpaceMember(userId, spaceId);

		const formData = await request.formData();
		const format = formData.get('format')?.toString() || 'csv';
		const includeSpam = formData.get('includeSpam')?.toString() === 'true';

		try {
			// Get all submissions for this form
			const whereClause = includeSpam
				? eq(submission.formId, formId)
				: and(eq(submission.formId, formId), eq(submission.isSpam, false));

			const submissions = await db.query.submission.findMany({
				where: whereClause,
				orderBy: [desc(submission.createdAt)]
			});

			return {
				success: true,
				submissions: submissions.map((s) => ({
					id: s.id,
					name: s.name,
					email: s.email,
					status: s.status,
					isSpam: s.isSpam,
					data: s.data,
					files: s.files,
					createdAt: s.createdAt,
					ipAddress: s.ipAddress,
					device: s.device,
					browser: s.browser,
					os: s.os
				})),
				format
			};
		} catch (err) {
			console.error('Failed to export submissions:', err);
			return { success: false, error: 'Failed to export submissions' };
		}
	}
};
