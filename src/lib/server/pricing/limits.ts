/**
 * Pricing & Limits Utilities
 *
 * Functions for checking user subscription limits and enforcing tier restrictions.
 * Reference: /PRICING.md
 */

import { db } from '$lib/server/db';
import {
	subscription,
	member,
	form,
	spaceResourceUsage,
	spaceResourceAllocation
} from '$lib/server/db/schema';
import { eq, and, sum } from 'drizzle-orm';
import { TIER_LIMITS, TIERS, OVERAGE_MODES, type SubscriptionTier } from './constants';

// ============================================================================
// BILLING CYCLE HELPERS
// ============================================================================

/**
 * Check if the current billing period has ended and needs to be reset
 * This is used to determine if monthly quotas (submissions, etc.) should reset
 */
export async function shouldResetBillingPeriod(userId: string): Promise<boolean> {
	const sub = await getUserSubscription(userId);

	// Free tier or no period dates set - don't reset (will be set when subscription starts)
	if (!sub.currentPeriodEnd) {
		return false;
	}

	const now = new Date();
	const periodEnd = new Date(sub.currentPeriodEnd);

	// If we're past the end of the current period, we should reset
	return now > periodEnd;
}

/**
 * Reset monthly usage counters for all spaces owned by a user
 * Should be called when a new billing period starts
 */
export async function resetMonthlyUsage(userId: string): Promise<void> {
	// Get all user's spaces
	const userSpaces = await db.query.member.findMany({
		where: eq(member.userId, userId)
	});

	const spaceIds = userSpaces.map((m) => m.organizationId);

	// Reset submission counters for each space
	for (const spaceId of spaceIds) {
		await db
			.update(spaceResourceUsage)
			.set({
				submissionsThisMonth: 0,
				updatedAt: new Date()
			})
			.where(eq(spaceResourceUsage.organizationId, spaceId));
	}
}

// ============================================================================
// TYPES
// ============================================================================

export interface LimitCheckResult {
	allowed: boolean;
	reason?: string;
	currentUsage?: number;
	limit?: number;
}

export interface UserUsage {
	// Spaces
	currentSpaces: number;
	maxSpaces: number;

	// Submissions
	submissionsThisMonth: number;
	maxSubmissionsPerMonth: number;

	// Storage
	usedStorageMb: number;
	maxStorageMb: number;

	// Tier info
	tier: SubscriptionTier;
	overageMode: 'pause' | 'auto_bill';
}

export interface SpaceUsageWithLimits {
	spaceId: string;
	spaceName: string;

	// Actual usage
	usedStorageMb: number;
	submissionsThisMonth: number;
	totalSubmissions: number;
	activeMembers: number;
	activeForms: number;

	// Allocated limits (based on percentage allocation)
	allocatedStorageMb: number;
	allocatedSubmissionsPerMonth: number;

	// Allocation percentages
	storagePercentage: number;
	submissionPercentage: number;

	// Usage percentages
	storageUsagePercent: number;
	submissionUsagePercent: number;
}

// ============================================================================
// SUBSCRIPTION & TIER FUNCTIONS
// ============================================================================

/**
 * Get user's subscription with tier info
 */
export async function getUserSubscription(userId: string) {
	const sub = await db.query.subscription.findFirst({
		where: eq(subscription.userId, userId)
	});

	// If no subscription exists, return default free tier
	if (!sub) {
		return {
			userId,
			tier: TIERS.FREE as SubscriptionTier,
			...TIER_LIMITS.free,
			overageMode: OVERAGE_MODES.PAUSE,
			status: 'active'
		};
	}

	return sub;
}

/**
 * Get limits for a specific tier
 */
export function getTierLimits(tier: SubscriptionTier) {
	return TIER_LIMITS[tier];
}

// ============================================================================
// SPACE LIMITS
// ============================================================================

/**
 * Check if user can create a new space
 */
export async function canCreateSpace(userId: string): Promise<LimitCheckResult> {
	const sub = await getUserSubscription(userId);

	// Count user's current spaces (they are a member of)
	const currentSpaces = await db.query.member.findMany({
		where: eq(member.userId, userId)
	});

	const currentCount = currentSpaces.length;
	const limit = sub.maxSpaces;

	if (currentCount >= limit) {
		return {
			allowed: false,
			reason: `You have reached your space limit (${limit}). Upgrade your plan to create more spaces.`,
			currentUsage: currentCount,
			limit
		};
	}

	return {
		allowed: true,
		currentUsage: currentCount,
		limit
	};
}

// ============================================================================
// FORM LIMITS
// ============================================================================

/**
 * Check if a space can create more forms
 */
export async function canCreateForm(
	organizationId: string,
	userId: string
): Promise<LimitCheckResult> {
	const sub = await getUserSubscription(userId);

	// Count current forms in this space
	const currentForms = await db.query.form.findMany({
		where: eq(form.organizationId, organizationId)
	});

	const currentCount = currentForms.length;
	const limit = sub.maxFormsPerSpace;

	// If unlimited (-1), allow
	if (limit === -1) {
		return {
			allowed: true,
			currentUsage: currentCount,
			limit: -1
		};
	}

	if (currentCount >= limit) {
		return {
			allowed: false,
			reason: `This space has reached its form limit (${limit}). Upgrade your plan to create more forms.`,
			currentUsage: currentCount,
			limit
		};
	}

	return {
		allowed: true,
		currentUsage: currentCount,
		limit
	};
}

// ============================================================================
// USER/MEMBER LIMITS
// ============================================================================

/**
 * Check if a space can add more users
 */
export async function canAddUser(
	organizationId: string,
	userId: string
): Promise<LimitCheckResult> {
	const sub = await getUserSubscription(userId);

	// Count current members in this space
	const currentMembers = await db.query.member.findMany({
		where: eq(member.organizationId, organizationId)
	});

	const currentCount = currentMembers.length;
	const limit = sub.maxUsersPerSpace;

	// If unlimited (-1), allow
	if (limit === -1) {
		return {
			allowed: true,
			currentUsage: currentCount,
			limit: -1
		};
	}

	if (currentCount >= limit) {
		return {
			allowed: false,
			reason: `This space has reached its user limit (${limit}). Upgrade your plan to add more users.`,
			currentUsage: currentCount,
			limit
		};
	}

	return {
		allowed: true,
		currentUsage: currentCount,
		limit
	};
}

// ============================================================================
// SUBMISSION LIMITS
// ============================================================================

/**
 * Check if user can accept a new submission for a specific space
 * Considers per-space allocated limits, overage mode, and billing cycle resets
 */
export async function canAcceptSubmission(
	userId: string,
	organizationId: string
): Promise<LimitCheckResult> {
	// Check if billing period has ended and reset counters if needed
	const shouldReset = await shouldResetBillingPeriod(userId);
	if (shouldReset) {
		await resetMonthlyUsage(userId);
	}

	const sub = await getUserSubscription(userId);

	// Get per-space allocation
	const { getSpaceAllocation } = await import('./allocations');
	const allocation = await getSpaceAllocation(userId, organizationId);

	if (!allocation) {
		// User doesn't own this space
		return {
			allowed: false,
			reason: 'You do not have access to this space'
		};
	}

	// Get space usage
	const usage = await db.query.spaceResourceUsage.findFirst({
		where: eq(spaceResourceUsage.organizationId, organizationId)
	});

	if (!usage) {
		// No usage record yet, allow
		return { allowed: true };
	}

	// Check if over this space's allocated limit (not global limit)
	const allocatedLimit = allocation.allocatedSubmissionsPerMonth;
	const isOverLimit = usage.submissionsThisMonth >= allocatedLimit;

	if (!isOverLimit) {
		return {
			allowed: true,
			currentUsage: usage.submissionsThisMonth,
			limit: allocatedLimit
		};
	}

	// Over limit - check overage mode
	if (sub.overageMode === OVERAGE_MODES.AUTO_BILL) {
		// Allow submission, will bill overage at end of month
		return {
			allowed: true,
			currentUsage: usage.submissionsThisMonth,
			limit: allocatedLimit
		};
	}

	// Pause mode - reject submission
	return {
		allowed: false,
		reason: `This space has reached its monthly submission limit (${allocatedLimit.toLocaleString()}). Reallocate resources or upgrade your plan.`,
		currentUsage: usage.submissionsThisMonth,
		limit: allocatedLimit
	};
}

// ============================================================================
// STORAGE LIMITS
// ============================================================================

/**
 * Check if user can upload a file of given size to a specific space
 * Considers per-space allocated storage limits and overage mode
 */
export async function canUploadFile(
	userId: string,
	organizationId: string,
	fileSizeMb: number
): Promise<LimitCheckResult> {
	const sub = await getUserSubscription(userId);

	// Get per-space allocation
	const { getSpaceAllocation } = await import('./allocations');
	const allocation = await getSpaceAllocation(userId, organizationId);

	if (!allocation) {
		// User doesn't own this space
		return {
			allowed: false,
			reason: 'You do not have access to this space'
		};
	}

	// Get this space's current storage usage
	const usage = await db.query.spaceResourceUsage.findFirst({
		where: eq(spaceResourceUsage.organizationId, organizationId)
	});

	const currentStorageMb = usage?.usedStorageMb || 0;
	const allocatedLimit = allocation.allocatedStorageMb;

	// Check if upload would exceed this space's allocated limit
	const wouldExceedLimit = currentStorageMb + fileSizeMb > allocatedLimit;

	if (!wouldExceedLimit) {
		return {
			allowed: true,
			currentUsage: currentStorageMb,
			limit: allocatedLimit
		};
	}

	// Would exceed limit - check overage mode
	if (sub.overageMode === OVERAGE_MODES.AUTO_BILL) {
		// Allow upload, will bill overage at end of month
		return {
			allowed: true,
			currentUsage: currentStorageMb,
			limit: allocatedLimit
		};
	}

	// Pause mode - reject upload
	return {
		allowed: false,
		reason: `This space has reached its storage limit (${allocatedLimit}MB). Reallocate resources or upgrade your plan.`,
		currentUsage: currentStorageMb,
		limit: allocatedLimit
	};
}

// ============================================================================
// USAGE SUMMARY
// ============================================================================

/**
 * Get comprehensive usage statistics for a user
 * Automatically resets counters if billing period has ended
 */
export async function getCurrentUsage(userId: string): Promise<UserUsage> {
	try {
		// Check if billing period has ended and reset counters if needed
		const shouldReset = await shouldResetBillingPeriod(userId);
		if (shouldReset) {
			await resetMonthlyUsage(userId);
		}
	} catch (error) {
		console.error('Error checking/resetting billing period:', error);
		// Continue anyway - this is not critical for usage display
	}

	const sub = await getUserSubscription(userId);

	// Get all user's spaces
	const userSpaces = await db.query.member.findMany({
		where: eq(member.userId, userId)
	});

	const spaceIds = userSpaces.map((m) => m.organizationId);

	// Sum up storage and submissions across all spaces
	let totalStorageMb = 0;
	let totalSubmissionsThisMonth = 0;

	for (const spaceId of spaceIds) {
		const usage = await db.query.spaceResourceUsage.findFirst({
			where: eq(spaceResourceUsage.organizationId, spaceId)
		});
		if (usage) {
			totalStorageMb += usage.usedStorageMb;
			totalSubmissionsThisMonth += usage.submissionsThisMonth;
		}
	}

	return {
		currentSpaces: userSpaces.length,
		maxSpaces: sub.maxSpaces,
		submissionsThisMonth: totalSubmissionsThisMonth,
		maxSubmissionsPerMonth: sub.maxSubmissionsPerMonth,
		usedStorageMb: totalStorageMb,
		maxStorageMb: sub.maxStorageMb,
		tier: sub.tier as SubscriptionTier,
		overageMode: sub.overageMode as 'pause' | 'auto_bill'
	};
}

/**
 * Get per-space usage with allocated limits
 * Shows how much each space is using relative to its allocation
 */
export async function getSpaceUsageWithLimits(
	userId: string,
	allocations: import('./allocations').AllocationSummary
): Promise<SpaceUsageWithLimits[]> {
	const spaceUsages: SpaceUsageWithLimits[] = [];

	for (const allocation of allocations.allocations) {
		// Get actual usage for this space
		const usage = await db.query.spaceResourceUsage.findFirst({
			where: eq(spaceResourceUsage.organizationId, allocation.spaceId)
		});

		const usedStorageMb = usage?.usedStorageMb || 0;
		const submissionsThisMonth = usage?.submissionsThisMonth || 0;

		spaceUsages.push({
			spaceId: allocation.spaceId,
			spaceName: allocation.spaceName,

			// Actual usage
			usedStorageMb,
			submissionsThisMonth,
			totalSubmissions: usage?.totalSubmissions || 0,
			activeMembers: usage?.activeMembers || 0,
			activeForms: usage?.activeForms || 0,

			// Allocated limits
			allocatedStorageMb: allocation.allocatedStorageMb,
			allocatedSubmissionsPerMonth: allocation.allocatedSubmissionsPerMonth,

			// Percentages
			storagePercentage: allocation.storagePercentage,
			submissionPercentage: allocation.submissionPercentage,

			// Usage percentages
			storageUsagePercent:
				allocation.allocatedStorageMb > 0
					? Math.min((usedStorageMb / allocation.allocatedStorageMb) * 100, 100)
					: 0,
			submissionUsagePercent:
				allocation.allocatedSubmissionsPerMonth > 0
					? Math.min((submissionsThisMonth / allocation.allocatedSubmissionsPerMonth) * 100, 100)
					: 0
		});
	}

	return spaceUsages;
}

// ============================================================================
// FEATURE CHECKS
// ============================================================================

/**
 * Check if user's tier has access to a specific feature
 */
export async function hasFeature(
	userId: string,
	feature: keyof typeof TIER_LIMITS.free
): Promise<boolean> {
	const sub = await getUserSubscription(userId);
	const limits = getTierLimits(sub.tier as SubscriptionTier);

	// Type-safe feature check
	return Boolean(limits[feature]);
}

/**
 * Require a feature or throw an error
 * Useful for API route guards
 */
export async function requireFeature(
	userId: string,
	feature: keyof typeof TIER_LIMITS.free,
	featureName: string
): Promise<void> {
	const hasAccess = await hasFeature(userId, feature);

	if (!hasAccess) {
		const sub = await getUserSubscription(userId);
		throw new Error(
			`This feature (${featureName}) is not available on the ${sub.tier} tier. Please upgrade your plan.`
		);
	}
}
