<!--
🤖 AI-RULEZ :: GENERATED FILE — DO NOT EDIT DIRECTLY
Project: FormTrap
Generated: 2026-01-28 14:28:40
Source: .ai-rulez/config.yaml
Target: CLAUDE.md
Content: rules=10, sections=0, agents=0

WHAT IS AI-RULEZ
AI-Rulez is a directory-based AI governance tool. All configuration lives in
the .ai-rulez/ directory. This file is auto-generated from source files.

.AI-RULEZ FOLDER ORGANIZATION
Root content (always included):
  .ai-rulez/config.yaml    Main configuration (presets, profiles)
  .ai-rulez/rules/         Mandatory rules for AI assistants
  .ai-rulez/context/       Reference documentation
  .ai-rulez/skills/        Specialized AI prompts
  .ai-rulez/agents/        Agent definitions

Domain content (profile-specific):
  .ai-rulez/domains/{name}/rules/    Domain-specific rules
  .ai-rulez/domains/{name}/context/  Domain-specific documentation
  .ai-rulez/domains/{name}/skills/   Domain-specific AI prompts

Profiles in config.yaml control which domains are included.

INSTRUCTIONS FOR AI AGENTS
1. NEVER edit this file (CLAUDE.md) - it is auto-generated

2. ALWAYS edit files in .ai-rulez/ instead:
   - Add/modify rules: .ai-rulez/rules/*.md
   - Add/modify context: .ai-rulez/context/*.md
   - Update config: .ai-rulez/config.yaml
   - Domain-specific: .ai-rulez/domains/{name}/rules/*.md

3. PREFER using the MCP Server (if available):
   Command: npx -y ai-rulez@latest mcp
   Provides safe CRUD tools for reading and modifying .ai-rulez/ content

4. After making changes: ai-rulez generate

5. Complete workflow:
   a. Edit source files in .ai-rulez/
   b. Run: ai-rulez generate
   c. Commit both .ai-rulez/ and generated files

Documentation: https://github.com/Goldziher/ai-rulez
-->

# FormTrap

SvelteKit SaaS application with Better Auth, Drizzle ORM, and shadcn-svelte

## Rules

### api

**Priority:** medium

## REST API Routes

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

  return json({ posts, pagination: { page, limit } });
};

// POST /api/posts
export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    throw error(401, 'Unauthorized');
  }

  const body = await request.json();

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

## API Middleware Pattern

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

## Rate Limiting

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

## Typed API Client

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
```

### auth

**Priority:** high

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

### critical-patterns

**Priority:** critical

## Before Implementing ANY New Feature

**ALWAYS check the codebase first to see if similar functionality already exists!**

1. **Search for existing implementations** using Grep/Glob tools
2. **Check relevant directories** (e.g., `src/lib/server/` for server utilities, `emails/` for email templates)
3. **Look for patterns** in similar features already built
4. **Reuse existing utilities and patterns** instead of creating new ones
5. **Ask the user if unsure** whether something already exists

**Examples of what to check:**
- Email functionality? Check `src/lib/server/email.ts` and `emails/` directory
- Authentication? Check `src/lib/server/auth.ts`
- Database queries? Check existing route files for patterns
- UI components? Check `src/lib/components/ui/`

## Form Actions Must Use `use:enhance` Pattern

**NEVER use `fetch` to call SvelteKit form actions. ALWAYS use the `use:enhance` pattern with HTML forms.**

### WRONG - Using fetch (causes "Failed" errors even when it works):
```typescript
async function handleAction() {
    const response = await fetch('?/actionName', { method: 'POST', body: formData });
    const result = await response.json(); // This fails or returns wrong format
}
```

### CORRECT - Using hidden form with use:enhance:
```svelte
<script lang="ts">
    import { enhance } from '$app/forms';
    import type { SubmitFunction } from '@sveltejs/kit';

    let formRef: HTMLFormElement;
    let loading = $state(false);

    const handleSubmit: SubmitFunction = () => {
        loading = true;
        return async ({ result, update }) => {
            if (result.type === 'success') {
                toast.success('Action completed successfully');
                await update();
            } else if (result.type === 'failure') {
                toast.error('Action failed');
            }
            loading = false;
        };
    };

    function triggerAction() {
        formRef.requestSubmit();
    }
</script>

<form bind:this={formRef} method="POST" action="?/actionName" use:enhance={handleSubmit} class="hidden">
    <input type="hidden" name="data" value={someValue} />
</form>

<Button onclick={triggerAction}>Trigger Action</Button>
```

**Why this matters:**
- `fetch` to `?/actionName` returns SvelteKit's wrapped response format, not pure JSON
- Frontend shows errors even when backend succeeds
- `use:enhance` properly handles SvelteKit's response types (success, failure, redirect)
- Toast notifications work correctly
- State updates (invalidateAll) work properly

**Reference:** See working examples in `src/routes/(protected)/spaces/[id]/forms/[formId]/edit/+page.svelte`

## Svelte 5 - Never Mix `let:` Directives with Snippet-Based Components

**ERROR: "invalid_default_snippet" - Cannot use `{@render children(...)}` if parent uses `let:` directives**

### WRONG - Using `let:` with default children:
```svelte
<Popover.Trigger asChild let:builder>
  <Button builders={[builder]}>Click me</Button>
</Popover.Trigger>
```

### CORRECT - Use named snippet:
```svelte
<Popover.Trigger asChild let:builder>
  {#snippet children(props)}
    <Button {...props} builders={[builder]}>Click me</Button>
  {/snippet}
</Popover.Trigger>
```

### ALTERNATIVE - Remove asChild if builder not needed:
```svelte
<Popover.Trigger>
  <Button>Click me</Button>
</Popover.Trigger>
```

**Why this matters:**
- `let:` directives are from Svelte 4's slot system
- `{@render children()}` is Svelte 5's snippet system
- They are incompatible and cannot be mixed
- Modern shadcn-svelte components use snippets internally

**When implementing ANY component with `asChild let:builder`, ALWAYS use the named snippet pattern above.**

### drizzle

**Priority:** medium

## Tech Stack
- **PostgreSQL** - Primary database
- **Drizzle ORM** - Type-safe SQL ORM with migrations
- **Drizzle Kit** - CLI for schema management and migrations

## Environment Variables

Create a `.env` file in the root directory:
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

The database URL is **required** for Drizzle to function.

## Database Commands

```bash
bun run db:push          # Push schema changes to database
bun run db:generate      # Generate migration files
bun run db:migrate       # Run migrations
bun run db:studio        # Open Drizzle Studio (DB GUI)
```

## Schema Location

Schema defined in `src/lib/server/db/schema.ts`

## Migrations Workflow

1. **Modify schema**: Edit `src/lib/server/db/schema.ts`
2. **Generate migration**: `bun run db:generate`
3. **Review migration**: Check generated SQL in `drizzle/` folder
4. **Apply migration**: `bun run db:migrate`

### Development vs Production
- **Development**: Use `db:push` for quick schema changes
- **Production**: Always use `db:generate` + `db:migrate` for tracked changes

## Query Patterns

```typescript
import { db } from '$lib/server/db';
import { eq, and, desc } from 'drizzle-orm';

// Find one
const user = await db.query.users.findFirst({
  where: eq(users.id, userId)
});

// Find many with ordering
const posts = await db.query.posts.findMany({
  orderBy: (posts, { desc }) => [desc(posts.createdAt)],
  limit: 10
});

// Insert
const [post] = await db.insert(posts).values({
  title: 'New Post',
  authorId: userId,
  createdAt: new Date()
}).returning();

// Update
await db.update(posts)
  .set({ title: 'Updated' })
  .where(eq(posts.id, postId));

// Delete
await db.delete(posts).where(eq(posts.id, postId));
```

## MCP Server

This project has a **Postgres MCP server** configured in `.claude/settings.json` that provides direct database access.

### Checking Database Schema
```bash
psql "$DATABASE_URL" -c "\d \"tableName\""
```

**Note:** The Postgres MCP server uses `${DATABASE_URL}` environment variable.

### email

**Priority:** medium

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

### external-scripts

## External Scripts & SPA Navigation

**Priority:** high

Scripts loaded via `<svelte:head>` do NOT re-execute on SPA (client-side) navigation. This breaks third-party widgets like Turnstile, reCAPTCHA, hCaptcha, analytics, etc.

## The Problem

```svelte
<!-- WRONG - Script won't reload on SPA navigation -->
<svelte:head>
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
</svelte:head>

<div class="cf-turnstile" data-sitekey={siteKey}></div>
```

When navigating to this page via an internal link (SPA), the script tag is ignored because:
1. The script may already be in the document
2. `<svelte:head>` doesn't re-execute scripts on client-side navigation
3. Auto-rendering widgets won't find their containers

## The Solution

Use `onMount` with dynamic script loading and explicit rendering:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';

  let widgetContainer: HTMLDivElement;
  let widgetId: string | null = $state(null);

  onMount(() => {
    const siteKey = env.PUBLIC_TURNSTILE_SITE_KEY;
    if (!siteKey || !widgetContainer) return;

    function renderWidget() {
      const turnstile = (window as any).turnstile;
      if (!turnstile || !widgetContainer) return;

      widgetContainer.innerHTML = '';
      widgetId = turnstile.render(widgetContainer, {
        sitekey: siteKey,
        theme: 'auto'
      });
    }

    function loadScriptAndRender() {
      const existingScript = document.querySelector(
        'script[src*="challenges.cloudflare.com/turnstile"]'
      );

      if ((window as any).turnstile) {
        // Already loaded, render immediately
        renderWidget();
      } else if (existingScript) {
        // Script exists but not ready, poll until ready
        const interval = setInterval(() => {
          if ((window as any).turnstile) {
            clearInterval(interval);
            renderWidget();
          }
        }, 50);
        setTimeout(() => clearInterval(interval), 10000);
      } else {
        // Load script dynamically with explicit render mode
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.onload = () => setTimeout(renderWidget, 100);
        document.head.appendChild(script);
      }
    }

    loadScriptAndRender();

    // Cleanup on unmount
    return () => {
      const turnstile = (window as any).turnstile;
      if (widgetId && turnstile) {
        try {
          turnstile.remove(widgetId);
        } catch {
          // Widget may already be removed
        }
      }
    };
  });
</script>

<div bind:this={widgetContainer}></div>
```

## Key Points

1. **Use `onMount`** - Runs on every mount, including SPA navigation
2. **Use `?render=explicit`** - Prevents auto-rendering, gives you control
3. **Handle 3 states**:
   - Widget API already loaded → render immediately
   - Script tag exists but API not ready → poll until ready
   - No script → load dynamically
4. **Cleanup on unmount** - Remove widget to prevent memory leaks
5. **Clear container** - Always clear `innerHTML` before rendering to avoid duplicates

## Applies To

- Cloudflare Turnstile
- Google reCAPTCHA
- hCaptcha
- Analytics scripts (Google Analytics, Plausible, etc.)
- Any third-party widget that renders into a container

### shadcn-tailwind

**Priority:** high

## UI Components

**IMPORTANT**: Always use shadcn-svelte components when they exist instead of native HTML elements.

Examples:
- Use `<Checkbox>` instead of `<input type="checkbox">`
- Use `<Input>` instead of `<input>`
- Use `<Button>` instead of `<button>`

Available components are in `src/lib/components/ui/`

If a component doesn't exist, install it with:
```bash
npx shadcn-svelte@latest add [component-name]
```

## Tech Stack
- **Tailwind CSS v4** - Utility-first CSS with JIT compilation
- **shadcn-svelte** - High-quality, accessible UI component library
- **Lucide Svelte** - Icon library
- **Design System**: Stone color scheme (baseColor in components.json)

## Tailwind Plugins
- `@tailwindcss/forms` - Form styling
- `@tailwindcss/typography` - Rich text styling
- `tw-animate-css` - Animation utilities

## Dot Notation Syntax

When working with ShadCN components in SvelteKit, use the **dot notation (compound component)** syntax:

```svelte
<Dialog.Root>
  <Dialog.Trigger>Open</Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Title</Dialog.Title>
      <Dialog.Description>Description</Dialog.Description>
    </Dialog.Header>
  </Dialog.Content>
</Dialog.Root>
```

## Styling Utilities

The project uses `clsx` and `tailwind-merge` via the `cn()` utility:

```typescript
import { cn } from '$lib/utils';

<div class={cn('base-class', conditionalClass && 'conditional', className)} />
```

## Button Variants

Available variants: default, secondary, destructive, outline, ghost, link

```svelte
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
<Button variant="ghost">Menu Item</Button>
```

## Tailwind v4 Transition with Translate

**IMPORTANT**: In Tailwind CSS v4, the `translate-y-*` and `translate-x-*` utilities use the modern CSS `translate` property, NOT `transform: translateY()`.

When animating translate on hover, you must use `translate` as the transition property:

```svelte
<!-- WRONG - won't animate because transform isn't being changed -->
<div class="transition-[transform] hover:-translate-y-2">...</div>

<!-- CORRECT - animates the translate property -->
<div class="transition-[translate] hover:-translate-y-2">...</div>

<!-- For multiple properties -->
<div class="transition-[translate,box-shadow,border-color] duration-500 hover:-translate-y-2 hover:shadow-lg">...</div>
```

### svelte5

**Priority:** high

Svelte 5 introduces runes - a new way to declare reactive state and logic. **Always use runes** instead of legacy Svelte syntax.

## Never Use `<svelte:component>` in Svelte 5 Runes Mode

**ALWAYS avoid `<svelte:component>` in Svelte 5. Components are dynamic by default. Use `{@const}` to assign components to variables, then render directly.**

### WRONG - Using `<svelte:component>` (deprecated):
```svelte
<svelte:component this={getSortIcon(columnId)} class="h-4 w-4" />
```

### CORRECT - Assign with `{@const}`, render directly:
```svelte
{@const SortIcon = getSortIcon(columnId)}
<SortIcon class="h-4 w-4" />
```

**For dynamic components from a map:**
```svelte
<script lang="ts">
  const iconMap = {
    home: HomeIcon,
    settings: SettingsIcon,
    user: UserIcon
  } as const;

  let iconType = $state<keyof typeof iconMap>('home');
</script>

{@const Icon = iconMap[iconType]}
<Icon />
```

## State Management

**$state** - Declare reactive state
```svelte
<script lang="ts">
  let count = $state(0);
  let user = $state({ name: 'John', age: 30 });

  function increment() {
    count++;
  }

  function updateUser() {
    user.age++; // Mutations are reactive
  }
</script>
```

**$state.frozen** - Immutable state (performance optimization). Must replace entire object to update.

## Derived Values

**$derived** - Computed values that update automatically
```svelte
<script lang="ts">
  let count = $state(0);
  let doubled = $derived(count * 2);
  let message = $derived(`Count is ${count}`);

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

## Side Effects

**$effect** - Run side effects when dependencies change
```svelte
<script lang="ts">
  let count = $state(0);

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
**$effect.root** - Create an effect root for manual cleanup

## Component Props

**$props** - Declare component props
```svelte
<script lang="ts">
  interface Props {
    title: string;
    count?: number;
    onUpdate?: (value: number) => void;
  }

  let { title, count = 0, onUpdate }: Props = $props();

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
```

## Snippets (Replace Slots)

Snippets replace slots for better type safety and flexibility.

```svelte
<!-- Card.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title?: Snippet;
    content: Snippet;
    footer?: Snippet;
  }

  let { title, content, footer }: Props = $props();
</script>

<div class="card">
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

**Snippets with Parameters:**
```svelte
<!-- List.svelte -->
<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';

  interface Props {
    items: T[];
    renderItem: Snippet<[T, number]>;
  }

  let { items, renderItem }: Props = $props();
</script>

{#each items as item, index}
  {@render renderItem(item, index)}
{/each}
```

## Best Practices

1. **Use $state for all reactive variables** - No more `let` without $state for reactive values
2. **Use $derived instead of $:** - Derived values are more explicit and composable
3. **Use $effect sparingly** - Prefer derived values when possible
4. **Avoid $effect for derived state** - Use $derived instead
5. **Clean up effects** - Return cleanup functions from $effect
6. **Type your props** - Always use TypeScript interfaces for props
7. **Use $state.frozen for large immutable objects** - Better performance

### sveltekit

**Priority:** high

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

### timestamps

## PostgreSQL Timestamps

**Priority:** high

Always use `timestamp with time zone` (timestamptz) for all date/time fields to avoid timezone issues.

### Drizzle Schema

```typescript
// CORRECT - Always use withTimezone: true
createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
deletedAt: timestamp('deletedAt', { withTimezone: true }),

// WRONG - Never use timestamp without timezone
createdAt: timestamp('createdAt').notNull().defaultNow(), // BAD!
```

### Why This Matters

PostgreSQL `timestamp` (without timezone) stores the literal time value without any timezone context:
1. When JavaScript `new Date()` is stored, the local time portion may be used
2. When reading back, the driver may interpret it as local time
3. This causes times to be off by the server's timezone offset (e.g., 8 hours)

PostgreSQL `timestamptz` (with timezone) properly converts to/from UTC:
1. Stores all times in UTC internally
2. Converts correctly when reading/writing from any timezone
3. Works correctly regardless of server or client timezone

### Checklist for New Tables

- [ ] All `timestamp()` calls include `{ withTimezone: true }`
- [ ] This applies to: createdAt, updatedAt, expiresAt, deletedAt, and any custom date fields

## Context

### architecture

@.ai-rulez/context/architecture.md

