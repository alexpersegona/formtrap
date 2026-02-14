import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { eq, desc, and, asc, or, like, gte, lte } from 'drizzle-orm';
import { requireSpaceMember } from '$lib/server/spaces/permissions';
import { getFormDb } from '$lib/server/form-db';

export const GET: RequestHandler = async ({ locals, params, url }) => {
	const userId = locals.user?.id;
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	const spaceId = params.id;
	const formId = params.formId;

	// Check if user is a member
	await requireSpaceMember(userId, spaceId);

	// Use the appropriate DB for form/submission queries
	const formDb = await getFormDb(userId);
	const { form, submission } = formDb.schema;

	// Get form details to verify it exists and belongs to this space
	const formData = await formDb.db.query.form.findFirst({
		where: eq(form.id, formId)
	});

	if (!formData) {
		throw error(404, 'Form not found');
	}

	if (formData.organizationId !== spaceId) {
		throw error(404, 'Form not found');
	}

	// Parse query params
	const filter = (url.searchParams.get('filter') || 'all') as 'all' | 'unread' | 'archived' | 'spam';
	const dateFrom = url.searchParams.get('dateFrom');
	const dateTo = url.searchParams.get('dateTo');
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
			filterCondition = and(
				baseCondition,
				eq(submission.status, 'new'),
				eq(submission.isSpam, false),
				eq(submission.isArchived, false)
			);
			break;
		case 'archived':
			filterCondition = and(
				baseCondition,
				eq(submission.isArchived, true)
			);
			break;
		case 'spam':
			filterCondition = and(
				baseCondition,
				eq(submission.isSpam, true),
				eq(submission.isArchived, false)
			);
			break;
		default: // 'all'
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

	// Get submissions with pagination
	const submissions = await formDb.db.query.submission.findMany({
		where: filterCondition,
		orderBy: orderByClause,
		limit: validPerPage,
		offset: (page - 1) * validPerPage
	});

	return json({
		submissions,
		page,
		perPage: validPerPage
	});
};
