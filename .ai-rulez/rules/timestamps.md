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
