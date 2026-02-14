/**
 * Pricing Tiers & Constants (BYOI Model)
 *
 * Simple two-tier model:
 * - Free: Small hosted trial (1 space, 1 form, 50 submissions, 100MB)
 * - Pro: $20/mo, BYOI (user's own DB + storage), generous platform limits
 */

// ============================================================================
// TIER ENUMS
// ============================================================================

export const TIERS = {
	FREE: 'free',
	PRO: 'pro'
} as const;

export type SubscriptionTier = (typeof TIERS)[keyof typeof TIERS];

// ============================================================================
// PLAN LIMITS
// ============================================================================

/**
 * Platform-level limits (enforced in FormTrap's own DB).
 * Pro tier: forms/submissions/storage are unlimited (user's own infrastructure).
 * -1 means unlimited.
 */
export const PLAN_LIMITS = {
	free: {
		maxSpaces: 1,
		maxFormsPerSpace: 1,
		maxSubmissions: 50,
		maxStorageMb: 100,
		maxMembersPerSpace: 1,
		maxEmailNotificationsPerMonth: 100
	},
	pro: {
		maxSpaces: 25,
		maxFormsPerSpace: -1, // unlimited (user's DB)
		maxSubmissions: -1, // unlimited (user's DB)
		maxStorageMb: -1, // unlimited (user's storage)
		maxMembersPerSpace: 10,
		maxEmailNotificationsPerMonth: 1000
	}
} as const;

// ============================================================================
// PRICING
// ============================================================================

export const TIER_PRICING = {
	free: {
		monthly: 0
	},
	pro: {
		monthly: 20
	}
} as const;

// ============================================================================
// TYPE HELPERS
// ============================================================================

export type PlanLimits = (typeof PLAN_LIMITS)[SubscriptionTier];
