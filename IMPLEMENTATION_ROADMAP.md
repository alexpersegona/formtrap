# Implementation Roadmap - Pricing Tiers

This document tracks the implementation plan for rolling out pricing tiers and feature gating.

## Related Documentation

- **[PRICING.md](./PRICING.md)** - Detailed pricing structure, tiers, limits, and business model
- **[WEBHOOKS.md](./WEBHOOKS.md)** - Complete webhooks feature design (Pro/Business feature)

---

## Phase 1: Core Infrastructure & Limits Enforcement

**Goal**: Prevent users from exceeding their tier limits and show upgrade prompts.

### 1.1 Create Pricing Utility Functions
- [ ] Create `src/lib/server/pricing/limits.ts`
  - [ ] `getUserSubscription(userId)` - Get user's subscription with tier info
  - [ ] `getTierLimits(tier)` - Get limits for a specific tier
  - [ ] `canCreateSpace(userId)` - Check space limit
  - [ ] `canCreateForm(spaceId, userId)` - Check form limit per space
  - [ ] `canAddUser(spaceId, userId)` - Check user limit per space
  - [ ] `canAcceptSubmission(userId, organizationId)` - Check monthly submission limit
  - [ ] `canUploadFile(userId, fileSize)` - Check storage limit
  - [ ] `getCurrentUsage(userId)` - Get all current usage stats

- [ ] Create `src/lib/server/pricing/constants.ts`
  - [ ] Export TIER_LIMITS constant
  - [ ] Export OVERAGE_PRICING constant
  - [ ] Export tier enum/types

### 1.2 Enforce Limits in Existing Code

**Space Creation**
- [ ] Update space creation endpoint to check `canCreateSpace()`
- [ ] Show error/upgrade prompt if at limit
- [ ] Disable "Create Space" button in UI if at limit

**Form Creation**
- [ ] Update form creation endpoint to check `canCreateForm()`
- [ ] Show error/upgrade prompt if at limit
- [ ] Disable "Create Form" button in UI if at limit

**User Invitations**
- [ ] Update invitation endpoint to check `canAddUser()`
- [ ] Show error/upgrade prompt if at limit
- [ ] Disable "Invite User" button in UI if at limit

**Form Submissions**
- [ ] Update submission handler to check `canAcceptSubmission()`
- [ ] If overage mode = 'pause': Reject submission with friendly message
- [ ] If overage mode = 'auto_bill': Accept and track overage
- [ ] Show warning when approaching limit (90%)

**File Uploads**
- [ ] Update file upload handler to check `canUploadFile()`
- [ ] Show error/upgrade prompt if would exceed storage
- [ ] Show storage usage in file upload UI

### 1.3 Upgrade Prompts & CTAs

- [ ] Create `<UpgradePrompt>` component
  - [ ] Shows feature name that's locked
  - [ ] Shows current tier vs required tier
  - [ ] "Upgrade to Pro" button
  - [ ] Used throughout app when limits hit

- [ ] Create `<UsageBadge>` component
  - [ ] Shows "X / Y used" with progress bar
  - [ ] Color codes: green (< 70%), yellow (70-90%), red (> 90%)
  - [ ] Click to see full usage dashboard

---

## Phase 2: UI Changes & User Experience

**Goal**: Make pricing tiers visible and help users understand their limits.

### 2.1 Pricing Page (Public)
- [ ] Create `/pricing` route
- [ ] Display pricing comparison table
- [ ] Highlight most popular tier (Pro)
- [ ] "Get Started" buttons (later: link to Polar checkout)
- [ ] FAQ section
- [ ] Responsive design for mobile

### 2.2 Usage Dashboard
- [ ] Create `/dashboard/usage` route (or add to settings)
- [ ] Show current tier with badge
- [ ] Show all usage metrics:
  - [ ] Spaces: X / Y
  - [ ] Submissions this month: X / Y (progress bar)
  - [ ] Storage: X GB / Y GB (progress bar)
  - [ ] Forms: X / Y (per space)
  - [ ] Users: X / Y (per space)
- [ ] Show overage mode setting (Pro/Business only)
- [ ] "Upgrade" CTA if on Free tier
- [ ] "Manage Billing" link if on paid tier

### 2.3 Feature Gating in UI

**Webhooks** (See [WEBHOOKS.md](./WEBHOOKS.md) for complete feature design)
- [ ] Hide webhook settings for Free tier
- [ ] Show "⭐ Pro Feature" badge
- [ ] Click badge → upgrade prompt

**API Access**
- [ ] Hide API keys section for Free tier
- [ ] Show "⭐ Pro Feature" badge
- [ ] For Pro tier: Show "Read-only API access"
- [ ] For Business tier: Show "Full API access"

**Custom Email Templates**
- [ ] Hide custom templates UI for Free tier
- [ ] Show "⭐ Pro Feature" badge

**Bulk Operations**
- [ ] Disable bulk delete/export for Free tier
- [ ] Show "⭐ Pro Feature" tooltip

**Advanced Filters**
- [ ] Hide advanced filter options for Free tier
- [ ] Show basic filters only
- [ ] "⭐ Pro Feature" on locked filters

**"Powered by" Badge**
- [ ] Show badge on all tiers except Business
- [ ] Hide for Business tier only

### 2.4 Onboarding & Education
- [ ] Show tier limits on first login
- [ ] Tooltip tour of features by tier
- [ ] Email after signup explaining Free tier limits
- [ ] Email when approaching limits (90%)

---

## Phase 3: Polar Integration & Billing

**Goal**: Allow users to upgrade, downgrade, and manage subscriptions using Polar (Merchant of Record).

### 3.1 Polar Setup
- [ ] Create Polar account at https://polar.sh
- [ ] Create products in Polar:
  - [ ] Pro - Monthly ($29)
  - [ ] Pro - Annual ($278)
  - [ ] Business - Monthly ($79)
  - [ ] Business - Annual ($758)
- [ ] Create prices for each product
- [ ] Set up webhook endpoint in Polar dashboard
- [ ] Add Polar keys to `.env` (`POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`)

### 3.2 Checkout Flow
- [ ] Create `/checkout` route
- [ ] Accept `tier` and `cycle` params (e.g., `/checkout?tier=pro&cycle=annual`)
- [ ] Create Polar Checkout Session
- [ ] Redirect to Polar hosted checkout
- [ ] Success page: `/checkout/success`
- [ ] Cancel page: `/checkout/cancel`

### 3.3 Webhook Handlers
- [ ] Create `/api/webhooks/polar` endpoint
- [ ] Verify webhook signature
- [ ] Handle events:
  - [ ] `checkout.created` - Checkout started
  - [ ] `subscription.created` - Update user's subscription record
  - [ ] `subscription.updated` - Handle tier changes
  - [ ] `subscription.canceled` - Downgrade to Free
  - [ ] `subscription.revoked` - Handle payment failure
  - [ ] `order.created` - Track overage invoices

### 3.4 Subscription Management
- [ ] Update `subscription` table on successful payment
  - [ ] Set tier, status, limits
  - [ ] Set payment IDs (customer, subscription, price)
  - [ ] Set period start/end dates
- [ ] Create Polar Customer Portal link
- [ ] Add "Manage Billing" link in settings
  - [ ] Links to Polar portal
  - [ ] User can: cancel, update card, download invoices

### 3.5 Overage Billing
- [ ] Create monthly cron job (1st of month)
- [ ] For users with `overageMode = 'auto_bill'`:
  - [ ] Calculate submission overage
  - [ ] Calculate storage overage
  - [ ] Create `usageOverage` record
  - [ ] Create Polar invoice via API
  - [ ] Email user with overage details
- [ ] Reset monthly counters after billing

---

## Phase 4: Advanced Features & Polish

**Goal**: Add retention enforcement, notifications, and UX improvements.

### 4.1 Data Retention Enforcement
- [ ] Create daily cron job
- [ ] For each space:
  - [ ] Get retention days (space override OR subscription default)
  - [ ] Find submissions older than retention period
  - [ ] Delete submissions from DB
  - [ ] Delete associated files from R2
  - [ ] Log deletion activity
- [ ] Add retention info to submission list page
  - [ ] "Auto-deleted after X days"
  - [ ] Countdown for old submissions
- [ ] Add retention configuration UI (Pro/Business only)
  - [ ] Per-space override
  - [ ] Max: 365 days (Pro), 1095 days (Business)

### 4.2 Notifications & Alerts
- [ ] Email when hitting 90% of submission limit
- [ ] Email when hitting 100% of submission limit
- [ ] Email when hitting 90% of storage limit
- [ ] Email monthly usage summary
- [ ] In-app notifications for limit warnings
- [ ] Banner in dashboard when at/near limits

### 4.3 Admin Tools
- [ ] Admin dashboard to view all users
- [ ] Search users by tier, usage, etc.
- [ ] Manually adjust tier/limits for specific users
- [ ] View overage billing history
- [ ] Export usage reports

### 4.4 Analytics & Reporting
- [ ] Track tier conversion rates (Free → Pro → Business)
- [ ] Track overage revenue
- [ ] Track feature usage by tier
- [ ] Monthly recurring revenue (MRR) tracking
- [ ] Churn rate tracking

---

## Phase 5: Future Enhancements

**Goal**: Add advanced features based on user demand.

### 5.1 Custom Enterprise Plans
- [ ] "Contact Sales" form on pricing page
- [ ] Manual tier creation for enterprise customers
- [ ] Custom limits per customer
- [ ] Invoiced billing (vs automatic)

### 5.2 Referral Program
- [ ] Give credits for referrals
- [ ] Referral tracking
- [ ] Referral dashboard

### 5.3 Usage Analytics Dashboard
- [ ] Charts showing usage trends
- [ ] Projections: "At current rate, you'll hit limit on X date"
- [ ] Recommendations for tier upgrades

### 5.4 Spending Caps
- [ ] Let users set max overage spend
- [ ] Pause submissions when cap reached
- [ ] Alert when approaching cap

### 5.5 Team Features
- [ ] Team billing (one person pays for whole team)
- [ ] Shared resource pools
- [ ] Team usage dashboard

---

## Testing Checklist

### Unit Tests
- [ ] Test `canCreateSpace()` with different tiers
- [ ] Test `canAcceptSubmission()` with overage modes
- [ ] Test overage calculations
- [ ] Test retention period calculations

### Integration Tests
- [ ] Test full upgrade flow (Free → Pro)
- [ ] Test full downgrade flow (Pro → Free)
- [ ] Test overage billing cron job
- [ ] Test retention deletion cron job
- [ ] Test Polar webhook handlers

### E2E Tests
- [ ] User creates spaces until limit, then sees upgrade prompt
- [ ] User submits forms until limit (pause mode), submission rejected
- [ ] User submits forms until limit (auto-bill mode), overage tracked
- [ ] User upgrades via Polar checkout, limits increased
- [ ] User cancels subscription, downgraded to Free

---

## Migration & Launch Strategy

### Pre-Launch
- [ ] Set all existing users to Free tier
- [ ] Set all overage modes to 'pause' (safe default)
- [ ] Set retention to 30 days for all Free users
- [ ] Send email to all users announcing new pricing

### Launch Options

**Option A: Grandfather Existing Users (Recommended)**
- Give all existing users 60-day free Pro trial
- Encourages adoption, rewards early users
- Email: "Thank you for being an early user! Here's 60 days of Pro, free"

**Option B: Hard Launch**
- Apply Free tier limits immediately
- Email: "We've launched pricing tiers. Upgrade to continue"
- Riskier: may lose some users

**Option C: Gradual Rollout**
- Apply limits over 30 days (gradual reduction)
- Week 1: 200 submissions/month (instead of 100)
- Week 2: 150 submissions/month
- Week 3: 125 submissions/month
- Week 4: 100 submissions/month (final limit)

---

## Revenue Projections (Rough Estimates)

Assumptions:
- 100 active users
- 70% stay on Free tier
- 25% upgrade to Pro ($29/month)
- 5% upgrade to Business ($79/month)

Monthly Revenue:
- Free: 70 users × $0 = $0
- Pro: 25 users × $29 = $725
- Business: 5 users × $79 = $395
- **Total MRR: $1,120**

Annual Revenue (if 50% choose annual):
- Pro annual: 12.5 users × $278/year = $3,475/year
- Pro monthly: 12.5 users × $29 × 12 = $4,350/year
- Business annual: 2.5 users × $758/year = $1,895/year
- Business monthly: 2.5 users × $79 × 12 = $2,370/year
- **Total ARR: ~$12,090**

Overage Revenue (conservative):
- 10% of paid users hit overages
- Average overage: $20/month
- 3 users × $20 = $60/month
- **Extra: ~$720/year**

**Total Estimated Revenue Year 1: ~$12,810**

(Scale these numbers based on your actual/projected user base)

---

## Current Status

**Completed:**
- ✅ Pricing structure defined (PRICING.md)
- ✅ Database schema updated with tier fields
- ✅ `subscription`, `organization`, `usageOverage` tables ready
- ✅ Slug field removed from database (not needed for auth-gated app)
- ✅ Delete Space feature implemented
  - Danger Zone card in space settings
  - Confirmation dialog with name verification
  - Cascade deletion (forms, submissions, members, invitations)
  - Success redirect to spaces page with toast message
- ✅ **Phase 1: Core Infrastructure & Limits Enforcement** (COMPLETE)
  - ✅ Created `src/lib/server/pricing/constants.ts`
    - TIER_LIMITS, OVERAGE_PRICING, TIER enums
  - ✅ Created `src/lib/server/pricing/limits.ts`
    - getUserSubscription(), getTierLimits()
    - canCreateSpace(), canCreateForm(), canAddUser()
    - canAcceptSubmission(), canUploadFile()
    - getCurrentUsage(), hasFeature(), requireFeature()
    - **shouldResetBillingPeriod(), resetMonthlyUsage()**
  - ✅ **Billing cycle-based quota resets** (aligns with Polar)
    - Removed `lastMonthlyReset` from schema
    - Uses `subscription.currentPeriodStart/End` for resets
    - Each user gets full quota for their billing period (not calendar month)
    - Auto-resets when checking limits if period has ended
  - ✅ Space creation limits enforced
    - Updated /spaces/new to use limit checking utilities
    - Shows warning when limit reached
    - Disables form submission when at limit
  - ✅ User invitation limits enforced
    - Updated /spaces/[id]/invite to check `canAddUser()`
    - Returns 403 error with upgrade message when at limit
  - ✅ Created `<UpgradePrompt>` component (3 variants: card, inline, banner)
  - ✅ Created `<UsageBadge>` component (color-coded progress with 3 variants)

**Next Up:**
- ⏳ Phase 2: UI Changes & User Experience
  - Pricing page (/pricing)
  - Usage dashboard
  - Feature gating in UI
- 📝 **Note:** Form creation limits will be enforced when forms feature is built
- 📝 **Note:** Submission/file upload limits will be enforced when submission handling is built

**Last Updated:** 2025-01-15
