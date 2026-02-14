import { db } from '../db';
import { organization, member, subscription, spaceResourceUsage } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export type OrganizationRole = 'owner' | 'admin' | 'member';

/**
 * Check if a user is a member of a space
 */
export async function canViewSpace(userId: string, spaceId: string): Promise<boolean> {
	const membership = await db.query.member.findFirst({
		where: and(eq(member.userId, userId), eq(member.organizationId, spaceId))
	});

	return membership !== undefined;
}

/**
 * Get user's role in a space (or null if not a member)
 */
export async function getUserSpaceRole(
	userId: string,
	spaceId: string
): Promise<OrganizationRole | null> {
	const membership = await db.query.member.findFirst({
		where: and(eq(member.userId, userId), eq(member.organizationId, spaceId)),
		columns: {
			role: true
		}
	});

	return membership?.role as OrganizationRole | null;
}

/**
 * Check if user can view form submissions
 * Rules:
 * - If space is "client owned" and user is the owner, DENY access (privacy feature)
 * - Otherwise, allow if user is a member
 */
export async function canViewSubmissions(userId: string, spaceId: string): Promise<boolean> {
	const [space, userRole] = await Promise.all([
		db.query.organization.findFirst({
			where: eq(organization.id, spaceId),
			columns: {
				isClientOwned: true
			}
		}),
		getUserSpaceRole(userId, spaceId)
	]);

	if (!space || !userRole) {
		return false;
	}

	// Privacy rule: If space is client-owned and user is owner, deny access
	if (space.isClientOwned && userRole === 'owner') {
		return false;
	}

	// All members (including owner if not client-owned) can view
	return true;
}

/**
 * Check if user can manage the space (settings, delete, etc.)
 * Only owners and admins can manage
 */
export async function canManageSpace(userId: string, spaceId: string): Promise<boolean> {
	const role = await getUserSpaceRole(userId, spaceId);
	return role === 'owner' || role === 'admin';
}

/**
 * Check if user can invite members to the space
 * Rules:
 * - Must be owner or admin
 * - Must not exceed maxUsersPerSpace limit
 */
export async function canInviteUsers(userId: string, spaceId: string): Promise<boolean> {
	const [role, space, usage] = await Promise.all([
		getUserSpaceRole(userId, spaceId),
		db.query.organization.findFirst({
			where: eq(organization.id, spaceId),
			columns: {
				createdBy: true
			}
		}),
		db.query.spaceResourceUsage.findFirst({
			where: eq(spaceResourceUsage.organizationId, spaceId),
			columns: {
				activeMembers: true
			}
		})
	]);

	if (!role || (role !== 'owner' && role !== 'admin') || !space) {
		return false;
	}

	// Get space owner's subscription limits
	const sub = await db.query.subscription.findFirst({
		where: eq(subscription.userId, space.createdBy),
		columns: {
			maxUsersPerSpace: true
		}
	});

	if (!sub || !usage) {
		return false;
	}

	// Check if adding another user would exceed the limit
	return usage.activeMembers < sub.maxUsersPerSpace;
}

/**
 * Require user to be a member of the space, throw error if not
 */
export async function requireSpaceMember(userId: string, spaceId: string): Promise<void> {
	const isMember = await canViewSpace(userId, spaceId);
	if (!isMember) {
		throw error(403, 'You are not a member of this space');
	}
}

/**
 * Require user to be owner or admin, throw error if not
 */
export async function requireSpaceAdmin(userId: string, spaceId: string): Promise<void> {
	const canManage = await canManageSpace(userId, spaceId);
	if (!canManage) {
		throw error(403, 'You do not have permission to manage this space');
	}
}

/**
 * Require user to be able to view submissions, throw error if not
 */
export async function requireSubmissionsAccess(userId: string, spaceId: string): Promise<void> {
	const canView = await canViewSubmissions(userId, spaceId);
	if (!canView) {
		throw error(
			403,
			'You do not have permission to view submissions in this space. This may be a client-owned space where submissions are private.'
		);
	}
}

/**
 * Get user's spaces with their role
 */
export async function getUserSpaces(userId: string) {
	const memberships = await db.query.member.findMany({
		where: eq(member.userId, userId),
		with: {
			organization: true
		}
	});

	return memberships.map((m) => ({
		...m.organization,
		role: m.role as OrganizationRole
	}));
}
