import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { contactSubmission } from '$lib/server/db/schema';
import { eq, desc, and, gte, lte } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url }) => {
	const filter = (url.searchParams.get('filter') || 'all') as 'all' | 'unread' | 'archived' | 'spam';
	const dateFrom = url.searchParams.get('dateFrom');
	const dateTo = url.searchParams.get('dateTo');
	const page = parseInt(url.searchParams.get('page') || '1');
	const perPage = parseInt(url.searchParams.get('perPage') || '50');

	const validPerPage = [10, 25, 50, 100].includes(perPage) ? perPage : 50;

	// Build filter condition
	let filterCondition;
	switch (filter) {
		case 'unread':
			filterCondition = and(
				eq(contactSubmission.isRead, false),
				eq(contactSubmission.isArchived, false),
				eq(contactSubmission.isSpam, false)
			);
			break;
		case 'archived':
			filterCondition = eq(contactSubmission.isArchived, true);
			break;
		case 'spam':
			filterCondition = and(
				eq(contactSubmission.isSpam, true),
				eq(contactSubmission.isArchived, false)
			);
			break;
		default: // 'all'
			filterCondition = and(
				eq(contactSubmission.isArchived, false),
				eq(contactSubmission.isSpam, false)
			);
	}

	// Add date range filtering
	if (dateFrom) {
		filterCondition = and(filterCondition, gte(contactSubmission.createdAt, new Date(dateFrom)));
	}
	if (dateTo) {
		const endDate = new Date(dateTo);
		endDate.setDate(endDate.getDate() + 1);
		filterCondition = and(filterCondition, lte(contactSubmission.createdAt, endDate));
	}

	// Get submissions with pagination
	const rawSubmissions = await db
		.select()
		.from(contactSubmission)
		.where(filterCondition)
		.orderBy(desc(contactSubmission.createdAt))
		.limit(validPerPage)
		.offset((page - 1) * validPerPage);

	const submissions = rawSubmissions.map((sub) => ({
		...sub,
		createdAtMs: sub.createdAt.getTime()
	}));

	return json({
		submissions,
		page,
		perPage: validPerPage
	});
};
