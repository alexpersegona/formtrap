import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { subscription, member, connection } from '$lib/server/db/schema';
import { eq, count } from 'drizzle-orm';
import { getFormDb, isFreeTrial } from '$lib/server/form-db';
import { PLAN_LIMITS } from '$lib/server/pricing/constants';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const userId = locals.user.id;

	// Get subscription tier
	const userSub = await db.query.subscription.findFirst({
		where: eq(subscription.userId, userId)
	});

	// Get space count
	const userSpaces = await db.query.member.findMany({
		where: eq(member.userId, userId),
		with: { organization: true }
	});

	// Get form count from appropriate DB
	const formDb = await getFormDb(userId);
	let formCount = 0;
	if (formDb.type === 'user') {
		const forms = await formDb.db.query.form.findMany();
		formCount = forms.length;
	} else {
		const forms = await formDb.db.query.form.findMany();
		formCount = forms.length;
	}

	const freeTrial = await isFreeTrial(userId);
	const tier = userSub?.tier || 'free';
	const limits = tier === 'pro' ? PLAN_LIMITS.pro : PLAN_LIMITS.free;

	// Check connection status for pro users
	const conn = await db.query.connection.findFirst({
		where: eq(connection.userId, userId),
		columns: { dbStatus: true, storageStatus: true, schemaInitialized: true }
	});

	return {
		user: locals.user,
		tier,
		status: userSub?.status || 'active',
		spaceCount: userSpaces.length,
		maxSpaces: limits.maxSpaces,
		formCount,
		freeTrial,
		connectionStatus: conn ? {
			db: conn.dbStatus,
			storage: conn.storageStatus,
			schema: conn.schemaInitialized
		} : null
	};
};
