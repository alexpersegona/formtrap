---
priority: high
---
# Better Auth

This project uses **Better Auth** for authentication and session management.

## CRITICAL: Always Check Better Auth Documentation First

**BEFORE implementing ANY authentication-related feature, you MUST:**

1. **Search Better Auth documentation** at https://www.better-auth.com/docs
2. **Check if Better Auth provides a built-in solution** for the feature
3. **Use Better Auth's official methods** instead of custom implementations
4. **Only implement custom solutions** if Better Auth doesn't provide the functionality

**Examples of features Better Auth provides:**
- User registration and login (`auth.api.signUpEmail`, `auth.api.signInEmail`)
- Password changes (`auth.api.changePassword`)
- User deletion (`auth.deleteUser` with `enabled: true`)
- Session management (`auth.api.signOut`, session lifecycle hooks)
- Email verification
- Two-factor authentication
- OAuth providers

**Why this matters:**
- Better Auth handles edge cases and security concerns
- Built-in methods integrate properly with the auth system
- Custom implementations can break sessions, cookies, or database integrity
- Documentation may include lifecycle hooks for cleanup operations

**Before implementing, ask yourself:**
"Does Better Auth already have a method for this in their documentation?"

## Session Management

Better Auth uses nano-stores for client-side session state. When updating user data directly in the database (outside of Better Auth's API), you need to manually refresh the session store.

### Refreshing Session After Database Updates

When you update user data directly via Drizzle (e.g., profile updates):

```typescript
import { authClient, useSession } from '$lib/auth-client';

const session = useSession();

// After updating the database
await db.update(userTable).set({ name, email, image }).where(eq(userTable.id, userId));

// 1. Fetch fresh session from DB (bypassing cookie cache)
const freshSession = await authClient.getSession({
  query: { disableCookieCache: true }
});

// 2. Manually update the nano-store with fresh data
if (freshSession?.data) {
  session.set({
    data: freshSession.data,
    error: null,
    isPending: false,
    isRefetching: false
  });
}

// 3. Refresh SvelteKit page data
await invalidateAll();
```

**Why this is needed:**
- Better Auth caches session data in cookies for performance
- Direct database updates don't automatically invalidate this cache
- `disableCookieCache: true` forces a fresh fetch from the database
- `session.set()` manually updates the nano-store
- This avoids full page reloads while keeping everything in sync
