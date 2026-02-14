import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { organization, member, form, submission, user } from '$lib/server/db/schema';
import { count, sql, eq, desc, asc, ilike, and, inArray } from 'drizzle-orm';

// Default columns for spaces table
const DEFAULT_COLUMNS = ['space', 'owner', 'members', 'forms', 'submissions', 'status', 'created'];

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
		conditions.push(ilike(organization.name, `%${search}%`));
	}

	if (filter === 'paused') {
		conditions.push(eq(organization.isPaused, true));
	} else if (filter === 'client') {
		conditions.push(eq(organization.isClientOwned, true));
	} else if (filter === 'active') {
		conditions.push(eq(organization.isPaused, false));
	}

	const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

	// Get total count
	const [totalResult] = await db
		.select({ count: count() })
		.from(organization)
		.where(whereClause);

	const totalSpaces = totalResult?.count ?? 0;
	const totalPages = Math.ceil(totalSpaces / limit);

	// Determine sort direction
	const sortDirection = sortOrder === 'desc' ? desc : asc;

	// Build order clause based on sortBy
	let orderByClause;
	switch (sortBy) {
		case 'space':
			orderByClause = sortDirection(organization.name);
			break;
		case 'owner':
			orderByClause = sortDirection(user.name);
			break;
		case 'members':
			orderByClause = sortDirection(
				sql`(SELECT COUNT(*) FROM ${member} WHERE ${member.organizationId} = ${organization.id})`
			);
			break;
		case 'forms':
			orderByClause = sortDirection(
				sql`(SELECT COUNT(*) FROM ${form} WHERE ${form.organizationId} = ${organization.id})`
			);
			break;
		case 'submissions':
			orderByClause = sortDirection(
				sql`(SELECT COUNT(*) FROM ${submission} WHERE ${submission.formId} IN (SELECT id FROM ${form} WHERE ${form.organizationId} = ${organization.id}))`
			);
			break;
		case 'status':
			orderByClause = sortDirection(organization.isPaused);
			break;
		case 'created':
		default:
			orderByClause = sortDirection(organization.createdAt);
			break;
	}

	// Get base space data with owner info
	const rawSpaces = await db
		.select({
			id: organization.id,
			name: organization.name,
			logo: organization.logo,
			isPaused: organization.isPaused,
			isClientOwned: organization.isClientOwned,
			createdAt: organization.createdAt,
			createdBy: organization.createdBy,
			ownerName: user.name,
			ownerEmail: user.email
		})
		.from(organization)
		.leftJoin(user, eq(organization.createdBy, user.id))
		.where(whereClause)
		.orderBy(orderByClause)
		.limit(limit)
		.offset(offset);

	// Get organization IDs for batch queries
	const orgIds = rawSpaces.map((s) => s.id);

	// Conditionally fetch expensive data based on visible columns
	const memberCounts =
		orgIds.length > 0 && visibleColumns.includes('members')
			? await db
					.select({
						organizationId: member.organizationId,
						count: count()
					})
					.from(member)
					.where(inArray(member.organizationId, orgIds))
					.groupBy(member.organizationId)
			: [];

	const formCounts =
		orgIds.length > 0 && (visibleColumns.includes('forms') || visibleColumns.includes('submissions'))
			? await db
					.select({
						organizationId: form.organizationId,
						count: count()
					})
					.from(form)
					.where(inArray(form.organizationId, orgIds))
					.groupBy(form.organizationId)
			: [];

	// Submission counts - expensive nested query, only fetch if visible
	const submissionCounts =
		orgIds.length > 0 && visibleColumns.includes('submissions')
			? await db
					.select({
						organizationId: form.organizationId,
						count: count()
					})
					.from(submission)
					.innerJoin(form, eq(submission.formId, form.id))
					.where(inArray(form.organizationId, orgIds))
					.groupBy(form.organizationId)
			: [];

	// Create lookup maps
	const memberCountMap = new Map(memberCounts.map((m) => [m.organizationId, Number(m.count)]));
	const formCountMap = new Map(formCounts.map((f) => [f.organizationId, Number(f.count)]));
	const submissionCountMap = new Map(submissionCounts.map((s) => [s.organizationId, Number(s.count)]));

	// Combine data
	const spaces = rawSpaces.map((s) => ({
		...s,
		memberCount: memberCountMap.get(s.id) ?? 0,
		formCount: formCountMap.get(s.id) ?? 0,
		submissionCount: submissionCountMap.get(s.id) ?? 0
	}));

	// Get filter counts (these are cheap and always needed for the filter tabs)
	const [activeCount] = await db
		.select({ count: count() })
		.from(organization)
		.where(eq(organization.isPaused, false));

	const [pausedCount] = await db
		.select({ count: count() })
		.from(organization)
		.where(eq(organization.isPaused, true));

	const [clientCount] = await db
		.select({ count: count() })
		.from(organization)
		.where(eq(organization.isClientOwned, true));

	return {
		spaces,
		search,
		filter,
		sortBy,
		sortOrder,
		visibleColumns,
		defaultColumns: DEFAULT_COLUMNS,
		counts: {
			total: totalSpaces,
			active: activeCount?.count ?? 0,
			paused: pausedCount?.count ?? 0,
			client: clientCount?.count ?? 0
		},
		pagination: {
			page,
			limit,
			total: totalSpaces,
			totalPages
		}
	};
};
