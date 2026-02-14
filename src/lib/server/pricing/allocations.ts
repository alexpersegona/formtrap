/**
 * Resource Allocation Utilities
 *
 * Manages per-space resource allocations for Pro/Business users.
 * Allows users to divide their subscription quota across multiple spaces.
 */

import { db } from '$lib/server/db';
import { spaceResourceAllocation, member } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { getUserSubscription } from './limits';
import { generateId } from 'better-auth';

// ============================================================================
// TYPES
// ============================================================================

export interface SpaceAllocation {
	spaceId: string;
	spaceName: string;
	storagePercentage: number;
	submissionPercentage: number;
	storageIsLocked: boolean;
	submissionIsLocked: boolean;
	allocatedStorageMb: number;
	allocatedSubmissionsPerMonth: number;
}

export interface AllocationSummary {
	totalStorageMb: number;
	totalSubmissionsPerMonth: number;
	allocations: SpaceAllocation[];
	isAutoAllocated: boolean; // true if using default even split
}

// ============================================================================
// ALLOCATION FUNCTIONS
// ============================================================================

/**
 * Get resource allocations for all of a user's spaces
 * If no allocations exist, auto-generates even split
 */
export async function getUserSpaceAllocations(userId: string): Promise<AllocationSummary> {
	const subscription = await getUserSubscription(userId);

	// Get all user's spaces
	const userSpaces = await db.query.member.findMany({
		where: eq(member.userId, userId),
		with: {
			organization: true
		}
	});

	if (userSpaces.length === 0) {
		return {
			totalStorageMb: subscription.maxStorageMb,
			totalSubmissionsPerMonth: subscription.maxSubmissionsPerMonth,
			allocations: [],
			isAutoAllocated: true
		};
	}

	// Check if user has manual allocations
	const existingAllocations = await db.query.spaceResourceAllocation.findMany({
		where: eq(spaceResourceAllocation.userId, userId)
	});

	// If no allocations exist, create auto-split (even distribution)
	if (existingAllocations.length === 0) {
		const autoAllocations = await createAutoSplitAllocations(userId, userSpaces.map(s => s.organizationId));
		return {
			totalStorageMb: subscription.maxStorageMb,
			totalSubmissionsPerMonth: subscription.maxSubmissionsPerMonth,
			allocations: autoAllocations.map(alloc => {
				const space = userSpaces.find(s => s.organizationId === alloc.organizationId)!;
				return {
					spaceId: alloc.organizationId,
					spaceName: space.organization.name,
					storagePercentage: alloc.storagePercentage,
					submissionPercentage: alloc.submissionPercentage,
					storageIsLocked: alloc.storageIsLocked,
					submissionIsLocked: alloc.submissionIsLocked,
					allocatedStorageMb: Math.floor((alloc.storagePercentage / 100) * subscription.maxStorageMb),
					allocatedSubmissionsPerMonth: Math.floor((alloc.submissionPercentage / 100) * subscription.maxSubmissionsPerMonth)
				};
			}),
			isAutoAllocated: true
		};
	}

	// Check if all user spaces have allocations
	// If some spaces are missing, create 0% allocations for them (preserves existing allocations)
	const allocationSpaceIds = new Set(existingAllocations.map(a => a.organizationId));
	const userSpaceIds = userSpaces.map(s => s.organizationId);
	const missingSpaceIds = userSpaceIds.filter(id => !allocationSpaceIds.has(id));

	if (missingSpaceIds.length > 0) {
		// Create 0% allocations for new spaces (preserves existing allocations)
		const newAllocations = missingSpaceIds.map(spaceId => ({
			id: generateId(),
			userId,
			organizationId: spaceId,
			storagePercentage: 0,
			submissionPercentage: 0,
			storageIsLocked: false,
			submissionIsLocked: false,
			createdAt: new Date(),
			updatedAt: new Date()
		}));

		await db.insert(spaceResourceAllocation).values(newAllocations);

		// Add to existing allocations array
		existingAllocations.push(...newAllocations.map(a => ({
			...a,
			userId,
			organizationId: a.organizationId,
			storagePercentage: a.storagePercentage,
			submissionPercentage: a.submissionPercentage,
			storageIsLocked: a.storageIsLocked,
			submissionIsLocked: a.submissionIsLocked
		})));
	}

	// Map existing allocations to SpaceAllocation format
	const allocations: SpaceAllocation[] = existingAllocations.map(alloc => {
		const space = userSpaces.find(s => s.organizationId === alloc.organizationId)!;
		return {
			spaceId: alloc.organizationId,
			spaceName: space.organization.name,
			storagePercentage: alloc.storagePercentage,
			submissionPercentage: alloc.submissionPercentage,
			storageIsLocked: alloc.storageIsLocked ?? false,
			submissionIsLocked: alloc.submissionIsLocked ?? false,
			allocatedStorageMb: Math.floor((alloc.storagePercentage / 100) * subscription.maxStorageMb),
			allocatedSubmissionsPerMonth: Math.floor((alloc.submissionPercentage / 100) * subscription.maxSubmissionsPerMonth)
		};
	});

	return {
		totalStorageMb: subscription.maxStorageMb,
		totalSubmissionsPerMonth: subscription.maxSubmissionsPerMonth,
		allocations,
		isAutoAllocated: false
	};
}

/**
 * Get allocation for a specific space
 * Returns null if space doesn't belong to user
 */
export async function getSpaceAllocation(
	userId: string,
	spaceId: string
): Promise<SpaceAllocation | null> {
	const summary = await getUserSpaceAllocations(userId);
	return summary.allocations.find(a => a.spaceId === spaceId) || null;
}

/**
 * Create auto-split allocations (even distribution across all spaces)
 * This is the default when no manual allocations exist
 */
async function createAutoSplitAllocations(
	userId: string,
	spaceIds: string[]
): Promise<Array<{ organizationId: string; storagePercentage: number; submissionPercentage: number }>> {
	if (spaceIds.length === 0) return [];

	// Even split across all spaces
	const percentage = Math.floor(100 / spaceIds.length);
	const remainder = 100 - (percentage * spaceIds.length);

	const allocations = spaceIds.map((spaceId, index) => ({
		id: generateId(),
		userId,
		organizationId: spaceId,
		// Give remainder to first space to ensure total = 100%
		storagePercentage: index === 0 ? percentage + remainder : percentage,
		submissionPercentage: index === 0 ? percentage + remainder : percentage,
		storageIsLocked: false,
		submissionIsLocked: false,
		createdAt: new Date(),
		updatedAt: new Date()
	}));

	// Insert allocations into database
	await db.insert(spaceResourceAllocation).values(allocations);

	return allocations;
}

/**
 * Update allocations manually (Pro/Business only)
 * Validates that percentages sum to 100%
 */
export async function updateSpaceAllocations(
	userId: string,
	allocations: Array<{
		spaceId: string;
		storagePercentage: number;
		submissionPercentage: number;
		storageIsLocked?: boolean;
		submissionIsLocked?: boolean;
	}>
): Promise<{ success: boolean; error?: string }> {
	// Validate: all percentages must be 0-100
	for (const alloc of allocations) {
		if (alloc.storagePercentage < 0 || alloc.storagePercentage > 100) {
			return { success: false, error: 'Storage percentage must be between 0 and 100' };
		}
		if (alloc.submissionPercentage < 0 || alloc.submissionPercentage > 100) {
			return { success: false, error: 'Submission percentage must be between 0 and 100' };
		}
	}

	// Validate: storage percentages must sum to 100 (with tolerance for floating point)
	const totalStoragePercentage = allocations.reduce((sum, a) => sum + a.storagePercentage, 0);
	if (Math.abs(totalStoragePercentage - 100) > 0.1) {
		return {
			success: false,
			error: `Storage percentages must sum to 100% (currently ${totalStoragePercentage.toFixed(2)}%)`
		};
	}

	// Validate: submission percentages must sum to 100 (with tolerance for floating point)
	const totalSubmissionPercentage = allocations.reduce((sum, a) => sum + a.submissionPercentage, 0);
	if (Math.abs(totalSubmissionPercentage - 100) > 0.1) {
		return {
			success: false,
			error: `Submission percentages must sum to 100% (currently ${totalSubmissionPercentage.toFixed(2)}%)`
		};
	}

	// Validate: user owns all these spaces
	const userSpaces = await db.query.member.findMany({
		where: eq(member.userId, userId)
	});
	const userSpaceIds = new Set(userSpaces.map(s => s.organizationId));
	for (const alloc of allocations) {
		if (!userSpaceIds.has(alloc.spaceId)) {
			return { success: false, error: 'You do not have access to one or more spaces' };
		}
	}

	// Delete existing allocations
	await db.delete(spaceResourceAllocation).where(eq(spaceResourceAllocation.userId, userId));

	// Insert new allocations
	const newAllocations = allocations.map(alloc => ({
		id: generateId(),
		userId,
		organizationId: alloc.spaceId,
		storagePercentage: alloc.storagePercentage,
		submissionPercentage: alloc.submissionPercentage,
		storageIsLocked: alloc.storageIsLocked ?? false,
		submissionIsLocked: alloc.submissionIsLocked ?? false,
		createdAt: new Date(),
		updatedAt: new Date()
	}));

	await db.insert(spaceResourceAllocation).values(newAllocations);

	return { success: true };
}

/**
 * Reset allocations to auto-split (even distribution)
 */
export async function resetToAutoSplit(userId: string): Promise<void> {
	// Delete existing allocations
	await db.delete(spaceResourceAllocation).where(eq(spaceResourceAllocation.userId, userId));

	// Auto-split will be recreated on next getUserSpaceAllocations call
}

/**
 * When a new space is added, recalculate auto-split for all spaces
 * Only if user is using auto-allocation (no manual allocations)
 */
export async function handleNewSpace(userId: string, newSpaceId: string): Promise<void> {
	const existingAllocations = await db.query.spaceResourceAllocation.findMany({
		where: eq(spaceResourceAllocation.userId, userId)
	});

	// If user has manual allocations, don't auto-adjust
	// They'll need to manually reallocate
	if (existingAllocations.length > 0) {
		// Check if allocations were auto-generated (all equal percentages)
		const percentages = existingAllocations.map(a => a.storagePercentage);
		const isAutoSplit = percentages.every(p => p === percentages[0]);

		if (!isAutoSplit) {
			// Manual allocations - don't touch them
			// User will see warning in UI that allocations don't sum to 100%
			return;
		}
	}

	// Reset to auto-split to include new space
	await resetToAutoSplit(userId);
}

/**
 * When a space is deleted, recalculate allocations
 */
export async function handleDeletedSpace(userId: string, deletedSpaceId: string): Promise<void> {
	// Delete allocation for this space
	await db
		.delete(spaceResourceAllocation)
		.where(
			and(
				eq(spaceResourceAllocation.userId, userId),
				eq(spaceResourceAllocation.organizationId, deletedSpaceId)
			)
		);

	// Get remaining allocations
	const remainingAllocations = await db.query.spaceResourceAllocation.findMany({
		where: eq(spaceResourceAllocation.userId, userId)
	});

	// If user had manual allocations, they're now invalid (don't sum to 100%)
	// Reset to auto-split
	if (remainingAllocations.length > 0) {
		await resetToAutoSplit(userId);
	}
}
