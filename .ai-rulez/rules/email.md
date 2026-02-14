---
priority: medium
---
# Email System

## Tech Stack
- **Mailgun** - Email delivery service
- **React Email** - Email template system (for preview/development only)

## CRITICAL: Email Pattern

**React Email templates in `emails/` directory are for preview only (incompatible with SSR)**

For actual email sending, use inline HTML template strings:

1. Create function in `src/lib/server/` (e.g., `email-invitation.ts`)
2. Use inline HTML template string (see `sendPasswordResetEmail` for example)
3. Call `sendEmail()` utility from `src/lib/server/email.ts`

**Check `src/lib/server/email.ts` and related files before implementing new email features**

**Development mode**: Emails log to console instead of sending
