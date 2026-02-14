import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireSpaceMember } from '$lib/server/spaces/permissions';
import { getFormDb } from '$lib/server/form-db';
import { eq, and, lt, desc, or, like, gte, lte } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const userId = locals.user.id;
	const formId = url.searchParams.get('formId');
	const spaceId = url.searchParams.get('spaceId');
	const cursor = url.searchParams.get('cursor'); // ISO timestamp string
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
	const filter = (url.searchParams.get('filter') || 'all') as
		| 'all'
		| 'unread'
		| 'archived'
		| 'spam';
	const dateFrom = url.searchParams.get('dateFrom');
	const dateTo = url.searchParams.get('dateTo');
	const search = url.searchParams.get('search') || '';

	if (!formId || !spaceId) {
		throw error(400, 'Missing formId or spaceId');
	}

	// Check if user is a member of the space
	await requireSpaceMember(userId, spaceId);

	// Get the appropriate database for the user
	const formDb = await getFormDb(userId);
	const { submission } = formDb.schema;

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
			filterCondition = and(baseCondition, eq(submission.isArchived, true));
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
	if (search) {
		filterCondition = and(
			filterCondition,
			or(like(submission.name, `%${search}%`), like(submission.email, `%${search}%`))
		);
	}

	// Add cursor condition for pagination
	if (cursor) {
		filterCondition = and(filterCondition, lt(submission.createdAt, new Date(cursor)));
	}

	// Fetch submissions with one extra to check if there are more
	const submissions = await formDb.db.query.submission.findMany({
		where: filterCondition,
		orderBy: [desc(submission.createdAt)],
		limit: limit + 1
	});

	const hasMore = submissions.length > limit;
	const results = hasMore ? submissions.slice(0, -1) : submissions;
	const nextCursor = results.length > 0 ? results[results.length - 1].createdAt.toISOString() : null;

	return json({
		submissions: results,
		nextCursor,
		hasMore
	});
};
