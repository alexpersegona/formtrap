import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { invitation, organization, member } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireSpaceAdmin } from '$lib/server/spaces/permissions';
import { nanoid } from 'nanoid';
import { sendInvitationEmail } from '$lib/server/email-invitation';
import { env } from '$env/dynamic/private';
import { isFreeTrial } from '$lib/server/form-db';
import { PLAN_LIMITS } from '$lib/server/pricing/constants';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const userId = locals.user.id;
	const spaceId = params.id;

	// Only admins can invite
	await requireSpaceAdmin(userId, spaceId);

	// Get space details
	const space = await db.query.organization.findFirst({
		where: eq(organization.id, spaceId)
	});

	if (!space) {
		throw new Error('Space not found');
	}

	// Preserve tab parameter if present
	const tabParam = url.searchParams.get('tab');
	const backHref = tabParam ? `/spaces/${spaceId}?tab=${tabParam}` : `/spaces/${spaceId}`;

	return {
		space,
		pageHeader: {
			backHref,
			backLabel: 'Back to Space'
		}
	};
};

export const actions = {
	default: async ({ request, locals, params }) => {
		const userId = locals.user.id;
		const spaceId = params.id;

		// Only admins can invite
		await requireSpaceAdmin(userId, spaceId);

		const formData = await request.formData();
		const email = formData.get('email')?.toString();
		const role = formData.get('role')?.toString();

		// Validation
		if (!email || !email.includes('@')) {
			return fail(400, {
				email,
				role,
				errors: { email: 'Please enter a valid email address' }
			});
		}

		if (!role || !['member', 'admin'].includes(role)) {
			return fail(400, {
				email,
				role,
				errors: { role: 'Please select a valid role' }
			});
		}

		// Check member limit for this space
		const freeTrial = await isFreeTrial(userId);
		const maxMembers = freeTrial ? PLAN_LIMITS.free.maxMembersPerSpace : PLAN_LIMITS.pro.maxMembersPerSpace;
		const currentMembers = await db.query.member.findMany({
			where: eq(member.organizationId, spaceId)
		});
		if (currentMembers.length >= maxMembers) {
			return fail(403, {
				email,
				role,
				errors: {
					general: `This space has reached its member limit (${maxMembers}). ${freeTrial ? 'Connect your infrastructure to add more members.' : 'Maximum members per space reached.'}`
				}
			});
		}

		try {
			// Check for existing pending invitation
			const existingInvite = await db.query.invitation.findFirst({
				where: and(
					eq(invitation.organizationId, spaceId),
					eq(invitation.email, email),
					eq(invitation.status, 'pending')
				)
			});

			if (existingInvite) {
				// Check if it's expired
				if (new Date(existingInvite.expiresAt) > new Date()) {
					return fail(400, {
						email,
						role,
						errors: {
							email: 'An invitation has already been sent to this email address'
						}
					});
				}
				// If expired, we can create a new one (will fall through)
			}


			// Create invitation
			const expiresAt = new Date();
			expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

			const inviteId = nanoid();

			await db.insert(invitation).values({
				id: inviteId,
				organizationId: spaceId,
				email,
				role,
				status: 'pending',
				expiresAt,
				inviterId: userId,
				createdAt: new Date(),
				updatedAt: new Date()
			});

			// Get space details for email
			const space = await db.query.organization.findFirst({
				where: eq(organization.id, spaceId)
			});

			// Send invitation email with unique invitation ID
			const baseUrl = env.PUBLIC_BASE_URL || 'http://localhost:5173';
			const invitationUrl = `${baseUrl}/invitations/${inviteId}`;

			await sendInvitationEmail(email, locals.user.name, space!.name, invitationUrl);
		} catch (err) {
			console.error('Failed to create invitation:', err);
			return fail(500, {
				email,
				role,
				errors: { general: 'Failed to send invitation' }
			});
		}

		// Return success (client will handle navigation)
		return {
			success: true,
			email
		};
	}
} satisfies Actions;
