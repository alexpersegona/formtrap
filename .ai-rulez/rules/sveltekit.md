---
priority: high
---
# SvelteKit Patterns

## Form Actions

### Basic Form Actions

```typescript
// src/routes/login/+page.server.ts
import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) {
    throw redirect(303, '/dashboard');
  }
};

export const actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    const email = data.get('email');
    const password = data.get('password');

    if (!email || typeof email !== 'string') {
      return fail(400, { email, missing: true });
    }

    if (!password || typeof password !== 'string') {
      return fail(400, { email, password: true });
    }

    const user = await authenticateUser(email, password);

    if (!user) {
      return fail(400, { email, incorrect: true });
    }

    cookies.set('session', user.sessionId, {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7
    });

    throw redirect(303, '/dashboard');
  }
} satisfies Actions;
```

### Named Actions

Multiple actions in one file using named exports. Call with `action="?/actionName"`:
```typescript
export const actions = {
  updateProfile: async ({ request }) => { /* ... */ },
  updatePassword: async ({ request }) => { /* ... */ },
} satisfies Actions;
```

### Progressive Enhancement with use:enhance

**CRITICAL: Correct use:enhance Callback Pattern**

The function passed to `use:enhance` MUST directly receive the submission parameters and return the callback.

#### INCORRECT - Extra Wrapper (form will hang):
```svelte
<script lang="ts">
  function handleSubmit() {
    return ({ cancel }) => {  // WRONG - Extra wrapper
      loading = true;
      return async ({ result, update }) => {
        // This callback will NEVER execute!
      };
    };
  }
</script>
```

#### CORRECT - Direct Parameters:
```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';

  let loading = $state(false);

  const handleSubmit: SubmitFunction = ({ formData, cancel }) => {
    loading = true;
    formData.append('timestamp', Date.now().toString());

    return async ({ result, update }) => {
      loading = false;

      if (result.type === 'success') {
        console.log('Form submitted successfully');
      }

      if (result.type === 'failure') {
        console.error('Form failed', result.data);
      }

      await update();
    };
  };
</script>

<form method="POST" use:enhance={handleSubmit}>
  <input name="email" type="email" disabled={loading} />
  <button disabled={loading}>
    {loading ? 'Submitting...' : 'Submit'}
  </button>
</form>
```

## Data Loading

### Basic Load Function
```typescript
export const load: PageServerLoad = async () => {
  const posts = await db.query.posts.findMany({
    orderBy: (posts, { desc }) => [desc(posts.createdAt)],
    limit: 10
  });

  return { posts };
};
```

### Parallel Data Loading
```typescript
export const load: PageServerLoad = async ({ locals }) => {
  const [user, stats, notifications] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, locals.userId) }),
    db.query.analytics.findFirst({ where: eq(analytics.userId, locals.userId) }),
    db.query.notifications.findMany({
      where: and(
        eq(notifications.userId, locals.userId),
        eq(notifications.read, false)
      ),
      limit: 5
    })
  ]);

  return { user, stats, notifications };
};
```

### Streaming with Promises
```typescript
export const load: PageServerLoad = async () => {
  return {
    user: await db.query.users.findFirst({ ... }), // Fast - loaded immediately
    analytics: db.query.analytics.findFirst({ ... }), // Slow - streamed
    posts: loadSlowPosts() // Slow - streamed
  };
};
```

```svelte
{#await data.analytics}
  <p>Loading analytics...</p>
{:then analytics}
  <div>{analytics.views} views</div>
{:catch error}
  <p>Failed to load analytics</p>
{/await}
```

### Invalidation and Reloading
```svelte
<script lang="ts">
  import { invalidate, invalidateAll } from '$app/navigation';

  async function refreshUser() {
    await invalidate('/api/user');
  }

  async function refreshAll() {
    await invalidateAll();
  }
</script>
```

## Error Handling

### Error Pages
```svelte
<!-- src/routes/+error.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
</script>

<div class="error-container">
  <h1>{$page.status}</h1>
  <p>{$page.error?.message}</p>
  <a href="/">Go home</a>
</div>
```

### Expected Errors
```typescript
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, params.id)
  });

  if (!post) {
    throw error(404, { message: 'Post not found' });
  }

  return { post };
};
```

## Protected Routes

Pattern for protected routes:
```typescript
// src/routes/(protected)/+layout.server.ts
export const load = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(303, '/login');
  }
  return { user: locals.user };
};
```

Route groups:
```
routes/
├── (auth)/              # Public auth routes
│   ├── login/
│   └── register/
└── (protected)/         # Protected routes
    ├── dashboard/
    └── settings/
```

## File Naming

- **Routes**: Use `+page.svelte`, `+layout.svelte`, `+server.ts`, etc.
- **Components**: PascalCase for component folders and files
- **Server code**: Place in `src/lib/server/` (not exposed to client)

## Import Aliases
```typescript
import { Button } from '$lib/components/ui/button';
import { db } from '$lib/server/db';
import type { PageData } from './$types';
```
