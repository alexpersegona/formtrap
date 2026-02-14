import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import {
	user,
	member,
	form,
	organization,
	subscription,
	submission
} from '$lib/server/db/schema';
import { eq, count, sql, desc } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import { nanoid } from 'nanoid';

export const load: PageServerLoad = async ({ params }) => {
	const userId = params.userId;

	// Fetch user details
	const targetUser = await db.query.user.findFirst({
		where: eq(user.id, userId)
	});

	if (!targetUser) {
		throw error(404, 'User not found');
	}

	// Fetch user's spaces with form counts
	const userSpaces = await db
		.select({
			id: organization.id,
			name: organization.name,
			role: member.role,
			isPaused: organization.isPaused,
			isClientOwned: organization.isClientOwned,
			createdAt: organization.createdAt,
			formCount: sql<number>`(
				SELECT COUNT(*) FROM ${form} WHERE ${form.organizationId} = ${organization.id}
			)`.as('formCount'),
			submissionCount: sql<number>`(
				SELECT COUNT(*) FROM ${submission}
				WHERE ${submission.formId} IN (
					SELECT id FROM ${form} WHERE ${form.organizationId} = ${organization.id}
				)
			)`.as('submissionCount')
		})
		.from(member)
		.innerJoin(organization, eq(member.organizationId, organization.id))
		.where(eq(member.userId, userId))
		.orderBy(desc(organization.createdAt));

	// Fetch user's subscription
	const userSubscription = await db.query.subscription.findFirst({
		where: eq(subscription.userId, userId)
	});

	// Get recent activity counts
	const [formsCreatedCount] = await db
		.select({ count: count() })
		.from(form)
		.where(eq(form.createdBy, userId));

	return {
		targetUser,
		spaces: userSpaces,
		subscription: userSubscription,
		stats: {
			formsCreated: formsCreatedCount?.count ?? 0,
			spacesCount: userSpaces.length
		}
	};
};

export const actions = {
	updateRole: async ({ request, params, locals }) => {
		const data = await request.formData();
		const newRole = data.get('role')?.toString();

		if (!newRole || !['user', 'admin', 'superadmin'].includes(newRole)) {
			return fail(400, { error: 'Invalid role' });
		}

		// Prevent demoting yourself
		if (params.userId === locals.user?.id && newRole !== 'superadmin') {
			return fail(400, { error: 'Cannot change your own role' });
		}

		await db
			.update(user)
			.set({ role: newRole, updatedAt: new Date() })
			.where(eq(user.id, params.userId));

		return { success: true, message: 'Role updated successfully' };
	},

	verifyEmail: async ({ params }) => {
		await db
			.update(user)
			.set({ emailVerified: true, updatedAt: new Date() })
			.where(eq(user.id, params.userId));

		return { success: true, message: 'Email verified successfully' };
	},

	banUser: async ({ request, params, locals }) => {
		const data = await request.formData();
		const reason = data.get('reason')?.toString() || 'Banned by superadmin';

		// Prevent banning yourself
		if (params.userId === locals.user?.id) {
			return fail(400, { error: 'Cannot ban yourself' });
		}

		// Prevent banning other superadmins
		const targetUser = await db.query.user.findFirst({
			where: eq(user.id, params.userId)
		});

		if (targetUser?.role === 'superadmin') {
			return fail(400, { error: 'Cannot ban another superadmin' });
		}

		await db
			.update(user)
			.set({
				bannedAt: new Date(),
				banReason: reason,
				updatedAt: new Date()
			})
			.where(eq(user.id, params.userId));

		return { success: true, message: 'User banned successfully' };
	},

	unbanUser: async ({ params }) => {
		await db
			.update(user)
			.set({
				bannedAt: null,
				banReason: null,
				updatedAt: new Date()
			})
			.where(eq(user.id, params.userId));

		return { success: true, message: 'User unbanned successfully' };
	}
} satisfies Actions;
