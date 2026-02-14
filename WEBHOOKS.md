# Webhooks Feature Design

This document outlines the comprehensive design for the webhooks feature, which allows users to receive real-time notifications when events happen in their forms.

---

## Core Concept

Webhooks let users receive real-time notifications when events happen in their forms (new submissions, status changes, spam detected, etc.) by sending HTTP POST requests to their specified URLs.

**Feature Tier:** Pro and Business only (Free tier locked)

---

## UX Flow

### 1. Webhook Settings Location

**Two access points:**

**A. Space-level webhooks** (in `/spaces/[id]/settings`)
- New tab: "Webhooks" (alongside General, Members, Danger Zone)
- Applies to ALL forms in this space
- Most common use case

**B. Form-level webhooks** (in `/spaces/[id]/forms/[formId]/settings`)
- Optional override for specific forms
- More granular control for power users
- Example: Send Typeform submissions to different endpoint than Contact form

---

### 2. Webhook Configuration UI

**Main webhook list page:**
```
┌─────────────────────────────────────────────────────────┐
│ Webhooks                              [+ Add Webhook]   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ┌──────────────────────────────────────────────────┐   │
│ │ 🟢 Production API                                 │   │
│ │ https://api.example.com/webhooks/forms           │   │
│ │ Events: New submission, Status changed            │   │
│ │ Last triggered: 2 minutes ago (Success)           │   │
│ │                                    [Edit] [Delete]│   │
│ └──────────────────────────────────────────────────┘   │
│                                                          │
│ ┌──────────────────────────────────────────────────┐   │
│ │ 🔴 Slack Notifications                            │   │
│ │ https://hooks.slack.com/services/...             │   │
│ │ Events: New submission                            │   │
│ │ Last triggered: 1 hour ago (Failed - 500)         │   │
│ │                                    [Edit] [Delete]│   │
│ └──────────────────────────────────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

### 3. Add/Edit Webhook Form

```
┌─────────────────────────────────────────────────────────┐
│ Add Webhook                                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Name *                                                   │
│ [Production API                                      ]   │
│                                                          │
│ Endpoint URL *                                           │
│ [https://api.example.com/webhooks/forms              ]   │
│ ℹ️ Must be HTTPS in production                           │
│                                                          │
│ Events to trigger on: *                                  │
│ [✓] New submission received                              │
│ [✓] Submission status changed                            │
│ [ ] Submission marked as spam                            │
│ [ ] Submission deleted                                   │
│                                                          │
│ Secret Key (optional but recommended)                    │
│ [•••••••••••••••••••••••]  [Generate] [👁 Show]         │
│ ℹ️ Used to verify webhook authenticity (HMAC signature)  │
│                                                          │
│ ⚙️ Advanced Settings                                     │
│ [ ] Enable retries on failure (max 3 attempts)           │
│ Timeout: [5] seconds                                     │
│                                                          │
│ [Test Webhook] [Cancel] [Save Webhook]                  │
└─────────────────────────────────────────────────────────┘
```

---

### 4. Events & Payloads

**Available Events:**

| Event | Trigger | Payload Includes |
|-------|---------|------------------|
| `submission.created` | New form submission | Full submission data, form metadata |
| `submission.updated` | Status changed (read/resolved) | Updated submission, old status, new status |
| `submission.spam` | Marked as spam | Submission data, spam reason |
| `submission.deleted` | Submission deleted | Submission ID, deleted at timestamp |

**Example Payload:**
```json
{
  "event": "submission.created",
  "timestamp": "2025-01-22T10:30:00Z",
  "space": {
    "id": "space_123",
    "name": "My Company"
  },
  "form": {
    "id": "form_456",
    "name": "Contact Form"
  },
  "submission": {
    "id": "sub_789",
    "name": "John Doe",
    "email": "john@example.com",
    "message": "I'd like to learn more...",
    "createdAt": "2025-01-22T10:30:00Z",
    "status": "new",
    "isSpam": false,
    "files": [
      {
        "name": "resume.pdf",
        "url": "https://r2.example.com/files/...",
        "size": 124567
      }
    ]
  }
}
```

---

### 5. Security Features

**HMAC Signature Verification:**
- Generate a secret key per webhook
- Send signature in header: `X-Webhook-Signature: sha256=...`
- User can verify authenticity on their end

**Example verification code shown in UI:**
```javascript
// Node.js example
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}
```

**Additional security measures:**
- Require HTTPS in production
- IP whitelisting (optional, Business tier only)
- Rate limiting per webhook endpoint

---

### 6. Testing & Debugging

**"Test Webhook" Button:**
- Sends a sample payload immediately
- Shows real-time result:
  ```
  ✅ Success! Received 200 OK
  Response time: 234ms
  Response body: {"received": true}
  ```

  Or:
  ```
  ❌ Failed: Connection timeout
  We couldn't reach your endpoint within 5 seconds.
  ```

**Webhook Logs Page:**
```
┌─────────────────────────────────────────────────────────┐
│ Webhook Logs - Production API                           │
│ [Last 7 days ▾]                    [Export CSV]         │
├─────────────────────────────────────────────────────────┤
│ 2m ago  ✅ submission.created   200 OK      234ms       │
│ 15m ago ✅ submission.created   200 OK      189ms       │
│ 1h ago  ❌ submission.updated   500 Error   Retry 3/3   │
│ 2h ago  ✅ submission.created   200 OK      301ms       │
│ 5h ago  ⚠️  submission.created   Timeout    Retry 1/3   │
└─────────────────────────────────────────────────────────┘
```

**Click any log entry to see:**
- Full request sent (headers, body)
- Full response received
- Retry attempts
- Error details

---

### 7. Retry Logic

**Automatic retries (if enabled):**
1. **Immediate failure**: Retry after 1 second
2. **Second failure**: Retry after 5 seconds
3. **Third failure**: Retry after 30 seconds
4. **Give up**: Mark as failed, send notification email

**Retry on:**
- Network errors
- Timeouts (> 5 seconds)
- 5xx server errors

**Don't retry on:**
- 4xx client errors (bad request, unauthorized, etc.)
- SSL certificate errors
- Invalid URL

**Implementation notes:**
- Use job queue (BullMQ, Inngest, or Trigger.dev) for retries
- Don't block main request thread
- Track retry attempts in webhook_log table

---

### 8. Monitoring & Alerts

**Health indicator on webhook list:**
- 🟢 Green: All recent deliveries successful (last 10)
- 🟡 Yellow: Some failures, but retries succeeded
- 🔴 Red: Multiple consecutive failures (5+)

**Email notifications:**
- "Webhook 'Production API' has failed 5 times in a row"
- "Webhook disabled after 20 consecutive failures"
- Daily digest of webhook health (optional setting)

**Auto-disable after repeated failures:**
- After 20 consecutive failures → disable webhook automatically
- Send email: "We've temporarily disabled your webhook. Please check your endpoint and re-enable."
- User must manually re-enable after fixing the issue

---

### 9. Rate Limiting (Anti-Abuse)

**Per-tier limits:**

| Tier | Webhooks per Space | Requests per Hour | Log Retention |
|------|-------------------|-------------------|---------------|
| Free | 0 (locked feature) | - | - |
| Pro | 5 webhooks | 1,000 requests | 7 days |
| Business | 20 webhooks | 10,000 requests | 30 days |

**Show warning when approaching limit:**
```
⚠️ You've used 850/1,000 webhook requests this hour.
Upgrade to Business for higher limits.
```

**When limit exceeded:**
- Queue requests until next hour
- Send email notification
- Show banner in webhook settings

---

### 10. Database Schema

```typescript
// src/lib/server/db/schema.ts

export const webhook = pgTable('webhook', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  spaceId: text('space_id').notNull().references(() => space.id, { onDelete: 'cascade' }),
  formId: text('form_id').references(() => form.id, { onDelete: 'cascade' }), // null = space-level

  name: text('name').notNull(), // User-friendly name
  url: text('url').notNull(), // Endpoint URL
  secret: text('secret'), // HMAC secret key (encrypted at rest)

  events: text('events').array().notNull(), // ['submission.created', 'submission.updated']

  isActive: boolean('is_active').default(true).notNull(),
  enableRetries: boolean('enable_retries').default(true).notNull(),
  timeoutSeconds: integer('timeout_seconds').default(5).notNull(),

  lastTriggeredAt: timestamp('last_triggered_at'),
  lastStatus: text('last_status'), // 'success', 'failed', 'timeout'
  consecutiveFailures: integer('consecutive_failures').default(0).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const webhookLog = pgTable('webhook_log', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  webhookId: text('webhook_id').notNull().references(() => webhook.id, { onDelete: 'cascade' }),

  event: text('event').notNull(), // 'submission.created'
  payload: jsonb('payload').notNull(), // Full JSON payload sent

  statusCode: integer('status_code'), // 200, 500, null (timeout/error)
  responseBody: text('response_body'), // Truncated to 1000 chars
  responseTime: integer('response_time'), // milliseconds

  success: boolean('success').notNull(),
  error: text('error'), // Error message if failed

  attempts: integer('attempts').default(1).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Indexes for performance
export const webhookLogWebhookIdIdx = index('webhook_log_webhook_id_idx').on(webhookLog.webhookId);
export const webhookLogCreatedAtIdx = index('webhook_log_created_at_idx').on(webhookLog.createdAt);
```

---

### 11. Feature Gating UI

**For Free tier users (in Space Settings):**
```
┌─────────────────────────────────────────────────────────┐
│ Webhooks                                    ⭐ Pro Feature │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  🔔 Get real-time notifications                         │
│                                                          │
│  Send form submissions to your apps instantly:          │
│  • Trigger workflows in Zapier, Make, or n8n           │
│  • Notify your team in Slack or Discord                │
│  • Sync data to your CRM or database                   │
│  • Build custom integrations                           │
│                                                          │
│            [Upgrade to Pro →]                            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**For Pro/Business users:**
- Show full webhook management UI
- Display usage: "3 / 5 webhooks" (Pro) or "8 / 20 webhooks" (Business)
- Show hourly request count: "245 / 1,000 requests this hour"

---

### 12. Common Use Cases (Show in Marketing/Docs)

**Examples to inspire users:**

1. **Slack Notifications**
   - Webhook URL: Slack Incoming Webhook
   - Event: New submission
   - Payload → formatted Slack message
   - Tutorial: "Get notified in Slack when someone submits your form"

2. **Zapier Integration**
   - Webhook URL: Zapier webhook trigger
   - Auto-create Google Sheet rows, Notion pages, etc.
   - Tutorial: "Send form data to 5,000+ apps with Zapier"

3. **Custom CRM Sync**
   - Webhook URL: Your API endpoint
   - Auto-add leads to Salesforce, HubSpot, etc.
   - Tutorial: "Sync form submissions to your CRM automatically"

4. **Email Marketing**
   - Webhook URL: Mailchimp/ConvertKit API
   - Auto-subscribe form submitters to email lists
   - Tutorial: "Grow your email list with form submissions"

5. **Analytics Tracking**
   - Webhook URL: Your analytics service
   - Track conversion events, form completions
   - Tutorial: "Track form conversions in Google Analytics"

6. **Discord Notifications**
   - Webhook URL: Discord webhook
   - Real-time alerts in Discord channel
   - Tutorial: "Get Discord alerts for new submissions"

---

## Implementation Priority

### Phase 1: Core Functionality (MVP)
**Goal**: Basic webhooks that work

- [ ] Database schema (webhook, webhookLog tables)
- [ ] CRUD operations (create, read, update, delete webhooks)
- [ ] Basic UI for webhook management
  - [ ] List webhooks page
  - [ ] Add/edit webhook form
  - [ ] Delete webhook confirmation
- [ ] Event triggering for `submission.created` only
- [ ] Simple HTTP POST to webhook URL
- [ ] Basic error handling (catch errors, don't crash)
- [ ] Feature gate for Free tier (show upgrade prompt)

**Timeline**: 1-2 days

---

### Phase 2: Reliability & Logging
**Goal**: Make webhooks reliable and debuggable

- [ ] Retry logic with exponential backoff
  - [ ] Use job queue (BullMQ, Inngest, or Trigger.dev)
  - [ ] 3 retries: 1s, 5s, 30s delays
  - [ ] Track attempts in webhook_log
- [ ] Webhook logs UI
  - [ ] List all webhook deliveries
  - [ ] Filter by webhook, status, date range
  - [ ] View full request/response details
  - [ ] Export logs to CSV
- [ ] Health monitoring
  - [ ] Track consecutive failures
  - [ ] Show health indicator (green/yellow/red)
  - [ ] Auto-disable after 20 failures
- [ ] Email notifications
  - [ ] Alert on repeated failures (5+)
  - [ ] Alert when webhook auto-disabled

**Timeline**: 2-3 days

---

### Phase 3: Security & Polish
**Goal**: Production-ready security and UX

- [ ] HMAC signature verification
  - [ ] Generate secret key per webhook
  - [ ] Send `X-Webhook-Signature` header
  - [ ] UI to copy/regenerate secret
  - [ ] Code examples for verification
- [ ] Test webhook button
  - [ ] Send sample payload
  - [ ] Show real-time result
  - [ ] Display response time and body
- [ ] Rate limiting
  - [ ] Track requests per hour per user
  - [ ] Enforce tier limits
  - [ ] Show usage in UI
  - [ ] Queue excess requests or reject
- [ ] Timeout configuration
  - [ ] Default: 5 seconds
  - [ ] Allow 1-30 seconds (Business tier only)
- [ ] HTTPS enforcement in production

**Timeline**: 2-3 days

---

### Phase 4: Advanced Features
**Goal**: Power user features and optimizations

- [ ] Additional event types
  - [ ] `submission.updated` (status changes)
  - [ ] `submission.spam` (marked as spam)
  - [ ] `submission.deleted` (deleted)
- [ ] Form-level webhook overrides
  - [ ] UI in form settings
  - [ ] Separate endpoints per form
  - [ ] Fallback to space-level if not set
- [ ] Advanced settings
  - [ ] Custom headers (Business tier)
  - [ ] Request body templates (Business tier)
  - [ ] IP whitelisting (Business tier)
- [ ] Log retention enforcement
  - [ ] Auto-delete logs after retention period (7/30 days)
  - [ ] Daily cron job cleanup
- [ ] Webhook analytics
  - [ ] Success rate over time
  - [ ] Average response time
  - [ ] Most common errors
  - [ ] Charts and graphs

**Timeline**: 3-4 days

---

## Technical Implementation Notes

### Webhook Delivery Architecture

**Option A: Inline (Simple but blocks requests)**
```typescript
// After creating submission
await triggerWebhooks(submission, 'submission.created');
```
**Pros**: Simple, immediate
**Cons**: Blocks submission endpoint, no retries

**Option B: Job Queue (Recommended)**
```typescript
// After creating submission
await queue.add('webhook', {
  event: 'submission.created',
  submissionId: submission.id
});
```
**Pros**: Non-blocking, built-in retries, scalable
**Cons**: Requires job queue infrastructure

**Recommended tools**:
- **BullMQ** (Redis-based, popular)
- **Inngest** (serverless-friendly, has free tier)
- **Trigger.dev** (dev-first, great DX)

---

### Webhook Trigger Function

```typescript
// src/lib/server/webhooks/trigger.ts

import { db } from '$lib/server/db';
import { webhook, webhookLog } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

export async function triggerWebhooks(
  spaceId: string,
  formId: string | null,
  event: string,
  payload: Record<string, any>
) {
  // Find all active webhooks for this space/form that listen to this event
  const webhooks = await db.query.webhook.findMany({
    where: and(
      eq(webhook.spaceId, spaceId),
      eq(webhook.isActive, true),
      // SQL: events array contains this event
      sql`${webhook.events} @> ARRAY[${event}]::text[]`
    )
  });

  // Filter: space-level OR form-level matching this form
  const relevantWebhooks = webhooks.filter(
    w => !w.formId || w.formId === formId
  );

  // Trigger each webhook (add to job queue)
  for (const wh of relevantWebhooks) {
    await deliverWebhook(wh, event, payload);
  }
}

async function deliverWebhook(
  wh: Webhook,
  event: string,
  payload: Record<string, any>
) {
  const body = JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    ...payload
  });

  // Generate HMAC signature if secret exists
  const signature = wh.secret
    ? 'sha256=' + crypto.createHmac('sha256', wh.secret).update(body).digest('hex')
    : undefined;

  const startTime = Date.now();
  let logData: any = {
    webhookId: wh.id,
    event,
    payload: body,
    attempts: 1
  };

  try {
    const response = await fetch(wh.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FormSaaS-Webhooks/1.0',
        ...(signature && { 'X-Webhook-Signature': signature })
      },
      body,
      signal: AbortSignal.timeout(wh.timeoutSeconds * 1000)
    });

    const responseTime = Date.now() - startTime;
    const responseBody = await response.text();

    logData = {
      ...logData,
      statusCode: response.status,
      responseBody: responseBody.slice(0, 1000), // Truncate
      responseTime,
      success: response.ok,
      error: response.ok ? null : `HTTP ${response.status}`
    };

    // Update webhook status
    await db.update(webhook)
      .set({
        lastTriggeredAt: new Date(),
        lastStatus: response.ok ? 'success' : 'failed',
        consecutiveFailures: response.ok ? 0 : wh.consecutiveFailures + 1
      })
      .where(eq(webhook.id, wh.id));

  } catch (error) {
    logData = {
      ...logData,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime
    };

    // Update webhook status
    await db.update(webhook)
      .set({
        lastTriggeredAt: new Date(),
        lastStatus: 'failed',
        consecutiveFailures: wh.consecutiveFailures + 1
      })
      .where(eq(webhook.id, wh.id));
  }

  // Log delivery attempt
  await db.insert(webhookLog).values(logData);

  // Auto-disable after 20 consecutive failures
  if (logData.success === false && wh.consecutiveFailures + 1 >= 20) {
    await db.update(webhook)
      .set({ isActive: false })
      .where(eq(webhook.id, wh.id));

    // TODO: Send email notification
  }
}
```

---

### HMAC Verification Example (for docs)

**Node.js:**
```javascript
const crypto = require('crypto');

function verifyWebhook(body, signature, secret) {
  const expectedSignature = 'sha256=' +
    crypto.createHmac('sha256', secret)
      .update(body)
      .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Usage in Express
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const body = JSON.stringify(req.body);

  if (!verifyWebhook(body, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  // Process webhook...
  res.send({ received: true });
});
```

**Python:**
```python
import hmac
import hashlib

def verify_webhook(body, signature, secret):
    expected = 'sha256=' + hmac.new(
        secret.encode(),
        body.encode(),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected)

# Usage in Flask
@app.route('/webhook', methods=['POST'])
def webhook():
    signature = request.headers.get('X-Webhook-Signature')
    body = request.get_data(as_text=True)

    if not verify_webhook(body, signature, os.environ['WEBHOOK_SECRET']):
        return 'Invalid signature', 401

    # Process webhook...
    return {'received': True}
```

---

## FAQ

**Q: Why require Pro tier for webhooks?**
A: Webhooks require infrastructure (job queues, logging, retries) and can be abused (DDoS via webhook spam). Pro tier ensures we have revenue to support the feature.

**Q: Can users send webhooks to localhost for testing?**
A: Yes, but only in development mode. Production enforces HTTPS and blocks local IPs.

**Q: What happens if a webhook endpoint is slow?**
A: We timeout after 5 seconds (configurable) and retry. If consistently slow, user should optimize their endpoint or increase timeout.

**Q: How do we prevent webhook abuse (infinite loops)?**
A: Rate limiting (1,000-10,000 requests/hour) and auto-disable after 20 failures. We also detect and block circular webhooks (webhook triggering itself).

**Q: Can users filter which submissions trigger webhooks?**
A: Phase 4 feature: Add filters like "only trigger if email contains @company.com" or "only if status = resolved". Not MVP.

**Q: Should we support custom HTTP methods (GET, PUT, DELETE)?**
A: No, POST only. This is the webhook standard. Custom methods add complexity without clear benefit.

**Q: What about webhook authentication (API keys, OAuth)?**
A: Phase 4 (Business tier): Allow custom headers where users can add `Authorization: Bearer token`. HMAC signature is sufficient for MVP.

---

## Success Metrics

**Track these to measure webhook feature success:**

1. **Adoption rate**: % of Pro/Business users who create webhooks
2. **Usage frequency**: Average webhook deliveries per user per month
3. **Success rate**: % of webhook deliveries that succeed (target: >95%)
4. **Response time**: Average webhook endpoint response time (target: <1s)
5. **Upgrade attribution**: How many users upgraded specifically for webhooks?
6. **Popular integrations**: Which endpoints are most common? (Slack, Zapier, etc.)
7. **Retention**: Do users with webhooks have higher retention?

---

**Last Updated:** 2025-01-22
