import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { invitation, member } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const load: PageServerLoad = async ({ params, locals }) => {
	const invitationId = params.id;
	const userEmail = locals.user.email;

	// Get the specific invitation
	const invite = await db.query.invitation.findFirst({
		where: eq(invitation.id, invitationId),
		with: {
			organization: true,
			inviter: true
		}
	});

	// Invitation not found
	if (!invite) {
		throw error(404, 'Invitation not found');
	}

	// Check if invitation is for this user's email
	const isForThisUser = invite.email.toLowerCase() === userEmail.toLowerCase();

	// Check if invitation has already been processed
	const alreadyProcessed = invite.status !== 'pending';

	// Check if invitation has expired
	const isExpired = new Date(invite.expiresAt) < new Date();

	// Check if user is already a member
	let alreadyMember = false;
	if (isForThisUser) {
		const existingMember = await db.query.member.findFirst({
			where: and(
				eq(member.userId, locals.user.id),
				eq(member.organizationId, invite.organizationId)
			)
		});
		alreadyMember = !!existingMember;
	}

	const pageData = {
		invite,
		isForThisUser,
		alreadyProcessed,
		isExpired,
		alreadyMember,
		pageHeader: {
			backHref: '/invitations',
			backLabel: 'Back to Invitations'
		}
	};

	console.log('📊 Invitation page data:', {
		invitationId,
		status: invite.status,
		isForThisUser,
		alreadyProcessed,
		isExpired,
		alreadyMember
	});

	return pageData;
};

export const actions = {
	accept: async ({ params, locals }) => {
		const invitationId = params.id;
		const userId = locals.user.id;
		const userEmail = locals.user.email;

		try {
			console.log('🔍 Accept invitation debug:', {
				invitationId,
				userId,
				userEmail
			});

			// Get the invitation with organization details
			const invite = await db.query.invitation.findFirst({
				where: eq(invitation.id, invitationId),
				with: {
					organization: true
				}
			});

			console.log('📧 Invitation from DB:', invite);

			if (!invite) {
				return fail(404, { error: 'Invitation not found' });
			}

			// Check email match (case insensitive)
			if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
				return fail(403, { error: 'This invitation is for a different email address' });
			}

			// Check status
			if (invite.status !== 'pending') {
				return fail(400, { error: `This invitation has already been ${invite.status}` });
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
				createdAt: new Date(),
				updatedAt: new Date()
			});

			// Update invitation status
			await db
				.update(invitation)
				.set({
					status: 'accepted',
					updatedAt: new Date()
				})
				.where(eq(invitation.id, invitationId));

			console.log('✅ Invitation accepted successfully, returning success with space ID');

			// Return success with space ID (client will handle redirect)
			return {
				success: true,
				spaceId: invite.organizationId,
				spaceName: invite.organization?.name
			};
		} catch (err) {
			console.error('Failed to accept invitation:', err);
			return fail(500, { error: 'Failed to accept invitation' });
		}
	},

	decline: async ({ params, locals }) => {
		const invitationId = params.id;
		const userEmail = locals.user.email;

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

			console.log('✅ Invitation declined successfully');

			// Return success (client will handle redirect)
			return {
				success: true
			};
		} catch (err) {
			console.error('Failed to decline invitation:', err);
			return fail(500, { error: 'Failed to decline invitation' });
		}
	}
} satisfies Actions;
