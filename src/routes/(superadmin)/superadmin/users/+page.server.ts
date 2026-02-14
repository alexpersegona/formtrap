import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { user, member, form, subscription } from '$lib/server/db/schema';
import { count, ilike, or, desc, asc, inArray, eq, sql } from 'drizzle-orm';

// Default columns for users table
const DEFAULT_COLUMNS = ['user', 'plan', 'role', 'verified', 'spaces', 'forms', 'joined', 'status'];

export const load: PageServerLoad = async ({ url }) => {
	const search = url.searchParams.get('search') || '';
	const sortBy = url.searchParams.get('sortBy') || 'joined';
	const sortOrder = (url.searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
	const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '10'), 10), 50);
	const offset = (page - 1) * limit;

	// Parse visible columns from URL (for query optimization)
	const columnsParam = url.searchParams.get('columns');
	const visibleColumns = columnsParam ? columnsParam.split(',') : DEFAULT_COLUMNS;

	// Build where clause for search
	const whereClause = search
		? or(ilike(user.name, `%${search}%`), ilike(user.email, `%${search}%`))
		: undefined;

	// Get total count
	const [totalResult] = await db
		.select({ count: count() })
		.from(user)
		.where(whereClause);

	const totalUsers = Number(totalResult?.count ?? 0);
	const totalPages = Math.ceil(totalUsers / limit);

	// Determine sort direction
	const sortDirection = sortOrder === 'desc' ? desc : asc;

	// Build order clause based on sortBy
	let orderByClause;
	switch (sortBy) {
		case 'user':
			orderByClause = sortDirection(user.name);
			break;
		case 'plan':
			orderByClause = sortDirection(
				sql`(SELECT tier FROM ${subscription} WHERE ${subscription.userId} = ${user.id} LIMIT 1)`
			);
			break;
		case 'role':
			orderByClause = sortDirection(user.role);
			break;
		case 'verified':
			orderByClause = sortDirection(user.emailVerified);
			break;
		case 'spaces':
			orderByClause = sortDirection(
				sql`(SELECT COUNT(*) FROM ${member} WHERE ${member.userId} = ${user.id})`
			);
			break;
		case 'forms':
			orderByClause = sortDirection(
				sql`(SELECT COUNT(*) FROM ${form} WHERE ${form.createdBy} = ${user.id})`
			);
			break;
		case 'status':
			orderByClause = sortDirection(user.bannedAt);
			break;
		case 'joined':
		default:
			orderByClause = sortDirection(user.createdAt);
			break;
	}

	// Get users first
	const rawUsers = await db
		.select({
			id: user.id,
			name: user.name,
			email: user.email,
			image: user.image,
			role: user.role,
			emailVerified: user.emailVerified,
			bannedAt: user.bannedAt,
			createdAt: user.createdAt
		})
		.from(user)
		.where(whereClause)
		.orderBy(orderByClause)
		.limit(limit)
		.offset(offset);

	// Get user IDs for batch queries
	const userIds = rawUsers.map((u) => u.id);

	// Conditionally fetch expensive data based on visible columns
	const spaceCounts =
		userIds.length > 0 && visibleColumns.includes('spaces')
			? await db
					.select({
						userId: member.userId,
						count: count()
					})
					.from(member)
					.where(inArray(member.userId, userIds))
					.groupBy(member.userId)
			: [];

	const formCounts =
		userIds.length > 0 && visibleColumns.includes('forms')
			? await db
					.select({
						createdBy: form.createdBy,
						count: count()
					})
					.from(form)
					.where(inArray(form.createdBy, userIds))
					.groupBy(form.createdBy)
			: [];

	const subscriptions =
		userIds.length > 0 && visibleColumns.includes('plan')
			? await db
					.select({
						userId: subscription.userId,
						tier: subscription.tier
					})
					.from(subscription)
					.where(inArray(subscription.userId, userIds))
			: [];

	// Create lookup maps (count returns string/bigint, so convert to number)
	const spaceCountMap = new Map(spaceCounts.map((s) => [s.userId, Number(s.count)]));
	const formCountMap = new Map(formCounts.map((f) => [f.createdBy, Number(f.count)]));
	const subscriptionMap = new Map(subscriptions.map((s) => [s.userId, s.tier]));

	// Combine data
	const users = rawUsers.map((u) => ({
		...u,
		spaceCount: spaceCountMap.get(u.id) ?? 0,
		formCount: formCountMap.get(u.id) ?? 0,
		tier: subscriptionMap.get(u.id) ?? 'free'
	}));

	return {
		users,
		search,
		sortBy,
		sortOrder,
		visibleColumns,
		defaultColumns: DEFAULT_COLUMNS,
		pagination: {
			page,
			limit,
			total: totalUsers,
			totalPages
		}
	};
};
