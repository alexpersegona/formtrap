# Architectural Shift: BYOI (Bring Your Own Infrastructure)

This document outlines the data architecture for transitioning FormTrap from a hosted model to a BYOI (Bring Your Own Infrastructure) model where users provide their own R2 storage and Postgres database.

---

## Data Split: FormTrap DB vs User's DB

### FormTrap's Database (Your Infrastructure)

**Better Auth (must stay - handles login/sessions):**
```
user
session
account
verification
twoFactor
```

**Organization/Team Management (must stay - multi-tenant core):**
```
organization (spaces)
member (space memberships)
invitation (pending invites)
```

**Subscription (simplified for BYOI):**
```sql
subscription (
    id,
    userId,
    tier,           -- 'free' | 'pro' (simplified)
    status,         -- 'active' | 'canceled' | 'past_due'
    stripeCustomerId,
    stripeSubscriptionId,
    currentPeriodEnd,
    createdAt,
    updatedAt
)
-- DELETE: maxSpaces, maxSubmissions, maxStorage, retentionDays, overageMode, etc.
```

**NEW - Connection Credentials:**
```sql
connection (
    id,
    userId,

    -- Storage (S3-compatible)
    storageProvider,      -- 'r2' | 's3' | 'backblaze' | 'minio'
    storageEndpoint,      -- encrypted
    storageAccessKey,     -- encrypted
    storageSecretKey,     -- encrypted
    storageBucket,
    storageRegion,

    -- Database (Postgres)
    databaseUrl,          -- encrypted connection string
    databaseProvider,     -- 'neon' | 'supabase' | 'railway' | 'other' (for UI hints)

    -- Spam Protection
    spamProvider,         -- 'turnstile' | 'recaptcha' | 'hcaptcha' | 'honeypot' | null
    spamSiteKey,
    spamSecretKey,        -- encrypted

    -- Connection status
    storageVerified,
    databaseVerified,
    lastVerifiedAt,

    createdAt,
    updatedAt
)
```

**Form Registry (lightweight - just for routing):**
```sql
formEndpoint (
    id,                   -- The form ID used in /f/{id}
    organizationId,       -- Which space owns this form
    userId,               -- Who created it (for connection lookup)
    createdAt
)
-- This is just a routing table. Full form config lives in user's DB.
```

### DELETED Tables (No Longer Needed)
```
spaceResourceAllocation  -- DELETE (no allocation with BYOI)
spaceResourceUsage       -- DELETE (no usage tracking)
usageOverage             -- DELETE (no overage billing)
```

---

### User's Database (Their Infrastructure)

**Forms (full configuration):**
```sql
forms (
    id,                    -- Matches formEndpoint.id in FormTrap's DB
    organization_id,       -- String reference (no FK - different DB)
    name,
    description,

    -- Configuration
    is_active,
    allow_file_uploads,
    max_file_count,
    max_file_size,
    allowed_file_types,    -- JSON array

    -- Spam (references user's BYOP config)
    honeypot_field_name,

    -- Response
    response_type,         -- 'redirect' | 'json'
    redirect_url,
    success_message,

    -- Notifications
    webhook_url,
    send_email_notifications,
    notification_emails,   -- JSON array

    created_by,            -- String user ID
    created_at,
    updated_at
)
```

**Submissions (the actual data):**
```sql
submissions (
    id,
    form_id,

    -- Extracted fields
    email,
    name,

    -- Status
    status,                -- 'new' | 'read' | 'resolved' | 'spam'
    is_read,
    is_spam,
    spam_score,
    spam_reason,

    -- The data
    data,                  -- JSONB
    files,                 -- JSONB array [{name, path, size, type}]

    -- Metadata
    ip_address,
    user_agent,
    referer,

    -- Notification tracking
    webhook_sent,
    webhook_sent_at,
    email_sent,
    email_sent_at,

    created_at,
    deleted_at
)
```

---

## The Tricky Part: Cross-Database References

There's an architectural decision here:

### Option A: Forms Stay in FormTrap's DB
- Simpler dashboard queries (everything in one place)
- But: user doesn't fully "own" their form configs
- Submissions in user's DB reference form_id (string, no FK)

### Option B: Forms Move to User's DB (True BYOI)
- User owns everything: forms + submissions
- Dashboard must query user's DB for form list
- More complex but philosophically pure

**Recommendation: Option B** for true BYOI positioning. Here's why:

1. "Your data, your infrastructure" is the selling point
2. If user leaves FormTrap, they have complete data (forms + submissions)
3. Form configs aren't sensitive - it's just metadata

---

## How It Works at Runtime

### Go Submission Handler Flow:

```
POST /f/{form_id}
         │
         ▼
┌─────────────────────────────────┐
│ 1. Lookup formEndpoint          │ ◄── FormTrap's DB (cached)
│    Get: organizationId, userId  │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 2. Get connection credentials   │ ◄── FormTrap's DB (cached)
│    Get: dbUrl, storageKeys,     │
│         spamKeys                │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 3. Connect to USER's DB         │ ◄── User's Postgres
│    Lookup form config           │
│    Check if form is active      │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 4. Verify spam protection       │ ◄── Turnstile/reCAPTCHA API
│    (using user's API keys)      │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 5. Upload files to USER's R2    │ ◄── User's R2 bucket
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 6. Insert submission            │ ◄── User's Postgres
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 7. Send notifications           │ ◄── Webhook/Email
└─────────────────────────────────┘
```

### SvelteKit Dashboard Flow:

```
User logs in
    │
    ▼
┌─────────────────────────────────┐
│ Load user's connection          │ ◄── FormTrap's DB
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│ Query forms list                │ ◄── User's DB
│ Query submissions               │ ◄── User's DB
│ (Dashboard connects to user's   │
│  DB using their credentials)    │
└─────────────────────────────────┘
```

---

## SvelteKit Dashboard: Querying User's DB

The dashboard needs to dynamically connect to different databases per user.

```typescript
// src/lib/server/user-db.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { decrypt } from '$lib/server/encryption';

// Cache connections per user (with TTL)
const connectionPool = new Map<string, { client: any; expires: number }>();

export async function getUserDb(userId: string) {
    // Check cache
    const cached = connectionPool.get(userId);
    if (cached && cached.expires > Date.now()) {
        return cached.client;
    }

    // Get connection credentials from FormTrap's DB
    const connection = await db.query.connection.findFirst({
        where: eq(connection.userId, userId)
    });

    if (!connection?.databaseUrl) {
        throw new Error('No database connected');
    }

    // Decrypt and connect
    const dbUrl = decrypt(connection.databaseUrl);
    const client = postgres(dbUrl);
    const userDb = drizzle(client);

    // Cache for 5 minutes
    connectionPool.set(userId, {
        client: userDb,
        expires: Date.now() + 5 * 60 * 1000
    });

    return userDb;
}
```

```typescript
// src/routes/(protected)/spaces/[id]/forms/+page.server.ts
export const load = async ({ locals, params }) => {
    const userDb = await getUserDb(locals.user.id);

    const forms = await userDb
        .select()
        .from(formsTable)
        .where(eq(formsTable.organizationId, params.id));

    return { forms };
};
```

---

## Summary: What Changes

| Current Model | BYOI Model |
|--------------|------------|
| Forms in FormTrap's DB | Forms in User's DB |
| Submissions in FormTrap's DB | Submissions in User's DB |
| Files in FormTrap's R2 | Files in User's R2 |
| Complex allocation logic | Simple active/inactive subscription |
| Usage tracking | None needed |
| Overage billing | None needed |
| `/usage/allocate` route | `/settings/connections` route |

**Tables to DELETE:**
- `spaceResourceAllocation`
- `spaceResourceUsage`
- `usageOverage`

**Tables to ADD:**
- `connection` (encrypted credentials)
- `formEndpoint` (lightweight routing table)

**Tables to SIMPLIFY:**
- `subscription` (remove all limit fields)

**Tables that MOVE to user's DB:**
- `form` (full config)
- `submission`

---

## Storage Provider Support

Support S3-compatible APIs (R2, S3, Backblaze B2, MinIO) with a single integration:

```go
// Go - using AWS SDK v2 (works with ANY S3-compatible storage)
import "github.com/aws/aws-sdk-go-v2/service/s3"

cfg, _ := config.LoadDefaultConfig(ctx,
    config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
        userConfig.AccessKeyID,
        userConfig.SecretAccessKey,
        "",
    )),
    config.WithRegion("auto"),
)

client := s3.NewFromConfig(cfg, func(o *s3.Options) {
    o.BaseEndpoint = aws.String(userConfig.Endpoint) // This is the only difference
})
```

| Provider | Endpoint Format | Egress Fees |
|----------|-----------------|-------------|
| **R2** | `https://<account>.r2.cloudflarestorage.com` | **Free** |
| S3 | `https://s3.<region>.amazonaws.com` | $0.09/GB |
| Backblaze B2 | `https://s3.<region>.backblazeb2.com` | $0.01/GB |
| MinIO | User's self-hosted URL | N/A |

**Recommendation:** Lead with R2 in marketing (free egress, Cloudflare ecosystem), but accept any S3-compatible endpoint.

---

## Database Provider Support

Accept any Postgres connection string - no provider-specific integrations needed:

```go
// Go - using pgx (the best Postgres driver)
import "github.com/jackc/pgx/v5/pgxpool"

pool, err := pgxpool.New(ctx, userConfig.DatabaseURL)
// Works with Neon, Supabase, Railway, RDS, self-hosted, everything.
```

| Provider | Free Tier | Connection String Format |
|----------|-----------|-------------------------|
| **Neon** | 512MB, 3GB transfer | `postgres://user:pass@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require` |
| **Supabase** | 500MB, 2 projects | `postgres://postgres:pass@db.xxx.supabase.co:5432/postgres` |
| Railway | $5 credit | `postgres://user:pass@xxx.railway.app:5432/railway` |
| Render | 90 days free | `postgres://user:pass@xxx.render.com/dbname` |

**Recommendation:** Support "Postgres via connection string." Highlight Neon and Supabase in docs.

---

## Spam Protection (BYOP - Bring Your Own Protection)

Support multiple providers with the same verification pattern:

```go
type SpamProtector interface {
    Verify(ctx context.Context, token string, remoteIP string) (bool, error)
}
```

| Provider | Free Tier | Privacy | Setup |
|----------|-----------|---------|-------|
| **Turnstile** | Unlimited | Good (Cloudflare) | Site key + Secret key |
| reCAPTCHA v3 | Unlimited | Poor (Google) | Site key + Secret key |
| hCaptcha | 100k/mo | Good | Site key + Secret key |
| **Honeypot** | N/A | Perfect | No keys needed |

**Recommendation:**
1. **Turnstile** as primary (free, privacy-respecting, Cloudflare ecosystem)
2. **reCAPTCHA** as fallback (some devs already have it)
3. **Honeypot** as "zero-config" option

---

## Onboarding Flow (Replaces Resource Allocation)

Instead of the complex `/usage/allocate` page, users get a simple one-time setup:

```
/onboarding/connect
├── Step 1: Connect Storage (R2/S3)
│   ├── Endpoint URL
│   ├── Access Key ID
│   ├── Secret Access Key
│   └── Bucket Name
│   └── [Test Connection] button
│
├── Step 2: Connect Database (Postgres)
│   ├── Connection String
│   └── [Test & Initialize] button (runs migrations)
│
└── Step 3: Spam Protection (Optional)
    ├── Provider: [Turnstile ▾]
    ├── Site Key
    └── Secret Key
```

---

## Pricing Model (Simplified)

| Tier | Price | Infrastructure |
|------|-------|----------------|
| **BYOI** | $20/mo | Your R2 + DB, unlimited everything |
| Hosted Lite | $9/mo | Our infra, 500 submissions, 500MB |
| Hosted Pro | $29/mo | Our infra, 5,000 submissions, 10GB |

Or go pure BYOI:

| Tier | Price |
|------|-------|
| Solo | $12/mo | 1 project |
| Pro | $20/mo | Unlimited projects |
| Team | $40/mo | Multiple seats |
