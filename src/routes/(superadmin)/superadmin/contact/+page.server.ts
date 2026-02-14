import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { contactSubmission } from '$lib/server/db/schema';
import { eq, desc, and, count, gte, lte } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
	const filter = (url.searchParams.get('filter') || 'all') as 'all' | 'unread' | 'archived' | 'spam';
	const dateFrom = url.searchParams.get('dateFrom');
	const dateTo = url.searchParams.get('dateTo');

	// Pagination
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

	// Get filtered count for pagination
	const [filteredCountResult] = await db
		.select({ count: count() })
		.from(contactSubmission)
		.where(filterCondition);
	const filteredCount = filteredCountResult?.count ?? 0;

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

	// Get counts for all filters (without date range)
	const [allCount] = await db
		.select({ count: count() })
		.from(contactSubmission)
		.where(and(eq(contactSubmission.isArchived, false), eq(contactSubmission.isSpam, false)));

	const [unreadCount] = await db
		.select({ count: count() })
		.from(contactSubmission)
		.where(and(
			eq(contactSubmission.isRead, false),
			eq(contactSubmission.isArchived, false),
			eq(contactSubmission.isSpam, false)
		));

	const [archivedCount] = await db
		.select({ count: count() })
		.from(contactSubmission)
		.where(eq(contactSubmission.isArchived, true));

	const [spamCount] = await db
		.select({ count: count() })
		.from(contactSubmission)
		.where(and(eq(contactSubmission.isSpam, true), eq(contactSubmission.isArchived, false)));

	return {
		submissions,
		filter,
		counts: {
			all: allCount?.count ?? 0,
			unread: unreadCount?.count ?? 0,
			archived: archivedCount?.count ?? 0,
			spam: spamCount?.count ?? 0
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
		}
	};
};

export const actions = {
	markAsRead: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();

		if (!id) {
			return fail(400, { error: 'Missing submission ID' });
		}

		await db
			.update(contactSubmission)
			.set({ isRead: true })
			.where(eq(contactSubmission.id, id));

		return { success: true };
	},

	markAsUnread: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();

		if (!id) {
			return fail(400, { error: 'Missing submission ID' });
		}

		await db
			.update(contactSubmission)
			.set({ isRead: false })
			.where(eq(contactSubmission.id, id));

		return { success: true };
	},

	archive: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();

		if (!id) {
			return fail(400, { error: 'Missing submission ID' });
		}

		await db
			.update(contactSubmission)
			.set({ isArchived: true, isRead: true })
			.where(eq(contactSubmission.id, id));

		return { success: true };
	},

	unarchive: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();

		if (!id) {
			return fail(400, { error: 'Missing submission ID' });
		}

		await db
			.update(contactSubmission)
			.set({ isArchived: false })
			.where(eq(contactSubmission.id, id));

		return { success: true };
	},

	markAsSpam: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		const reason = data.get('reason')?.toString();

		if (!id) {
			return fail(400, { error: 'Missing submission ID' });
		}

		await db
			.update(contactSubmission)
			.set({
				isSpam: true,
				spamReason: reason || 'Manually marked as spam',
				isRead: true
			})
			.where(eq(contactSubmission.id, id));

		return { success: true };
	},

	markAsNotSpam: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();

		if (!id) {
			return fail(400, { error: 'Missing submission ID' });
		}

		await db
			.update(contactSubmission)
			.set({ isSpam: false, spamReason: null })
			.where(eq(contactSubmission.id, id));

		return { success: true };
	},

	delete: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();

		if (!id) {
			return fail(400, { error: 'Missing submission ID' });
		}

		await db.delete(contactSubmission).where(eq(contactSubmission.id, id));

		return { success: true };
	}
} satisfies Actions;
