/**
 * Pricing Tiers & Constants
 *
 * This file defines all pricing tiers, limits, and constants for feature gating.
 * Reference: /PRICING.md
 */

// ============================================================================
// TIER ENUMS
// ============================================================================

export const TIERS = {
	FREE: 'free',
	PRO: 'pro',
	BUSINESS: 'business'
} as const;

export type SubscriptionTier = (typeof TIERS)[keyof typeof TIERS];

// ============================================================================
// TIER LIMITS
// ============================================================================

export const TIER_LIMITS = {
	free: {
		// Core limits
		maxSpaces: 1,
		maxFormsPerSpace: 3,
		maxUsersPerSpace: 5,
		maxSubmissionsPerMonth: 100,
		maxStorageMb: 100, // 100MB
		maxNotificationEmails: 2,

		// Retention
		retentionDays: 30,
		maxRetentionDays: 30,
		canConfigureRetention: false,

		// Overage
		canSetOverageMode: false,

		// Features
		hasWebhooks: false,
		hasApiAccess: false,
		hasCustomEmailTemplates: false,
		hasAdvancedSpamProtection: false,
		hasFileVirusScanning: false,
		hasBulkOperations: false,
		hasAdvancedSearchFilters: false,
		canRemovePoweredByBadge: false,

		// API access level
		apiAccessLevel: null as 'read-only' | 'full' | null
	},
	pro: {
		// Core limits
		maxSpaces: 25,
		maxFormsPerSpace: -1, // -1 = unlimited
		maxUsersPerSpace: 50,
		maxSubmissionsPerMonth: 5000,
		maxStorageMb: 10240, // 10GB
		maxNotificationEmails: 5,

		// Retention
		retentionDays: 365, // default, configurable up to 365
		maxRetentionDays: 365, // 1 year
		canConfigureRetention: true,

		// Overage
		canSetOverageMode: true,

		// Features
		hasWebhooks: true,
		hasApiAccess: true,
		hasCustomEmailTemplates: true,
		hasAdvancedSpamProtection: true,
		hasFileVirusScanning: true,
		hasBulkOperations: true,
		hasAdvancedSearchFilters: true,
		canRemovePoweredByBadge: false,

		// API access level
		apiAccessLevel: 'read-only' as const
	},
	business: {
		// Core limits
		maxSpaces: 100,
		maxFormsPerSpace: -1, // unlimited
		maxUsersPerSpace: -1, // unlimited
		maxSubmissionsPerMonth: 50000,
		maxStorageMb: 51200, // 50GB
		maxNotificationEmails: 10,

		// Retention
		retentionDays: 365, // default, configurable up to 1095
		maxRetentionDays: 1095, // 3 years
		canConfigureRetention: true,

		// Overage
		canSetOverageMode: true,

		// Features
		hasWebhooks: true,
		hasApiAccess: true,
		hasCustomEmailTemplates: true,
		hasAdvancedSpamProtection: true,
		hasFileVirusScanning: true,
		hasBulkOperations: true,
		hasAdvancedSearchFilters: true,
		canRemovePoweredByBadge: true,

		// API access level
		apiAccessLevel: 'full' as const
	}
} as const;

// ============================================================================
// OVERAGE PRICING
// ============================================================================

export const OVERAGE_PRICING = {
	submissions: {
		perThousand: 10 // $10 per 1,000 submissions (in dollars)
	},
	storage: {
		per5GB: 5 // $5 per 5GB (in dollars)
	}
} as const;

// ============================================================================
// OVERAGE MODES
// ============================================================================

export const OVERAGE_MODES = {
	PAUSE: 'pause',
	AUTO_BILL: 'auto_bill'
} as const;

export type OverageMode = (typeof OVERAGE_MODES)[keyof typeof OVERAGE_MODES];

// ============================================================================
// BILLING CYCLES
// ============================================================================

export const BILLING_CYCLES = {
	MONTHLY: 'monthly',
	ANNUAL: 'annual'
} as const;

export type BillingCycle = (typeof BILLING_CYCLES)[keyof typeof BILLING_CYCLES];

// ============================================================================
// PRICING (for display/checkout)
// ============================================================================

export const TIER_PRICING = {
	free: {
		monthly: 0,
		annual: 0
	},
	pro: {
		monthly: 29,
		annual: 278 // $23.17/month, saves $70
	},
	business: {
		monthly: 79,
		annual: 758 // $63.17/month, saves $190
	}
} as const;

// ============================================================================
// TYPE HELPERS
// ============================================================================

export type TierLimits = (typeof TIER_LIMITS)[SubscriptionTier];
