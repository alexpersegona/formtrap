# Pricing Structure & Implementation Guide

This document defines the pricing tiers, limits, and implementation details for tier-gating features throughout the codebase.

---

## Pricing Tiers

| Feature                   | Free               | Pro                                       | Business                                   |
| ------------------------- | ------------------ | ----------------------------------------- | ------------------------------------------ |
| **Monthly Price**         | $0                 | $29                                       | $79                                        |
| **Annual Price**          | —                  | $278/year<br/>($23/month)<br/>💰 Save $70 | $758/year<br/>($63/month)<br/>💰 Save $190 |
|                           |                    |                                           |                                            |
| **CORE LIMITS**           |                    |                                           |                                            |
| Spaces (Clients)          | 1                  | 25                                        | 100                                        |
| Forms per space           | 3                  | Unlimited                                 | Unlimited                                  |
| Client & team users       | 5                  | 50                                        | Unlimited                                  |
| Submissions per month     | 100                | 5,000                                     | 50,000                                     |
| File storage              | 100MB              | 10GB                                      | 50GB                                       |
| Data retention            | 30 days<br/>(fixed) | Up to 1 year<br/>(configurable per space) | Up to 3 years<br/>(configurable per space) |
| Overage handling          | Hard stop (pause forms) | User choice:<br/>• Pause forms<br/>• Auto-bill overages | User choice:<br/>• Pause forms<br/>• Auto-bill overages |
|                           |                    |                                           |                                            |
| **CLIENT ACCESS**         |                    |                                           |                                            |
| Client-scoped logins      | ✓                  | ✓                                         | ✓                                          |
| Client portal dashboard   | ✓                  | ✓                                         | ✓                                          |
| Team roles                | ✓ Owner, Admin, Member | ✓ Owner, Admin, Member               | ✓ Owner, Admin, Member                     |
| Per-seat fees             | **None**           | **None**                                  | **None**                                   |
|                           |                    |                                           |                                            |
| **NOTIFICATIONS**         |                    |                                           |                                            |
| Email notifications       | ✓ All users        | ✓ All users                               | ✓ All users                                |
| Custom email templates    | ✗                  | ✓                                         | ✓                                          |
| Remove "Powered by" badge | ✗                  | ✗                                         | ✓                                          |
|                           |                    |                                           |                                            |
| **INTEGRATIONS**          |                    |                                           |                                            |
| Webhooks                  | ✗                  | ✓                                         | ✓                                          |
| REST API access           | ✗                  | ✓ Read-only                               | ✓ Full access                              |
| Zapier/Make integration   | ✗                  | ✓                                         | ✓                                          |
|                           |                    |                                           |                                            |
| **SECURITY & COMPLIANCE** |                    |                                           |                                            |
| Spam protection           | ✓ Basic            | ✓ Advanced                                | ✓ Advanced                                 |
| Cloudflare Turnstile      | ✓                  | ✓                                         | ✓                                          |
| Custom spam rules         | ✗                  | ✓                                         | ✓                                          |
| File virus scanning       | ✗                  | ✓                                         | ✓                                          |
| GDPR compliance tools     | ✓                  | ✓                                         | ✓                                          |
|                           |                    |                                           |                                            |
| **DATA MANAGEMENT**       |                    |                                           |                                            |
| CSV/JSON export           | ✓                  | ✓                                         | ✓                                          |
| Bulk operations           | ✗                  | ✓                                         | ✓                                          |
| Advanced search/filters   | ✗                  | ✓                                         | ✓                                          |
|                           |                    |                                           |                                            |
| **SUPPORT**               |                    |                                           |                                            |
| Help documentation        | ✓                  | ✓                                         | ✓                                          |
| Email support             | ✓ 48-hour          | ✓ 24-hour                                 | ✓ 12-hour                                  |
| Live chat                 | ✗                  | ✗                                         | ✓                                          |

---

## Add-Ons (Pro & Business only)

| Add-On | Price | Notes |
|--------|-------|-------|
| **Extra Submissions** | $10 per 1,000 | Auto-billed monthly when overage mode enabled |
| **Extra Storage** | $5 per 5GB | Auto-billed monthly when overage mode enabled |
| **Extended Retention** | Contact us | 5+ years for compliance needs (Business tier only) |

---

## Tier Constants (for code reference)

```typescript
export const TIERS = {
  FREE: 'free',
  PRO: 'pro',
  BUSINESS: 'business'
} as const;

export type SubscriptionTier = typeof TIERS[keyof typeof TIERS];

export const TIER_LIMITS = {
  free: {
    maxSpaces: 1,
    maxFormsPerSpace: 3,
    maxUsersPerSpace: 5,
    maxSubmissionsPerMonth: 100,
    maxStorageMb: 100,
    retentionDays: 30,
    canConfigureRetention: false,
    canSetOverageMode: false,
    hasWebhooks: false,
    hasApiAccess: false,
    hasCustomEmailTemplates: false,
    hasAdvancedSpamProtection: false,
    hasFileVirusScanning: false,
    hasBulkOperations: false,
    hasAdvancedSearchFilters: false,
    canRemovePoweredByBadge: false,
    apiAccessLevel: null as 'read-only' | 'full' | null
  },
  pro: {
    maxSpaces: 25,
    maxFormsPerSpace: -1, // -1 = unlimited
    maxUsersPerSpace: 50,
    maxSubmissionsPerMonth: 5000,
    maxStorageMb: 10240, // 10GB
    retentionDays: 365, // default, configurable up to 365
    maxRetentionDays: 365,
    canConfigureRetention: true,
    canSetOverageMode: true,
    hasWebhooks: true,
    hasApiAccess: true,
    hasCustomEmailTemplates: true,
    hasAdvancedSpamProtection: true,
    hasFileVirusScanning: true,
    hasBulkOperations: true,
    hasAdvancedSearchFilters: true,
    canRemovePoweredByBadge: false,
    apiAccessLevel: 'read-only' as const
  },
  business: {
    maxSpaces: 100,
    maxFormsPerSpace: -1, // unlimited
    maxUsersPerSpace: -1, // unlimited
    maxSubmissionsPerMonth: 50000,
    maxStorageMb: 51200, // 50GB
    retentionDays: 365, // default, configurable up to 1095
    maxRetentionDays: 1095, // 3 years
    canConfigureRetention: true,
    canSetOverageMode: true,
    hasWebhooks: true,
    hasApiAccess: true,
    hasCustomEmailTemplates: true,
    hasAdvancedSpamProtection: true,
    hasFileVirusScanning: true,
    hasBulkOperations: true,
    hasAdvancedSearchFilters: true,
    canRemovePoweredByBadge: true,
    apiAccessLevel: 'full' as const
  }
} as const;

export const OVERAGE_PRICING = {
  submissions: {
    perThousand: 10 // $10 per 1,000 submissions
  },
  storage: {
    per5GB: 5 // $5 per 5GB
  }
} as const;

export const OVERAGE_MODES = {
  PAUSE: 'pause',
  AUTO_BILL: 'auto_bill'
} as const;

export type OverageMode = typeof OVERAGE_MODES[keyof typeof OVERAGE_MODES];
```

---

## Database Schema Requirements

### 1. Update `subscription` table

**Changes needed:**
- Update `tier` enum values to: `'free' | 'pro' | 'business'` (remove 'basic', 'enterprise')
- Update default limits to match new pricing
- Add `overageMode` field
- Add `retentionDays` field
- Add billing cycle tracking

**Recommended fields:**
```typescript
export const subscription = pgTable('subscription', {
  // ... existing fields ...

  tier: text('tier').notNull().default('free'), // 'free' | 'pro' | 'business'

  // Updated limits (should match tier on subscription creation)
  maxSpaces: integer('maxSpaces').notNull().default(1),
  maxSubmissionsPerMonth: integer('maxSubmissionsPerMonth').notNull().default(100),
  maxStorageMb: integer('maxStorageMb').notNull().default(100),
  maxUsersPerSpace: integer('maxUsersPerSpace').notNull().default(5),
  maxFormsPerSpace: integer('maxFormsPerSpace').notNull().default(3),

  // NEW FIELDS for pricing v2
  retentionDays: integer('retentionDays').notNull().default(30),
  overageMode: text('overageMode').notNull().default('pause'), // 'pause' | 'auto_bill'
  billingCycle: text('billingCycle').default('monthly'), // 'monthly' | 'annual'

  // ... rest of existing fields ...
});
```

### 2. Add `organization` table field for retention override

**Optional per-space retention** (Pro/Business only):
```typescript
export const organization = pgTable('organization', {
  // ... existing fields ...

  // NEW: Per-space retention override (null = use subscription default)
  dataRetentionDays: integer('dataRetentionDays'), // nullable, Pro: max 365, Business: max 1095

  // ... rest of existing fields ...
});
```

### 3. Create new `usageOverage` table

**Track monthly overage charges:**
```typescript
export const usageOverage = pgTable('usageOverage', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),

  // Billing period
  billingMonth: text('billingMonth').notNull(), // Format: 'YYYY-MM'

  // Overage amounts
  submissionOverage: integer('submissionOverage').notNull().default(0), // count over limit
  storageOverageMb: integer('storageOverageMb').notNull().default(0), // MB over limit

  // Calculated charges
  submissionCharge: integer('submissionCharge').notNull().default(0), // in cents
  storageCharge: integer('storageCharge').notNull().default(0), // in cents
  totalCharge: integer('totalCharge').notNull().default(0), // in cents

  // Payment provider integration (vendor-agnostic)
  paymentInvoiceId: text('paymentInvoiceId'),
  isPaid: boolean('isPaid').default(false),

  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow()
});
```

### 4. Keep existing `spaceResourceUsage` table

**Already tracking usage correctly** - no changes needed:
```typescript
export const spaceResourceUsage = pgTable('spaceResourceUsage', {
  // ✓ Already has: usedStorageMb
  // ✓ Already has: submissionsThisMonth
  // ✓ Already has: totalSubmissions
  // ✓ Already has: activeMembers
  // ✓ Already has: activeForms
  // ✓ Already has: lastMonthlyReset
});
```

---

## Implementation Checklist

### Phase 1: Schema & Database
- [ ] Update `subscription.tier` enum values
- [ ] Add `subscription.retentionDays` field
- [ ] Add `subscription.overageMode` field
- [ ] Add `subscription.billingCycle` field
- [ ] Update `subscription` default limits to match new pricing
- [ ] Add `organization.dataRetentionDays` field (nullable)
- [ ] Create `usageOverage` table
- [ ] Run database migration

### Phase 2: Core Limit Enforcement
- [ ] Create `src/lib/server/pricing/limits.ts` utility
  - [ ] `getUserTier(userId)` - Get user's subscription tier
  - [ ] `getTierLimits(tier)` - Get limits for a tier
  - [ ] `checkSpaceLimit(userId)` - Can user create more spaces?
  - [ ] `checkFormLimit(spaceId)` - Can space create more forms?
  - [ ] `checkUserLimit(spaceId)` - Can space add more users?
  - [ ] `checkSubmissionLimit(userId)` - Can accept more submissions this month?
  - [ ] `checkStorageLimit(userId, fileSize)` - Can upload file?

### Phase 3: Overage Handling
- [ ] Create `src/lib/server/pricing/overage.ts` utility
  - [ ] `calculateSubmissionOverage(userId)` - Calculate monthly overage
  - [ ] `calculateStorageOverage(userId)` - Calculate storage overage
  - [ ] `createOverageInvoice(userId)` - Generate Polar invoice for overages
  - [ ] `handleOverageMode(userId)` - Check mode and take action
- [ ] Add monthly cron job to calculate/bill overages
- [ ] Add overage settings UI (Pro/Business only)

### Phase 4: Retention Enforcement
- [ ] Add daily cron job to delete expired submissions
  - [ ] Get submission retention days (space override OR subscription default)
  - [ ] Delete submissions older than retention period
  - [ ] Delete associated files from R2
- [ ] Add retention configuration UI (Pro/Business only)
- [ ] Show retention info on submission list pages

### Phase 5: Feature Gating (UI)
- [ ] Gate webhooks UI (Pro/Business only)
- [ ] Gate API access (Pro/Business only)
- [ ] Gate custom email templates (Pro/Business only)
- [ ] Gate bulk operations (Pro/Business only)
- [ ] Gate advanced search/filters (Pro/Business only)
- [ ] Show/hide "Powered by" badge based on tier
- [ ] Add "Upgrade" prompts for gated features

### Phase 6: Feature Gating (API/Server)
- [ ] Enforce webhook access in form submission handler
- [ ] Enforce API access in API routes
- [ ] Enforce file virus scanning (Pro/Business only)
- [ ] Enforce advanced spam protection (Pro/Business only)

### Phase 7: Polar Integration
- [ ] Create Polar products for Pro/Business tiers
- [ ] Create Polar prices (monthly/annual)
- [ ] Implement checkout flow
- [ ] Implement webhook handlers for subscription events
  - [ ] `customer.subscription.created` - Update subscription table
  - [ ] `customer.subscription.updated` - Update tier/status
  - [ ] `customer.subscription.deleted` - Downgrade to free
  - [ ] `invoice.paid` - Mark overage as paid
- [ ] Add billing portal link

---

## Usage Tracking Utilities

### Example: Checking submission limit

```typescript
// src/lib/server/pricing/limits.ts
import { db } from '$lib/server/db';
import { subscription, spaceResourceUsage, organization } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { TIER_LIMITS, OVERAGE_MODES } from './constants';

export async function canAcceptSubmission(
  userId: string,
  organizationId: string
): Promise<{ allowed: boolean; reason?: string }> {
  // 1. Get user's subscription
  const sub = await db.query.subscription.findFirst({
    where: eq(subscription.userId, userId)
  });

  if (!sub) {
    return { allowed: false, reason: 'No subscription found' };
  }

  // 2. Get current usage
  const usage = await db.query.spaceResourceUsage.findFirst({
    where: eq(spaceResourceUsage.organizationId, organizationId)
  });

  if (!usage) {
    return { allowed: true }; // No usage yet, allow
  }

  // 3. Check if over limit
  const isOverLimit = usage.submissionsThisMonth >= sub.maxSubmissionsPerMonth;

  if (!isOverLimit) {
    return { allowed: true };
  }

  // 4. If over limit, check overage mode
  if (sub.overageMode === OVERAGE_MODES.AUTO_BILL) {
    // Allow submission, will bill overage at end of month
    return { allowed: true };
  }

  // 5. Pause mode - reject submission
  return {
    allowed: false,
    reason: `Monthly submission limit reached (${sub.maxSubmissionsPerMonth}). Upgrade your plan or enable overage billing.`
  };
}
```

---

## Testing Considerations

### Unit Tests
- [ ] Test tier limit enforcement
- [ ] Test overage calculations
- [ ] Test retention period calculations
- [ ] Test feature gating logic

### Integration Tests
- [ ] Test subscription upgrades/downgrades
- [ ] Test overage billing flow
- [ ] Test retention deletion cron job
- [ ] Test monthly reset logic

### E2E Tests
- [ ] Test hitting submission limit (pause mode)
- [ ] Test hitting submission limit (auto-bill mode)
- [ ] Test space creation limit
- [ ] Test form creation limit
- [ ] Test gated feature access

---

## Migration Strategy

### For Existing Users
1. **Default all existing users to Free tier**
2. **Set overage mode to 'pause'** (safest default)
3. **Set retention to 30 days** for free users
4. **Grandfather clause options:**
   - Option A: Give all existing users 30-day trial of Pro tier
   - Option B: Give all existing users permanent free Pro tier (if small number)
   - Option C: Send email announcing changes with upgrade discount code

### Data Cleanup
1. **Before enforcing retention:** Warn users about upcoming deletion
2. **Soft delete submissions** initially (add `deletedAt` field)
3. **Permanently delete after 7 days** (gives recovery window)

---

## Future Enhancements (Post-MVP)

- [ ] **Custom limits** - Allow manual tier customization per user
- [ ] **Usage analytics dashboard** - Show trends, projections
- [ ] **Overage alerts** - Email warnings at 80%, 90%, 100%
- [ ] **Spending caps** - Let users set max overage spend
- [ ] **Annual prepay discounts** - Additional discount for annual prepay
- [ ] **Referral program** - Give credits for referrals
- [ ] **Custom enterprise plans** - Negotiated limits for large customers

---

## Questions & Decisions

### Decision Log
1. ✅ **Queue overage mode** - Skipped for MVP (too complex)
2. ✅ **Custom domains** - Skipped for MVP (not enough demand expected)
3. ✅ **Audit logs** - Deferred until customer requests
4. ✅ **Advanced form logic** - Deferred to v2
5. ✅ **Free tier retention** - Set to 30 days (was 7, changed for better UX)

### Open Questions
- [ ] How to handle existing data when user downgrades tier?
  - Option A: Keep data but make read-only
  - Option B: Delete excess data after grace period
  - Option C: Force export before downgrade
- [ ] Should overage charges have a daily cap to prevent runaway costs?
- [ ] Should free tier users see their usage stats?

---

## Support Resources

### For Customer Support Team
- **Upgrade prompts:** "You've reached your X limit. Upgrade to Pro for Y"
- **Overage explanations:** "You used X extra submissions this month. Cost: $Y"
- **Downgrade warnings:** "Downgrading will limit you to X. Current usage: Y"

### For Sales Team
- **Pricing comparison sheet** (this document)
- **ROI calculator** - Show cost per submission vs competitors
- **Feature matrix** - Detailed comparison for enterprise prospects

---

**Last Updated:** 2025-01-14
**Version:** 1.0 (Initial pricing structure)
