# SvelteKit SaaS Skeleton - Project Context

## Project Overview
This is a **SaaS skeleton/starter template** built with SvelteKit 2, designed to provide a solid foundation for building software-as-a-service applications. The project will include authentication and protected routes as core features.

## Tech Stack

### Core Framework
- **SvelteKit 2** - Full-stack meta-framework with SSR/CSR support
- **Svelte 5** - Latest version with runes and modern reactivity
- **TypeScript** - Type safety across the entire codebase
- **Vite 7** - Fast build tool and dev server

### Styling & UI
- **Tailwind CSS v4** - Utility-first CSS with JIT compilation
- **shadcn-svelte** - High-quality, accessible UI component library
- **Lucide Svelte** - Icon library
- **Tailwind Plugins**:
  - `@tailwindcss/forms` - Form styling
  - `@tailwindcss/typography` - Rich text styling
  - `tw-animate-css` - Animation utilities
- **Design System**: Stone color scheme (baseColor in components.json)

### Database & ORM
- **PostgreSQL** - Primary database
- **Drizzle ORM** - Type-safe SQL ORM with migrations
- **Drizzle Kit** - CLI for schema management and migrations

### Testing
- **Vitest** - Unit testing framework
- **@vitest/browser** - Browser-based component testing
- **vitest-browser-svelte** - Svelte-specific testing utilities
- **Playwright** - End-to-end testing

### Code Quality
- **ESLint** - Code linting with TypeScript support
- **Prettier** - Code formatting with Svelte and Tailwind plugins
- **svelte-check** - Type checking for Svelte files

### Deployment
- **@sveltejs/adapter-node** - Node.js server adapter for production

## Project Structure

```
sk-test/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   └── ui/          # shadcn-svelte components
│   │   │       └── button/
│   │   ├── server/
│   │   │   └── db/          # Database layer
│   │   │       ├── schema.ts   # Drizzle schema definitions
│   │   │       └── index.ts    # DB connection
│   │   ├── utils.ts         # Utility functions (cn, etc.)
│   │   └── index.ts
│   ├── routes/              # SvelteKit routes
│   │   ├── +layout.svelte   # Root layout
│   │   └── +page.svelte     # Home page
│   ├── app.html             # HTML template
│   ├── app.css              # Global styles
│   └── app.d.ts             # Type definitions
├── static/                  # Static assets
├── tests/                   # Test files
├── drizzle.config.ts        # Drizzle configuration
├── vite.config.ts           # Vite configuration
├── svelte.config.js         # SvelteKit configuration
├── components.json          # shadcn-svelte configuration
└── package.json
```

## Environment Setup

### Required Environment Variables
Create a `.env` file in the root directory:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

The database URL is **required** for Drizzle to function. The config will throw an error if not set.

## Database Schema

Current schema (src/lib/server/db/schema.ts):
```typescript
export const user = pgTable('user', {
  id: serial('id').primaryKey(),
  age: integer('age')
});
```

**Note**: This is a placeholder schema. Auth implementation will require additional fields like:
- `email`, `username`
- `passwordHash`
- `emailVerified`, `createdAt`, `updatedAt`
- Session management tables

## Development Workflow

### Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run dev -- --open    # Start dev server and open browser

# Building
npm run build            # Build for production
npm run preview          # Preview production build

# Type Checking
npm run check            # Run type checking
npm run check:watch      # Watch mode for type checking

# Database
npm run db:push          # Push schema changes to database
npm run db:generate      # Generate migration files
npm run db:migrate       # Run migrations
npm run db:studio        # Open Drizzle Studio (DB GUI)

# Testing
npm run test:unit        # Run unit tests
npm run test             # Run all tests (non-watch mode)

# Code Quality
npm run format           # Format code with Prettier
npm run lint             # Lint and check formatting
```

### Development Server
- Default URL: `http://localhost:5173`
- Hot module replacement (HMR) enabled
- TypeScript checking in parallel

## Key Patterns & Conventions

### File Naming
- **Routes**: Use `+page.svelte`, `+layout.svelte`, `+server.ts`, etc.
- **Components**: PascalCase for component folders and files
- **Server code**: Place in `src/lib/server/` (not exposed to client)

### Import Aliases (from tsconfig.json)
```typescript
import { Button } from '$lib/components/ui/button';
import { db } from '$lib/server/db';
import type { PageData } from './$types';
```

### Styling Utilities
The project uses `clsx` and `tailwind-merge` via the `cn()` utility:
```typescript
import { cn } from '$lib/utils';

// Combines classes and handles Tailwind conflicts
<div class={cn('base-class', conditionalClass && 'conditional', className)} />
```

## SvelteKit ShadCN - Dot Notation Syntax

When working with ShadCN components in SvelteKit, use the **dot notation (compound component)** syntax:


### UI Components (shadcn-svelte)
- Components are installed in `src/lib/components/ui/`
- Each component exports both the component and its variants
- Use `tailwind-variants` for variant management
- Example: Button component has variants: default, secondary, destructive, outline, ghost, link




## Design Patterns & Best Practices

### Svelte 5 Runes

Svelte 5 introduces runes - a new way to declare reactive state and logic. **Always use runes** instead of legacy Svelte syntax.

#### State Management

**$state** - Declare reactive state
```svelte
<script lang="ts">
  let count = $state(0);
  let user = $state({ name: 'John', age: 30 });

  // State can be mutated directly
  function increment() {
    count++;
  }

  function updateUser() {
    user.age++; // Mutations are reactive
  }
</script>
```

**$state.frozen** - Immutable state (performance optimization)
```svelte
<script lang="ts">
  let config = $state.frozen({ apiKey: 'xxx', endpoint: '/api' });

  // To update, replace the entire object
  function updateConfig() {
    config = { ...config, endpoint: '/api/v2' };
  }
</script>
```

#### Derived Values

**$derived** - Computed values that update automatically
```svelte
<script lang="ts">
  let count = $state(0);
  let doubled = $derived(count * 2);
  let message = $derived(`Count is ${count}`);

  // Complex derivations
  let items = $state([1, 2, 3, 4, 5]);
  let evenItems = $derived(items.filter(n => n % 2 === 0));
  let total = $derived(items.reduce((sum, n) => sum + n, 0));
</script>
```

**$derived.by** - For complex derivations requiring multiple statements
```svelte
<script lang="ts">
  let users = $state([...]);

  let statistics = $derived.by(() => {
    const active = users.filter(u => u.active);
    const inactive = users.filter(u => !u.active);
    return {
      activeCount: active.length,
      inactiveCount: inactive.length,
      totalCount: users.length
    };
  });
</script>
```

#### Side Effects

**$effect** - Run side effects when dependencies change
```svelte
<script lang="ts">
  let count = $state(0);

  // Runs when count changes
  $effect(() => {
    console.log(`Count is now ${count}`);
    document.title = `Count: ${count}`;
  });

  // Cleanup function
  $effect(() => {
    const interval = setInterval(() => {
      console.log(count);
    }, 1000);

    return () => clearInterval(interval);
  });
</script>
```

**$effect.pre** - Runs before DOM updates
```svelte
<script lang="ts">
  let element = $state<HTMLElement>();

  $effect.pre(() => {
    // Access DOM before updates
    const oldHeight = element?.offsetHeight;
  });
</script>
```

**$effect.root** - Create an effect root for manual cleanup
```svelte
<script lang="ts">
  import { $effect } from 'svelte';

  function setupEffects() {
    return $effect.root(() => {
      $effect(() => {
        // Some effect
      });

      // Return cleanup function
      return () => {
        // Cleanup all effects
      };
    });
  }

  const cleanup = setupEffects();
  // Later: cleanup();
</script>
```

#### Component Props

**$props** - Declare component props
```svelte
<script lang="ts">
  interface Props {
    title: string;
    count?: number;
    onUpdate?: (value: number) => void;
  }

  let { title, count = 0, onUpdate }: Props = $props();

  // Props are readonly by default
  // To use them in reactive statements:
  let doubled = $derived(count * 2);
</script>

<h1>{title}</h1>
<p>Count: {count}, Doubled: {doubled}</p>
```

**$bindable** - Create two-way bindable props
```svelte
<!-- Child.svelte -->
<script lang="ts">
  interface Props {
    value: string;
  }

  let { value = $bindable('') }: Props = $props();
</script>

<input bind:value />

<!-- Parent.svelte -->
<script lang="ts">
  import Child from './Child.svelte';
  let text = $state('');
</script>

<Child bind:value={text} />
```

#### Best Practices

1. **Use $state for all reactive variables** - No more `let` without $state for reactive values
2. **Use $derived instead of $:** - Derived values are more explicit and composable
3. **Use $effect sparingly** - Prefer derived values when possible
4. **Avoid $effect for derived state** - Use $derived instead
5. **Clean up effects** - Return cleanup functions from $effect
6. **Type your props** - Always use TypeScript interfaces for props
7. **Use $state.frozen for large immutable objects** - Better performance

### Form Action Patterns

SvelteKit provides powerful form handling with progressive enhancement.

#### Basic Form Actions

```typescript
// src/routes/login/+page.server.ts
import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
  // Redirect if already logged in
  if (locals.user) {
    throw redirect(303, '/dashboard');
  }
};

export const actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    const email = data.get('email');
    const password = data.get('password');

    // Validation
    if (!email || typeof email !== 'string') {
      return fail(400, { email, missing: true });
    }

    if (!password || typeof password !== 'string') {
      return fail(400, { email, password: true });
    }

    // Authenticate user
    const user = await authenticateUser(email, password);

    if (!user) {
      return fail(400, { email, incorrect: true });
    }

    // Set session cookie
    cookies.set('session', user.sessionId, {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7 // 1 week
    });

    throw redirect(303, '/dashboard');
  }
} satisfies Actions;
```

```svelte
<!-- src/routes/login/+page.svelte -->
<script lang="ts">
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();
</script>

<form method="POST">
  <label>
    Email
    <input
      name="email"
      type="email"
      value={form?.email ?? ''}
      required
    />
  </label>

  {#if form?.missing}
    <p class="error">Email is required</p>
  {/if}

  <label>
    Password
    <input name="password" type="password" required />
  </label>

  {#if form?.password}
    <p class="error">Password is required</p>
  {/if}

  {#if form?.incorrect}
    <p class="error">Invalid email or password</p>
  {/if}

  <button type="submit">Log in</button>
</form>
```

#### Named Actions

```typescript
// src/routes/account/+page.server.ts
import type { Actions } from './$types';
import { fail } from '@sveltejs/kit';

export const actions = {
  updateProfile: async ({ request, locals }) => {
    const data = await request.formData();
    const name = data.get('name');

    // Update profile...

    return { success: true };
  },

  updatePassword: async ({ request, locals }) => {
    const data = await request.formData();
    const currentPassword = data.get('current');
    const newPassword = data.get('new');

    // Update password...

    return { success: true };
  },

  deleteAccount: async ({ request, locals, cookies }) => {
    // Delete account...

    cookies.delete('session', { path: '/' });
    throw redirect(303, '/');
  }
} satisfies Actions;
```

```svelte
<!-- src/routes/account/+page.svelte -->
<script lang="ts">
  import type { ActionData } from './$types';
  import { enhance } from '$app/forms';

  let { form }: { form: ActionData } = $props();
</script>

<!-- Named action: ?/updateProfile -->
<form method="POST" action="?/updateProfile">
  <input name="name" />
  <button>Update Profile</button>
</form>

<!-- Named action: ?/updatePassword -->
<form method="POST" action="?/updatePassword">
  <input name="current" type="password" />
  <input name="new" type="password" />
  <button>Update Password</button>
</form>

<!-- Named action: ?/deleteAccount -->
<form method="POST" action="?/deleteAccount">
  <button>Delete Account</button>
</form>
```

#### Progressive Enhancement with use:enhance

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';

  let loading = $state(false);

  const handleSubmit: SubmitFunction = ({ formData, cancel }) => {
    // Before submit
    loading = true;

    // Optionally modify formData
    formData.append('timestamp', Date.now().toString());

    // Optionally cancel
    // if (someCondition) cancel();

    return async ({ result, update }) => {
      // After response
      loading = false;

      if (result.type === 'success') {
        // Handle success
        console.log('Form submitted successfully');
      }

      if (result.type === 'failure') {
        // Handle failure
        console.error('Form failed', result.data);
      }

      // Apply default SvelteKit behavior (update form prop, invalidate data)
      await update();

      // Or customize:
      // await update({ reset: false }); // Don't reset form
      // await update({ invalidateAll: false }); // Don't invalidate data
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

#### Validation Patterns

```typescript
// src/lib/server/validation.ts
import { z } from 'zod';
import { fail } from '@sveltejs/kit';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

export function validateFormData<T>(
  schema: z.Schema<T>,
  formData: FormData
) {
  const data = Object.fromEntries(formData);
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    return fail(400, { errors, data });
  }

  return result.data;
}
```

```typescript
// src/routes/login/+page.server.ts
import { validateFormData, loginSchema } from '$lib/server/validation';

export const actions = {
  default: async ({ request }) => {
    const formData = await request.formData();
    const result = validateFormData(loginSchema, formData);

    if ('status' in result) {
      // Validation failed
      return result;
    }

    // result is now typed as { email: string, password: string }
    const { email, password } = result;

    // Proceed with authentication...
  }
} satisfies Actions;
```

### Error Handling

#### Error Pages

```svelte
<!-- src/routes/+error.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
</script>

<div class="error-container">
  <h1>{$page.status}</h1>
  <p>{$page.error?.message}</p>

  {#if $page.status === 404}
    <p>Page not found</p>
  {:else if $page.status === 500}
    <p>Internal server error</p>
  {/if}

  <a href="/">Go home</a>
</div>
```

#### Expected Errors (error function)

```typescript
// src/routes/posts/[id]/+page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, params.id)
  });

  if (!post) {
    throw error(404, {
      message: 'Post not found'
    });
  }

  return { post };
};
```

#### Unexpected Errors (handleError hook)

```typescript
// src/hooks.server.ts
import type { HandleServerError } from '@sveltejs/kit';
import * as Sentry from '@sentry/sveltekit';

export const handleError: HandleServerError = async ({ error, event }) => {
  // Log to error tracking service
  Sentry.captureException(error);

  console.error('Unexpected error:', error);
  console.error('Request:', event.url.pathname);

  // Return safe error message to client
  return {
    message: 'An unexpected error occurred',
    // Don't expose error details in production
    ...(process.env.NODE_ENV === 'development' && {
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  };
};
```

#### API Route Error Handling

```typescript
// src/routes/api/users/+server.ts
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const limit = parseInt(url.searchParams.get('limit') ?? '10');

    if (limit > 100) {
      throw error(400, 'Limit cannot exceed 100');
    }

    const users = await db.query.users.findMany({
      limit
    });

    return json({ users });
  } catch (err) {
    // Handle expected errors
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }

    // Handle unexpected errors
    console.error('Failed to fetch users:', err);
    throw error(500, 'Failed to fetch users');
  }
};
```

#### Client-Side Error Handling

```svelte
<script lang="ts">
  import { applyAction, enhance } from '$app/forms';

  let errorMessage = $state('');

  async function handleSubmit() {
    errorMessage = '';

    return async ({ result }) => {
      if (result.type === 'failure') {
        errorMessage = 'Failed to submit form';
      } else if (result.type === 'error') {
        errorMessage = result.error.message;
      }

      await applyAction(result);
    };
  }
</script>

{#if errorMessage}
  <div class="error">{errorMessage}</div>
{/if}

<form method="POST" use:enhance={handleSubmit}>
  <!-- form fields -->
</form>
```

### Component Composition

#### Snippets (Svelte 5)

Snippets replace slots for better type safety and flexibility.

```svelte
<!-- Card.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title?: Snippet;
    content: Snippet;
    footer?: Snippet;
    variant?: 'default' | 'bordered';
  }

  let { title, content, footer, variant = 'default' }: Props = $props();
</script>

<div class="card" class:bordered={variant === 'bordered'}>
  {#if title}
    <div class="card-header">
      {@render title()}
    </div>
  {/if}

  <div class="card-body">
    {@render content()}
  </div>

  {#if footer}
    <div class="card-footer">
      {@render footer()}
    </div>
  {/if}
</div>
```

```svelte
<!-- Usage -->
<script lang="ts">
  import Card from '$lib/components/Card.svelte';
</script>

<Card variant="bordered">
  {#snippet title()}
    <h2>My Card Title</h2>
  {/snippet}

  {#snippet content()}
    <p>This is the card content.</p>
  {/snippet}

  {#snippet footer()}
    <button>Action</button>
  {/snippet}
</Card>
```

#### Snippets with Parameters

```svelte
<!-- List.svelte -->
<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';

  interface Props {
    items: T[];
    renderItem: Snippet<[T, number]>;
    emptyState?: Snippet;
  }

  let { items, renderItem, emptyState }: Props = $props();
</script>

{#if items.length === 0}
  {#if emptyState}
    {@render emptyState()}
  {:else}
    <p>No items</p>
  {/if}
{:else}
  <ul>
    {#each items as item, index}
      <li>
        {@render renderItem(item, index)}
      </li>
    {/each}
  </ul>
{/if}
```

```svelte
<!-- Usage -->
<script lang="ts">
  import List from '$lib/components/List.svelte';

  let users = $state([
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' }
  ]);
</script>

<List items={users}>
  {#snippet renderItem(user, index)}
    <span>{index + 1}. {user.name}</span>
  {/snippet}

  {#snippet emptyState()}
    <p>No users found. <a href="/invite">Invite some!</a></p>
  {/snippet}
</List>
```

#### Render Props Pattern

```svelte
<!-- DataProvider.svelte -->
<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';

  interface Props {
    fetch: () => Promise<T>;
    children: Snippet<[{
      data: T | null;
      loading: boolean;
      error: Error | null;
      refetch: () => Promise<void>;
    }]>;
  }

  let { fetch, children }: Props = $props();

  let data = $state<T | null>(null);
  let loading = $state(true);
  let error = $state<Error | null>(null);

  async function loadData() {
    loading = true;
    error = null;
    try {
      data = await fetch();
    } catch (err) {
      error = err instanceof Error ? err : new Error('Unknown error');
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    loadData();
  });
</script>

{@render children({ data, loading, error, refetch: loadData })}
```

```svelte
<!-- Usage -->
<script lang="ts">
  import DataProvider from '$lib/components/DataProvider.svelte';

  async function fetchUsers() {
    const res = await fetch('/api/users');
    return res.json();
  }
</script>

<DataProvider fetch={fetchUsers}>
  {#snippet children({ data, loading, error, refetch })}
    {#if loading}
      <p>Loading...</p>
    {:else if error}
      <p>Error: {error.message}</p>
      <button onclick={refetch}>Retry</button>
    {:else if data}
      <ul>
        {#each data as user}
          <li>{user.name}</li>
        {/each}
      </ul>
    {/if}
  {/snippet}
</DataProvider>
```

#### Composition with Context API

```svelte
<!-- Form.svelte -->
<script lang="ts" module>
  interface FormContext {
    register: (name: string) => void;
    errors: Record<string, string>;
  }
</script>

<script lang="ts">
  import { setContext } from 'svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    children: Snippet;
    onSubmit: (data: FormData) => void;
  }

  let { children, onSubmit }: Props = $props();

  let errors = $state<Record<string, string>>({});
  let registeredFields = new Set<string>();

  const context: FormContext = {
    register: (name: string) => registeredFields.add(name),
    errors
  };

  setContext('form', context);
</script>

<form onsubmit={(e) => {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
  onSubmit(formData);
}}>
  {@render children()}
</form>
```

```svelte
<!-- FormField.svelte -->
<script lang="ts">
  import { getContext, onMount } from 'svelte';
  import type { FormContext } from './Form.svelte';

  interface Props {
    name: string;
    label: string;
    type?: string;
  }

  let { name, label, type = 'text' }: Props = $props();

  const form = getContext<FormContext>('form');

  onMount(() => {
    form.register(name);
  });
</script>

<label>
  {label}
  <input {name} {type} />
  {#if form.errors[name]}
    <span class="error">{form.errors[name]}</span>
  {/if}
</label>
```

### Data Loading Patterns

#### Basic Load Function

```typescript
// src/routes/posts/+page.server.ts
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async () => {
  const posts = await db.query.posts.findMany({
    orderBy: (posts, { desc }) => [desc(posts.createdAt)],
    limit: 10
  });

  return { posts };
};
```

#### Parallel Data Loading

```typescript
// src/routes/dashboard/+page.server.ts
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  // Load data in parallel
  const [user, stats, notifications] = await Promise.all([
    db.query.users.findFirst({
      where: eq(users.id, locals.userId)
    }),
    db.query.analytics.findFirst({
      where: eq(analytics.userId, locals.userId)
    }),
    db.query.notifications.findMany({
      where: and(
        eq(notifications.userId, locals.userId),
        eq(notifications.read, false)
      ),
      limit: 5
    })
  ]);

  return {
    user,
    stats,
    notifications
  };
};
```

#### Dependent Data Loading

```typescript
// src/routes/posts/[id]/+page.server.ts
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
  // First load the post
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, params.id)
  });

  if (!post) {
    throw error(404, 'Post not found');
  }

  // Then load related data
  const [author, comments] = await Promise.all([
    db.query.users.findFirst({
      where: eq(users.id, post.authorId)
    }),
    db.query.comments.findMany({
      where: eq(comments.postId, post.id),
      orderBy: (comments, { desc }) => [desc(comments.createdAt)]
    })
  ]);

  return {
    post,
    author,
    comments
  };
};
```

#### Streaming with Promises

```typescript
// src/routes/dashboard/+page.server.ts
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  // Return immediately available data
  // and stream slow data
  return {
    // Fast data - loaded immediately
    user: await db.query.users.findFirst({ ... }),

    // Slow data - streamed to client
    analytics: db.query.analytics.findFirst({ ... }), // Returns Promise
    posts: loadSlowPosts() // Returns Promise
  };
};

async function loadSlowPosts() {
  // Simulate slow query
  await new Promise(resolve => setTimeout(resolve, 2000));
  return db.query.posts.findMany({ ... });
}
```

```svelte
<!-- src/routes/dashboard/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<!-- User is available immediately -->
<h1>Welcome, {data.user.name}</h1>

<!-- Analytics streams in -->
{#await data.analytics}
  <p>Loading analytics...</p>
{:then analytics}
  <div>{analytics.views} views</div>
{:catch error}
  <p>Failed to load analytics</p>
{/await}

<!-- Posts stream in -->
{#await data.posts}
  <p>Loading posts...</p>
{:then posts}
  <ul>
    {#each posts as post}
      <li>{post.title}</li>
    {/each}
  </ul>
{/await}
```

#### Parent Data Access

```typescript
// src/routes/(protected)/+layout.server.ts
export const load: LayoutServerLoad = async ({ locals }) => {
  return {
    user: locals.user
  };
};
```

```typescript
// src/routes/(protected)/settings/+page.server.ts
export const load: PageServerLoad = async ({ parent }) => {
  // Access parent layout data
  const { user } = await parent();

  const settings = await db.query.settings.findFirst({
    where: eq(settings.userId, user.id)
  });

  return { settings };
};
```

#### Invalidation and Reloading

```svelte
<script lang="ts">
  import { invalidate, invalidateAll } from '$app/navigation';

  async function refreshUser() {
    // Invalidate specific data
    await invalidate('/api/user');
  }

  async function refreshAll() {
    // Invalidate all data
    await invalidateAll();
  }

  async function refreshDependency() {
    // Invalidate by dependency
    await invalidate((url) => url.pathname.startsWith('/api'));
  }
</script>
```

#### Preloading Data

```svelte
<script lang="ts">
  import { preloadData } from '$app/navigation';

  async function handleMouseEnter() {
    // Preload data for a route
    await preloadData('/dashboard');
  }
</script>

<a
  href="/dashboard"
  onmouseenter={handleMouseEnter}
>
  Dashboard
</a>
```

### API Design Patterns

#### REST API Routes

```typescript
// src/routes/api/posts/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /api/posts
export const GET: RequestHandler = async ({ url, locals }) => {
  const page = parseInt(url.searchParams.get('page') ?? '1');
  const limit = parseInt(url.searchParams.get('limit') ?? '10');

  if (limit > 100) {
    throw error(400, 'Limit cannot exceed 100');
  }

  const posts = await db.query.posts.findMany({
    limit,
    offset: (page - 1) * limit,
    orderBy: (posts, { desc }) => [desc(posts.createdAt)]
  });

  const total = await db.select({ count: count() })
    .from(posts)
    .then(res => res[0].count);

  return json({
    posts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
};

// POST /api/posts
export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    throw error(401, 'Unauthorized');
  }

  const body = await request.json();

  // Validate
  if (!body.title || !body.content) {
    throw error(400, 'Title and content are required');
  }

  const [post] = await db.insert(posts).values({
    title: body.title,
    content: body.content,
    authorId: locals.user.id,
    createdAt: new Date()
  }).returning();

  return json(post, { status: 201 });
};
```

```typescript
// src/routes/api/posts/[id]/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /api/posts/:id
export const GET: RequestHandler = async ({ params }) => {
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, params.id)
  });

  if (!post) {
    throw error(404, 'Post not found');
  }

  return json(post);
};

// PATCH /api/posts/:id
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.user) {
    throw error(401, 'Unauthorized');
  }

  const post = await db.query.posts.findFirst({
    where: eq(posts.id, params.id)
  });

  if (!post) {
    throw error(404, 'Post not found');
  }

  if (post.authorId !== locals.user.id) {
    throw error(403, 'Forbidden');
  }

  const body = await request.json();

  const [updatedPost] = await db.update(posts)
    .set({
      title: body.title ?? post.title,
      content: body.content ?? post.content,
      updatedAt: new Date()
    })
    .where(eq(posts.id, params.id))
    .returning();

  return json(updatedPost);
};

// DELETE /api/posts/:id
export const DELETE: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) {
    throw error(401, 'Unauthorized');
  }

  const post = await db.query.posts.findFirst({
    where: eq(posts.id, params.id)
  });

  if (!post) {
    throw error(404, 'Post not found');
  }

  if (post.authorId !== locals.user.id) {
    throw error(403, 'Forbidden');
  }

  await db.delete(posts).where(eq(posts.id, params.id));

  return json({ success: true });
};
```

#### Typed API Client

```typescript
// src/lib/api/client.ts
type ApiResponse<T> = {
  data: T;
  error: null;
} | {
  data: null;
  error: string;
};

export async function apiRequest<T>(
  path: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });

    if (!response.ok) {
      const error = await response.text();
      return { data: null, error };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  }
}

// Typed API methods
export const api = {
  posts: {
    list: (params?: { page?: number; limit?: number }) =>
      apiRequest<{ posts: Post[]; pagination: Pagination }>(
        `/api/posts?${new URLSearchParams(params as any)}`
      ),

    get: (id: string) =>
      apiRequest<Post>(`/api/posts/${id}`),

    create: (data: { title: string; content: string }) =>
      apiRequest<Post>('/api/posts', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    update: (id: string, data: Partial<Post>) =>
      apiRequest<Post>(`/api/posts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),

    delete: (id: string) =>
      apiRequest<{ success: boolean }>(`/api/posts/${id}`, {
        method: 'DELETE'
      })
  }
};
```

```svelte
<!-- Usage -->
<script lang="ts">
  import { api } from '$lib/api/client';

  let posts = $state<Post[]>([]);
  let error = $state('');

  async function loadPosts() {
    const result = await api.posts.list({ page: 1, limit: 10 });

    if (result.error) {
      error = result.error;
    } else {
      posts = result.data.posts;
    }
  }

  $effect(() => {
    loadPosts();
  });
</script>
```

#### API Middleware Pattern

```typescript
// src/lib/server/middleware.ts
import { error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export function requireAuth(event: RequestEvent) {
  if (!event.locals.user) {
    throw error(401, 'Unauthorized');
  }
  return event.locals.user;
}

export function requireRole(role: string) {
  return (event: RequestEvent) => {
    const user = requireAuth(event);

    if (user.role !== role) {
      throw error(403, 'Forbidden');
    }

    return user;
  };
}

export async function validateBody<T>(
  request: Request,
  schema: z.Schema<T>
): Promise<T> {
  const body = await request.json();
  const result = schema.safeParse(body);

  if (!result.success) {
    throw error(400, {
      message: 'Validation failed',
      errors: result.error.flatten()
    });
  }

  return result.data;
}
```

```typescript
// Usage in API routes
import { requireAuth, validateBody } from '$lib/server/middleware';

export const POST: RequestHandler = async (event) => {
  const user = requireAuth(event);

  const body = await validateBody(event.request, postSchema);

  // Proceed with authenticated request...
};
```

#### Rate Limiting

```typescript
// src/lib/server/rate-limit.ts
import { error } from '@sveltejs/kit';

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  identifier: string,
  limit: number,
  windowMs: number
) {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + windowMs
    });
    return;
  }

  if (record.count >= limit) {
    throw error(429, 'Too many requests');
  }

  record.count++;
}
```

```typescript
// Usage
import { rateLimit } from '$lib/server/rate-limit';

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  const ip = getClientAddress();

  // 10 requests per minute
  rateLimit(ip, 10, 60 * 1000);

  // Proceed with request...
};
```

## Planned Features

### Authentication (To Be Implemented)
- User registration and login
- Password hashing (consider using `@node-rs/argon2` or similar)
- Session management (cookies + database sessions)
- Email verification
- Password reset flow
- Consider using:
  - **Lucia** for session management
  - **oslo** for auth utilities
  - Or custom implementation with SvelteKit's built-in features

### Protected Routes (To Be Implemented)
Pattern for protected routes in SvelteKit:
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
├── (auth)/              # Public auth routes (login, register)
│   ├── login/
│   └── register/
└── (protected)/         # Protected routes
    ├── dashboard/
    └── settings/
```

## Testing Strategy

### Unit Tests
- Test utilities and business logic
- Test Svelte components in isolation
- Use Vitest with browser mode for component testing
- Example: `src/routes/page.svelte.spec.ts`

### E2E Tests
- Use Playwright for full user flows
- Test authentication flows
- Test protected route access
- Test critical user journeys

## Database Migrations

### Workflow
1. **Modify schema**: Edit `src/lib/server/db/schema.ts`
2. **Generate migration**: `npm run db:generate`
3. **Review migration**: Check generated SQL in `drizzle/` folder
4. **Apply migration**: `npm run db:migrate`

### Development vs Production
- **Development**: Use `db:push` for quick schema changes
- **Production**: Always use `db:generate` + `db:migrate` for tracked changes

## Adding New UI Components

Use the shadcn-svelte CLI to add components:
```bash
npx shadcn-svelte@latest add [component-name]
```

Components are added to `src/lib/components/ui/` and can be customized.

## Performance Considerations

- **Server-Side Rendering**: Enabled by default for better SEO and initial load
- **Code Splitting**: Automatic route-based splitting by Vite
- **Lazy Loading**: Use dynamic imports for heavy components
- **Database Connection**: Use connection pooling (configured in postgres client)

## Deployment

### Build
```bash
npm run build
```

Produces a Node.js server in the `build/` directory.

### Environment Variables
Ensure `DATABASE_URL` is set in production environment.

### Node Adapter
The project uses `@sveltejs/adapter-node` which:
- Creates a standalone Node server
- Supports custom ports via `PORT` environment variable
- Can be deployed to Node-compatible platforms (Render, Railway, Fly.io, etc.)

## Important Notes

### Server vs Client Code
- **Server-only code**: Must be in `src/lib/server/` or `*.server.ts` files
- **Database access**: Should only happen in:
  - `+page.server.ts` / `+layout.server.ts` (load functions)
  - `+server.ts` (API routes)
  - Server hooks

### Type Safety
- Use `$types` imports for route data types
- Drizzle provides full type safety for database queries
- Enable strict mode in TypeScript (already configured)

### Security Considerations for SaaS
- Never expose database credentials to client
- Implement CSRF protection for auth forms
- Use HTTP-only cookies for session tokens
- Sanitize user input
- Implement rate limiting for auth endpoints
- Use parameterized queries (Drizzle handles this)

## Resources

- [SvelteKit Docs](https://kit.svelte.dev/docs)
- [Svelte 5 Docs](https://svelte-5-preview.vercel.app/docs)
- [Drizzle ORM Docs](https://orm.drizzle.team/docs/overview)
- [shadcn-svelte](https://www.shadcn-svelte.com/)
- [Tailwind CSS v4](https://tailwindcss.com/docs)

## Next Steps

1. Implement authentication system
2. Set up protected route structure
3. Add session management
4. Create user management tables
5. Build login/register UI
6. Implement email verification
7. Add password reset functionality
8. Set up role-based access control (if needed)
9. Add comprehensive tests for auth flows
10. Configure production deployment
