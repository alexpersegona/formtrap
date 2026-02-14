import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { form, organization, submission, user } from '$lib/server/db/schema';
import { count, sql, eq, desc, asc, ilike, and, inArray } from 'drizzle-orm';

// Default columns for forms table
const DEFAULT_COLUMNS = ['form', 'space', 'creator', 'submissions', 'spam', 'status', 'created'];

export const load: PageServerLoad = async ({ url }) => {
	const search = url.searchParams.get('search') || '';
	const filter = url.searchParams.get('filter') || 'all';
	const sortBy = url.searchParams.get('sortBy') || 'created';
	const sortOrder = (url.searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
	const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '10'), 10), 50);
	const offset = (page - 1) * limit;

	// Parse visible columns from URL (for query optimization)
	const columnsParam = url.searchParams.get('columns');
	const visibleColumns = columnsParam ? columnsParam.split(',') : DEFAULT_COLUMNS;

	// Build where clauses
	const conditions = [];

	if (search) {
		conditions.push(ilike(form.name, `%${search}%`));
	}

	if (filter === 'active') {
		conditions.push(eq(form.isActive, true));
	} else if (filter === 'inactive') {
		conditions.push(eq(form.isActive, false));
	}

	const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

	// Get total count
	const [totalResult] = await db.select({ count: count() }).from(form).where(whereClause);

	const totalForms = totalResult?.count ?? 0;
	const totalPages = Math.ceil(totalForms / limit);

	// Determine sort column and direction
	const sortDirection = sortOrder === 'desc' ? desc : asc;

	let orderByClause;
	switch (sortBy) {
		case 'form':
			orderByClause = sortDirection(form.name);
			break;
		case 'space':
			orderByClause = sortDirection(organization.name);
			break;
		case 'creator':
			orderByClause = sortDirection(user.name);
			break;
		case 'submissions':
			orderByClause = sortDirection(
				sql`(SELECT COUNT(*) FROM ${submission} WHERE ${submission.formId} = ${form.id})`
			);
			break;
		case 'spam':
			orderByClause = sortDirection(
				sql`(SELECT COUNT(*) FROM ${submission} WHERE ${submission.formId} = ${form.id} AND ${submission.isSpam} = true)`
			);
			break;
		case 'status':
			orderByClause = sortDirection(form.isActive);
			break;
		case 'created':
		default:
			orderByClause = sortDirection(form.createdAt);
			break;
	}

	// Get base form data
	const rawForms = await db
		.select({
			id: form.id,
			name: form.name,
			description: form.description,
			isActive: form.isActive,
			createdAt: form.createdAt,
			organizationId: form.organizationId,
			spaceName: organization.name,
			creatorName: user.name,
			creatorEmail: user.email
		})
		.from(form)
		.leftJoin(organization, eq(form.organizationId, organization.id))
		.leftJoin(user, eq(form.createdBy, user.id))
		.where(whereClause)
		.orderBy(orderByClause)
		.limit(limit)
		.offset(offset);

	// Get form IDs for batch queries
	const formIds = rawForms.map((f) => f.id);

	// Conditionally fetch expensive submission counts based on visible columns
	const submissionCounts =
		formIds.length > 0 && visibleColumns.includes('submissions')
			? await db
					.select({
						formId: submission.formId,
						count: count()
					})
					.from(submission)
					.where(inArray(submission.formId, formIds))
					.groupBy(submission.formId)
			: [];

	const spamCounts =
		formIds.length > 0 && visibleColumns.includes('spam')
			? await db
					.select({
						formId: submission.formId,
						count: count()
					})
					.from(submission)
					.where(and(inArray(submission.formId, formIds), eq(submission.isSpam, true)))
					.groupBy(submission.formId)
			: [];

	// Create lookup maps
	const submissionCountMap = new Map(submissionCounts.map((s) => [s.formId, Number(s.count)]));
	const spamCountMap = new Map(spamCounts.map((s) => [s.formId, Number(s.count)]));

	// Combine data
	const forms = rawForms.map((f) => ({
		...f,
		submissionCount: submissionCountMap.get(f.id) ?? 0,
		spamCount: spamCountMap.get(f.id) ?? 0
	}));

	// Get filter counts
	const [activeCount] = await db
		.select({ count: count() })
		.from(form)
		.where(eq(form.isActive, true));

	const [inactiveCount] = await db
		.select({ count: count() })
		.from(form)
		.where(eq(form.isActive, false));

	return {
		forms,
		search,
		filter,
		sortBy,
		sortOrder,
		visibleColumns,
		defaultColumns: DEFAULT_COLUMNS,
		counts: {
			total: totalForms,
			active: activeCount?.count ?? 0,
			inactive: inactiveCount?.count ?? 0
		},
		pagination: {
			page,
			limit,
			total: totalForms,
			totalPages
		}
	};
};
