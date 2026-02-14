---
priority: medium
---
# API Design Patterns

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
