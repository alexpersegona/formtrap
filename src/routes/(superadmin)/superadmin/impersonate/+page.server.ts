import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { user, impersonationLog } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error, redirect, fail } from '@sveltejs/kit';
import { nanoid } from 'nanoid';

export const load: PageServerLoad = async ({ url, locals }) => {
	const userId = url.searchParams.get('userId');

	if (!userId) {
		throw error(400, 'Missing userId parameter');
	}

	// Fetch target user
	const targetUser = await db.query.user.findFirst({
		where: eq(user.id, userId)
	});

	if (!targetUser) {
		throw error(404, 'User not found');
	}

	// Can't impersonate another superadmin
	if (targetUser.role === 'superadmin') {
		throw error(403, 'Cannot impersonate another superadmin');
	}

	// Can't impersonate banned users
	if (targetUser.bannedAt) {
		throw error(403, 'Cannot impersonate a banned user');
	}

	return {
		targetUser: {
			id: targetUser.id,
			name: targetUser.name,
			email: targetUser.email,
			role: targetUser.role
		},
		superadmin: {
			id: locals.user!.id,
			name: locals.user!.name
		}
	};
};

export const actions = {
	start: async ({ request, locals, cookies, url }) => {
		const data = await request.formData();
		const targetUserId = data.get('targetUserId')?.toString();

		if (!targetUserId) {
			return fail(400, { error: 'Missing target user ID' });
		}

		// Verify target user exists and is not superadmin
		const targetUser = await db.query.user.findFirst({
			where: eq(user.id, targetUserId)
		});

		if (!targetUser) {
			return fail(404, { error: 'User not found' });
		}

		if (targetUser.role === 'superadmin') {
			return fail(403, { error: 'Cannot impersonate another superadmin' });
		}

		if (targetUser.bannedAt) {
			return fail(403, { error: 'Cannot impersonate a banned user' });
		}

		// Create impersonation log entry
		const logId = nanoid();
		await db.insert(impersonationLog).values({
			id: logId,
			superadminId: locals.user!.id,
			targetUserId: targetUserId,
			ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
			userAgent: request.headers.get('user-agent') || 'unknown'
		});

		// Store impersonation info in a cookie
		// This cookie will be checked in the hooks to modify session behavior
		cookies.set('impersonation', JSON.stringify({
			logId,
			superadminId: locals.user!.id,
			superadminName: locals.user!.name,
			targetUserId: targetUserId,
			targetUserName: targetUser.name,
			startedAt: new Date().toISOString()
		}), {
			path: '/',
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 60 * 60 * 4 // 4 hours max
		});

		// Redirect to target user's dashboard
		throw redirect(303, '/dashboard');
	}
} satisfies Actions;
