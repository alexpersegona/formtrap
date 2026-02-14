import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { invitation, member } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const load: PageServerLoad = async ({ locals }) => {
	const userEmail = locals.user.email;

	// Get all pending invitations for this user's email
	const invites = await db.query.invitation.findMany({
		where: and(eq(invitation.email, userEmail), eq(invitation.status, 'pending')),
		orderBy: (invitation, { desc }) => [desc(invitation.createdAt)],
		with: {
			organization: true,
			inviter: true
		}
	});

	return {
		invites,
		pageHeader: undefined
	};
};

export const actions = {
	accept: async ({ request, locals }) => {
		const userId = locals.user.id;
		const userEmail = locals.user.email;

		const formData = await request.formData();
		const invitationId = formData.get('invitationId')?.toString();

		if (!invitationId) {
			return fail(400, { error: 'Invitation ID is required' });
		}

		try {
			// Get the invitation
			const invite = await db.query.invitation.findFirst({
				where: and(
					eq(invitation.id, invitationId),
					eq(invitation.email, userEmail),
					eq(invitation.status, 'pending')
				)
			});

			if (!invite) {
				return fail(404, { error: 'Invitation not found or already processed' });
			}

			// Check if invitation has expired
			if (new Date(invite.expiresAt) < new Date()) {
				return fail(400, { error: 'This invitation has expired' });
			}

			// Check if user is already a member
			const existingMember = await db.query.member.findFirst({
				where: and(eq(member.userId, userId), eq(member.organizationId, invite.organizationId))
			});

			if (existingMember) {
				return fail(400, { error: 'You are already a member of this space' });
			}

			// Add user as member
			await db.insert(member).values({
				id: nanoid(),
				organizationId: invite.organizationId,
				userId,
				role: invite.role,
				createdAt: new Date()
			});

			// Update invitation status
			await db
				.update(invitation)
				.set({
					status: 'accepted',
					updatedAt: new Date()
				})
				.where(eq(invitation.id, invitationId));

			// Redirect to the space
			throw redirect(303, `/spaces/${invite.organizationId}`);
		} catch (err) {
			if (err instanceof Response) {
				throw err;
			}

			console.error('Failed to accept invitation:', err);
			return fail(500, { error: 'Failed to accept invitation' });
		}
	},

	decline: async ({ request, locals }) => {
		const userEmail = locals.user.email;

		const formData = await request.formData();
		const invitationId = formData.get('invitationId')?.toString();

		if (!invitationId) {
			return fail(400, { error: 'Invitation ID is required' });
		}

		try {
			// Get the invitation
			const invite = await db.query.invitation.findFirst({
				where: and(
					eq(invitation.id, invitationId),
					eq(invitation.email, userEmail),
					eq(invitation.status, 'pending')
				)
			});

			if (!invite) {
				return fail(404, { error: 'Invitation not found or already processed' });
			}

			// Update invitation status
			await db
				.update(invitation)
				.set({
					status: 'declined',
					updatedAt: new Date()
				})
				.where(eq(invitation.id, invitationId));

			return { success: true };
		} catch (err) {
			console.error('Failed to decline invitation:', err);
			return fail(500, { error: 'Failed to decline invitation' });
		}
	}
} satisfies Actions;
