import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { organization, member } from '$lib/server/db/schema';
import { sql, eq, desc, asc, ilike, and, inArray } from 'drizzle-orm';
import { getFormDb } from '$lib/server/form-db';

export const load: PageServerLoad = async ({ url, locals }) => {
	const userId = locals.user!.id;
	const search = url.searchParams.get('search') || '';
	const sortBy = url.searchParams.get('sortBy') || 'form';
	const sortOrder = url.searchParams.get('sortOrder') || 'asc';
	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '10'), 10), 50);

	// Get all organizations the user is a member of (always from platform DB)
	const userMemberships = await db
		.select({ organizationId: member.organizationId })
		.from(member)
		.where(eq(member.userId, userId));

	const orgIds = userMemberships.map((m) => m.organizationId);

	if (orgIds.length === 0) {
		return {
			forms: [],
			search,
			sortBy,
			sortOrder,
			pagination: {
				page: 1,
				limit,
				totalForms: 0,
				totalPages: 0
			}
		};
	}

	// Get organization names for later mapping (from platform DB)
	const orgs = await db
		.select({ id: organization.id, name: organization.name })
		.from(organization)
		.where(inArray(organization.id, orgIds));
	const orgNameMap = new Map(orgs.map((o) => [o.id, o.name]));

	// Get the appropriate database (user's DB for BYOI, platform for free trial)
	const formDb = await getFormDb(userId);
	const { form } = formDb.schema;

	// Build where clauses
	const conditions = [inArray(form.organizationId, orgIds)];

	if (search) {
		conditions.push(ilike(form.name, `%${search}%`));
	}

	const whereClause = and(...conditions);

	// Query forms with submission counts
	const formsData = await formDb.db
		.select({
			id: form.id,
			name: form.name,
			organizationId: form.organizationId,
			isActive: form.isActive,
			submissionCount: sql<number>`(
				SELECT COUNT(*) FROM "submission" WHERE "submission"."formId" = "form"."id"
			)`.as('submissionCount')
		})
		.from(form)
		.where(whereClause);

	// Add space names from our map
	const formsWithSpaces = formsData.map((f) => ({
		...f,
		spaceName: orgNameMap.get(f.organizationId) ?? 'Unknown'
	}));

	// Sort in JavaScript since we can't join cross-database
	const sortDirection = sortOrder === 'desc' ? -1 : 1;
	formsWithSpaces.sort((a, b) => {
		let comparison = 0;
		switch (sortBy) {
			case 'space':
				comparison = a.spaceName.localeCompare(b.spaceName);
				break;
			case 'submissions':
				comparison = a.submissionCount - b.submissionCount;
				break;
			case 'form':
			default:
				comparison = a.name.localeCompare(b.name);
				break;
		}
		return comparison * sortDirection;
	});

	// Pagination
	const totalForms = formsWithSpaces.length;
	const totalPages = Math.ceil(totalForms / limit);
	const paginatedForms = formsWithSpaces.slice((page - 1) * limit, page * limit);

	return {
		forms: paginatedForms,
		search,
		sortBy,
		sortOrder,
		pagination: {
			page,
			limit,
			totalForms,
			totalPages
		}
	};
};
