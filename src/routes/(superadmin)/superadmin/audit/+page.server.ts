import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { impersonationLog, user } from '$lib/server/db/schema';
import { desc, asc, eq, count, isNull, inArray, sql } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';

// Default columns for audit table
const DEFAULT_COLUMNS = ['superadmin', 'target', 'started', 'duration', 'status', 'details'];

export const load: PageServerLoad = async ({ url }) => {
	const sortBy = url.searchParams.get('sortBy') || 'started';
	const sortOrder = (url.searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
	const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '10'), 10), 50);
	const offset = (page - 1) * limit;

	// Parse visible columns from URL
	const columnsParam = url.searchParams.get('columns');
	const visibleColumns = columnsParam ? columnsParam.split(',') : DEFAULT_COLUMNS;

	// Get total count
	const [totalResult] = await db.select({ count: count() }).from(impersonationLog);
	const totalLogs = totalResult?.count ?? 0;
	const totalPages = Math.ceil(totalLogs / limit);

	// Determine sort direction
	const sortDirection = sortOrder === 'desc' ? desc : asc;

	// Build order clause based on sortBy
	let orderByClause;
	switch (sortBy) {
		case 'duration':
			// Duration is calculated, sort by endedAt - startedAt or by startedAt if still active
			orderByClause = sortDirection(
				sql`COALESCE(${impersonationLog.endedAt}, NOW()) - ${impersonationLog.startedAt}`
			);
			break;
		case 'status':
			// Active sessions (null endedAt) first or last
			orderByClause = sortDirection(impersonationLog.endedAt);
			break;
		case 'started':
		default:
			orderByClause = sortDirection(impersonationLog.startedAt);
			break;
	}

	// Get impersonation logs with user details
	const logs = await db
		.select({
			id: impersonationLog.id,
			startedAt: impersonationLog.startedAt,
			endedAt: impersonationLog.endedAt,
			ipAddress: impersonationLog.ipAddress,
			userAgent: impersonationLog.userAgent,
			superadminId: impersonationLog.superadminId,
			targetUserId: impersonationLog.targetUserId
		})
		.from(impersonationLog)
		.orderBy(orderByClause)
		.limit(limit)
		.offset(offset);

	// Fetch user details for all unique user IDs
	const userIds = [...new Set(logs.flatMap((l) => [l.superadminId, l.targetUserId]))];

	const users = userIds.length > 0
		? await db
				.select({
					id: user.id,
					name: user.name,
					email: user.email,
					image: user.image
				})
				.from(user)
				.where(
					userIds.length === 1
						? eq(user.id, userIds[0])
						: undefined
				)
		: [];

	// Create a map for quick lookup
	const userMap = new Map(users.map((u) => [u.id, u]));

	// If we didn't filter by specific IDs, we need to filter the results
	const filteredUserMap = new Map(
		userIds.map((id) => [id, userMap.get(id) || { id, name: 'Unknown', email: '', image: null }])
	);

	// Calculate duration on server side
	const now = Date.now();

	// Enrich logs with user details and calculated duration
	const enrichedLogs = logs.map((log) => {
		const startMs = log.startedAt.getTime();
		const endMs = log.endedAt ? log.endedAt.getTime() : now;
		const durationSecs = Math.floor((endMs - startMs) / 1000);

		return {
			id: log.id,
			superadminId: log.superadminId,
			targetUserId: log.targetUserId,
			ipAddress: log.ipAddress,
			userAgent: log.userAgent,
			startedAtMs: startMs,
			endedAtMs: log.endedAt ? endMs : null,
			durationSecs,
			superadmin: filteredUserMap.get(log.superadminId) || {
				id: log.superadminId,
				name: 'Unknown',
				email: '',
				image: null
			},
			targetUser: filteredUserMap.get(log.targetUserId) || {
				id: log.targetUserId,
				name: 'Unknown',
				email: '',
				image: null
			}
		};
	});

	return {
		logs: enrichedLogs,
		sortBy,
		sortOrder,
		visibleColumns,
		defaultColumns: DEFAULT_COLUMNS,
		pagination: {
			page,
			limit,
			total: totalLogs,
			totalPages
		}
	};
};

export const actions: Actions = {
	forceEnd: async ({ request }) => {
		const formData = await request.formData();
		const logId = formData.get('logId');

		if (!logId || typeof logId !== 'string') {
			return fail(400, { error: 'Log ID is required' });
		}

		await db
			.update(impersonationLog)
			.set({ endedAt: new Date() })
			.where(eq(impersonationLog.id, logId));

		return { success: true };
	},

	forceEndAll: async () => {
		await db
			.update(impersonationLog)
			.set({ endedAt: new Date() })
			.where(isNull(impersonationLog.endedAt));

		return { success: true };
	},

	deleteSelected: async ({ request }) => {
		const formData = await request.formData();
		const logIdsJson = formData.get('logIds');

		if (!logIdsJson || typeof logIdsJson !== 'string') {
			return fail(400, { error: 'Log IDs are required' });
		}

		try {
			const logIds: string[] = JSON.parse(logIdsJson);

			if (!Array.isArray(logIds) || logIds.length === 0) {
				return fail(400, { error: 'No logs selected' });
			}

			await db.delete(impersonationLog).where(inArray(impersonationLog.id, logIds));

			return { success: true, deleted: logIds.length };
		} catch {
			return fail(400, { error: 'Invalid log IDs format' });
		}
	}
};
