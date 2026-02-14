/**
 * Subscription Management Utilities
 *
 * Handles subscription tier updates, ensuring all limits and business logic
 * are properly applied when a user's subscription changes.
 */

import { db } from '$lib/server/db';
import { subscription, user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { TIER_LIMITS, TIERS, type SubscriptionTier } from './constants';
import { resetToAutoSplit } from './allocations';

/**
 * Update a user's subscription tier
 *
 * This is the single source of truth for tier changes. Use this for:
 * - Payment provider webhook subscription updates (Stripe, Polar, etc.)
 * - Manual admin/testing tier changes
 * - Downgrades/upgrades
 *
 * Automatically applies all tier limits and triggers business logic.
 */
export async function updateUserSubscription(
	userId: string,
	newTier: SubscriptionTier,
	options?: {
		paymentProvider?: 'stripe' | 'polar';
		paymentCustomerId?: string;
		paymentSubscriptionId?: string;
		paymentPriceId?: string;
		currentPeriodStart?: Date;
		currentPeriodEnd?: Date;
	}
): Promise<void> {
	// Validate tier
	if (!Object.values(TIERS).includes(newTier)) {
		throw new Error(`Invalid subscription tier: ${newTier}`);
	}

	// Get limits for the new tier
	const limits = TIER_LIMITS[newTier];

	// Get existing subscription
	const existingSub = await db.query.subscription.findFirst({
		where: eq(subscription.userId, userId)
	});

	if (!existingSub) {
		throw new Error(`No subscription found for user ${userId}`);
	}

	// Update subscription with new tier and limits
	await db
		.update(subscription)
		.set({
			tier: newTier,
			maxSpaces: limits.maxSpaces,
			maxFormsPerSpace: limits.maxFormsPerSpace,
			maxUsersPerSpace: limits.maxUsersPerSpace,
			maxSubmissionsPerMonth: limits.maxSubmissionsPerMonth,
			maxStorageMb: limits.maxStorageMb,
			retentionDays: limits.retentionDays,
			...(options?.paymentProvider && { paymentProvider: options.paymentProvider }),
			...(options?.paymentCustomerId && { paymentCustomerId: options.paymentCustomerId }),
			...(options?.paymentSubscriptionId && { paymentSubscriptionId: options.paymentSubscriptionId }),
			...(options?.paymentPriceId && { paymentPriceId: options.paymentPriceId }),
			...(options?.currentPeriodStart && { currentPeriodStart: options.currentPeriodStart }),
			...(options?.currentPeriodEnd && { currentPeriodEnd: options.currentPeriodEnd }),
			updatedAt: new Date()
		})
		.where(eq(subscription.userId, userId));

	// Business logic: Reset resource allocations to auto-split
	// This ensures the user's new limits are evenly distributed across spaces
	await resetToAutoSplit(userId);

	// TODO: Add more business logic as needed:
	// - Send notification email about tier change
	// - Log tier change event
	// - Update analytics/metrics
}

/**
 * Update subscription for testing/development
 * Convenience wrapper around updateUserSubscription for testing
 */
export async function setTestSubscription(
	userIdOrEmail: string,
	tier: SubscriptionTier
): Promise<void> {
	// Check if input is email or userId
	let userId: string;

	if (userIdOrEmail.includes('@')) {
		// It's an email, look up the user
		const foundUser = await db.query.user.findFirst({
			where: eq(user.email, userIdOrEmail)
		});

		if (!foundUser) {
			throw new Error(`User not found with email: ${userIdOrEmail}`);
		}

		userId = foundUser.id;
	} else {
		userId = userIdOrEmail;
	}

	await updateUserSubscription(userId, tier);

	console.log(`✅ Set ${userIdOrEmail} to ${tier} tier`);
}
