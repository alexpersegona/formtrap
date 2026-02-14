---
priority: medium
---
# Drizzle ORM & Database

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
# Development
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
