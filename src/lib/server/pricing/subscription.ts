/**
 * Subscription Management Utilities (BYOI Model)
 *
 * Simplified subscription management - just tier + payment status.
 */

import { db } from '$lib/server/db';
import { subscription } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { TIERS, type SubscriptionTier } from './constants';

/**
 * Get user's subscription tier and status
 */
export async function getUserSubscription(userId: string) {
	const sub = await db.query.subscription.findFirst({
		where: eq(subscription.userId, userId)
	});

	if (!sub) {
		return {
			userId,
			tier: TIERS.FREE as SubscriptionTier,
			status: 'active' as const
		};
	}

	return {
		userId,
		tier: sub.tier as SubscriptionTier,
		status: sub.status
	};
}

/**
 * Update a user's subscription tier
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
	if (!Object.values(TIERS).includes(newTier)) {
		throw new Error(`Invalid subscription tier: ${newTier}`);
	}

	const existingSub = await db.query.subscription.findFirst({
		where: eq(subscription.userId, userId)
	});

	if (!existingSub) {
		throw new Error(`No subscription found for user ${userId}`);
	}

	await db
		.update(subscription)
		.set({
			tier: newTier,
			...(options?.paymentProvider && { paymentProvider: options.paymentProvider }),
			...(options?.paymentCustomerId && { paymentCustomerId: options.paymentCustomerId }),
			...(options?.paymentSubscriptionId && { paymentSubscriptionId: options.paymentSubscriptionId }),
			...(options?.paymentPriceId && { paymentPriceId: options.paymentPriceId }),
			...(options?.currentPeriodStart && { currentPeriodStart: options.currentPeriodStart }),
			...(options?.currentPeriodEnd && { currentPeriodEnd: options.currentPeriodEnd }),
			updatedAt: new Date()
		})
		.where(eq(subscription.userId, userId));
}
