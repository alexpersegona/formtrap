import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { organization } from '$lib/server/db/schema';
import { eq, desc, inArray, and, count, asc, or, like, gte, lte } from 'drizzle-orm';
import { error, redirect } from '@sveltejs/kit';
import { requireSpaceMember } from '$lib/server/spaces/permissions';
import { getFormDb } from '$lib/server/form-db';
import { deleteSubmissionFiles, deleteFormFiles } from '$lib/server/storage';

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

	// Use the appropriate DB for form/submission queries
	const formDb = await getFormDb(userId);
	const { form, submission } = formDb.schema;

	// Get form details
	const formData = await formDb.db.query.form.findFirst({
		where: eq(form.id, formId)
	});

	if (!formData) {
		throw error(404, 'Form not found');
	}

	// Verify form belongs to this space
	if (formData.organizationId !== spaceId) {
		throw error(404, 'Form not found');
	}

	// Filter selection: all | unread | resolved | archived | spam
	const filter = (url.searchParams.get('filter') || 'all') as 'all' | 'unread' | 'resolved' | 'archived' | 'spam';

	// Date range params
	const dateFrom = url.searchParams.get('dateFrom');
	const dateTo = url.searchParams.get('dateTo');

	// Pagination and sorting params
	const page = parseInt(url.searchParams.get('page') || '1');
	const perPage = parseInt(url.searchParams.get('perPage') || '50');
	const sortBy = url.searchParams.get('sortBy') || 'createdAt';
	const sortOrder = url.searchParams.get('sortOrder') || 'desc';
	const textFilter = url.searchParams.get('search') || '';

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

	// Build filter condition based on selected filter
	let filterCondition;
	switch (filter) {
		case 'unread':
			// Unread = status is 'new', not spam, not archived
			filterCondition = and(
				baseCondition,
				eq(submission.status, 'new'),
				eq(submission.isSpam, false),
				eq(submission.isArchived, false)
			);
			break;
		case 'resolved':
			// Resolved = status is 'resolved', not spam, not archived
			filterCondition = and(
				baseCondition,
				eq(submission.status, 'resolved'),
				eq(submission.isSpam, false),
				eq(submission.isArchived, false)
			);
			break;
		case 'archived':
			// Archived items (regardless of spam status)
			filterCondition = and(
				baseCondition,
				eq(submission.isArchived, true)
			);
			break;
		case 'spam':
			// Spam items (not archived)
			filterCondition = and(
				baseCondition,
				eq(submission.isSpam, true),
				eq(submission.isArchived, false)
			);
			break;
		default: // 'all'
			// All = not spam, not archived
			filterCondition = and(
				baseCondition,
				eq(submission.isSpam, false),
				eq(submission.isArchived, false)
			);
	}

	// Add date range filtering if provided
	if (dateFrom) {
		filterCondition = and(filterCondition, gte(submission.createdAt, new Date(dateFrom)));
	}
	if (dateTo) {
		// Add 1 day to include the end date fully
		const endDate = new Date(dateTo);
		endDate.setDate(endDate.getDate() + 1);
		filterCondition = and(filterCondition, lte(submission.createdAt, endDate));
	}

	// Add text search filtering if provided
	if (textFilter) {
		filterCondition = and(
			filterCondition,
			or(
				like(submission.name, `%${textFilter}%`),
				like(submission.email, `%${textFilter}%`)
			)
		);
	}

	// Get counts for all filters (without date range, for badges)
	const [{ value: allCount }] = await formDb.db
		.select({ value: count() })
		.from(submission)
		.where(and(baseCondition, eq(submission.isSpam, false), eq(submission.isArchived, false)));

	const [{ value: unreadCount }] = await formDb.db
		.select({ value: count() })
		.from(submission)
		.where(and(
			baseCondition,
			eq(submission.status, 'new'),
			eq(submission.isSpam, false),
			eq(submission.isArchived, false)
		));

	const [{ value: resolvedCount }] = await formDb.db
		.select({ value: count() })
		.from(submission)
		.where(and(
			baseCondition,
			eq(submission.status, 'resolved'),
			eq(submission.isSpam, false),
			eq(submission.isArchived, false)
		));

	const [{ value: archivedCount }] = await formDb.db
		.select({ value: count() })
		.from(submission)
		.where(and(baseCondition, eq(submission.isArchived, true)));

	const [{ value: spamCount }] = await formDb.db
		.select({ value: count() })
		.from(submission)
		.where(and(baseCondition, eq(submission.isSpam, true), eq(submission.isArchived, false)));

	// Get count for current filter (with date range, for pagination)
	const [{ value: filteredCount }] = await formDb.db
		.select({ value: count() })
		.from(submission)
		.where(filterCondition);

	// Get submissions for this form with pagination, sorting, and filtering
	const submissions = await formDb.db.query.submission.findMany({
		where: filterCondition,
		orderBy: orderByClause,
		limit: validPerPage,
		offset: (page - 1) * validPerPage
	});

	return {
		space,
		form: formData,
		submissions,
		filter,
		counts: {
			all: allCount,
			unread: unreadCount,
			resolved: resolvedCount,
			archived: archivedCount,
			spam: spamCount
		},
		dateRange: {
			from: dateFrom,
			to: dateTo
		},
		pagination: {
			page,
			perPage: validPerPage,
			totalPages: Math.ceil(filteredCount / validPerPage),
			totalCount: filteredCount
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

		await requireSpaceMember(userId, spaceId);

		const formDb = await getFormDb(userId);
		const { form } = formDb.schema;

		const formData = await formDb.db.query.form.findFirst({
			where: eq(form.id, formId)
		});

		if (!formData) {
			throw error(404, 'Form not found');
		}

		if (formData.organizationId !== spaceId) {
			throw error(403, 'Unauthorized');
		}

		// Delete all files for this form first (before DB deletion)
		// This deletes all submissions' files
		await deleteFormFiles(formId);

		// Delete from user's DB (cascade will delete submissions)
		await formDb.db.delete(form).where(eq(form.id, formId));

		// Also delete from formEndpoint table in platform DB
		const { formEndpoint } = await import('$lib/server/db/schema');
		await db.delete(formEndpoint).where(eq(formEndpoint.formId, formId));

		throw redirect(303, `/spaces/${spaceId}?tab=forms`);
	},

	bulkUpdateStatus: async ({ locals, params, request }) => {
		const userId = locals.user.id;
		const spaceId = params.id;
		const formId = params.formId;

		await requireSpaceMember(userId, spaceId);

		const formDb = await getFormDb(userId);
		const { submission } = formDb.schema;

		const reqData = await request.formData();
		const submissionIds = JSON.parse(reqData.get('submissionIds')?.toString() || '[]');
		const statusValue = reqData.get('status')?.toString();
		const status = statusValue && statusValue !== '' ? (statusValue as 'new' | 'read' | 'resolved') : undefined;
		const isSpamValue = reqData.get('isSpam')?.toString();
		const isSpam = isSpamValue === 'true';
		const notSpamValue = reqData.get('notSpam')?.toString();
		const notSpam = notSpamValue === 'true';
		const archiveValue = reqData.get('archive')?.toString();
		const archive = archiveValue === 'true';
		const unarchiveValue = reqData.get('unarchive')?.toString();
		const unarchive = unarchiveValue === 'true';

		if (!submissionIds || submissionIds.length === 0) {
			return { success: false, error: 'No submissions selected' };
		}

		if (!status && !isSpam && !notSpam && !archive && !unarchive) {
			return { success: false, error: 'Invalid action' };
		}

		try {
			const updateData: Record<string, unknown> = { updatedAt: new Date() };

			if (status) {
				updateData.status = status;
				updateData.isSpam = false;
			}

			if (isSpam) {
				updateData.isSpam = true;
			}

			if (notSpam) {
				updateData.isSpam = false;
				updateData.status = 'new';
			}

			if (archive) {
				updateData.isArchived = true;
				updateData.isRead = true;
			}

			if (unarchive) {
				updateData.isArchived = false;
			}

			await formDb.db
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

		await requireSpaceMember(userId, spaceId);

		const formDb = await getFormDb(userId);
		const { submission } = formDb.schema;

		const reqData = await request.formData();
		const submissionIds = JSON.parse(reqData.get('submissionIds')?.toString() || '[]') as string[];

		if (!submissionIds || submissionIds.length === 0) {
			return { success: false, error: 'No submissions selected' };
		}

		try {
			// Delete files first (before DB deletion)
			// Files are stored at: submissions/{formId}/{submissionId}/*
			const fileDeletePromises = submissionIds.map((submissionId) =>
				deleteSubmissionFiles(formId, submissionId)
			);
			await Promise.allSettled(fileDeletePromises);

			// Then delete DB records
			await formDb.db
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

		await requireSpaceMember(userId, spaceId);

		const formDb = await getFormDb(userId);
		const { submission } = formDb.schema;

		const reqData = await request.formData();
		const submissionId = reqData.get('submissionId')?.toString();

		if (!submissionId) {
			return { success: false, error: 'Submission ID required' };
		}

		try {
			// Delete files first (before DB deletion)
			await deleteSubmissionFiles(formId, submissionId);

			// Then delete DB record
			await formDb.db
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

		await requireSpaceMember(userId, spaceId);

		const formDb = await getFormDb(userId);
		const { submission } = formDb.schema;

		const reqData = await request.formData();
		const format = reqData.get('format')?.toString() || 'csv';
		const filter = reqData.get('filter')?.toString() || 'all';
		const dateFrom = reqData.get('dateFrom')?.toString();
		const dateTo = reqData.get('dateTo')?.toString();

		try {
			// Base condition
			let whereClause = eq(submission.formId, formId);

			// Apply filter
			switch (filter) {
				case 'unread':
					whereClause = and(
						whereClause,
						eq(submission.status, 'new'),
						eq(submission.isSpam, false),
						eq(submission.isArchived, false)
					)!;
					break;
				case 'archived':
					whereClause = and(whereClause, eq(submission.isArchived, true))!;
					break;
				case 'spam':
					whereClause = and(
						whereClause,
						eq(submission.isSpam, true),
						eq(submission.isArchived, false)
					)!;
					break;
				default: // 'all'
					whereClause = and(
						whereClause,
						eq(submission.isSpam, false),
						eq(submission.isArchived, false)
					)!;
			}

			// Apply date range
			if (dateFrom) {
				whereClause = and(whereClause, gte(submission.createdAt, new Date(dateFrom)))!;
			}
			if (dateTo) {
				const endDate = new Date(dateTo);
				endDate.setDate(endDate.getDate() + 1);
				whereClause = and(whereClause, lte(submission.createdAt, endDate))!;
			}

			const submissions = await formDb.db.query.submission.findMany({
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
					isArchived: s.isArchived,
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
