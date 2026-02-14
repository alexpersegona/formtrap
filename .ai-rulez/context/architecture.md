---
priority: high
---
# Project Architecture

## Project Overview

This is a **SaaS skeleton/starter template** built with SvelteKit 2, designed to provide a solid foundation for building software-as-a-service applications. The project includes authentication and protected routes as core features.

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
- **Design System**: Stone color scheme

### Database & ORM
- **PostgreSQL** - Primary database
- **Drizzle ORM** - Type-safe SQL ORM with migrations

### Email
- **Mailgun** - Email delivery service
- **React Email** - Email template system (preview only)

### Authentication
- **Better Auth** - Authentication and session management

### Testing
- **Vitest** - Unit testing framework
- **Playwright** - End-to-end testing

## Project Structure

```
formtrap/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   └── ui/          # shadcn-svelte components
│   │   ├── server/
│   │   │   └── db/          # Database layer
│   │   │       ├── schema.ts   # Drizzle schema
│   │   │       └── index.ts    # DB connection
│   │   ├── utils.ts         # Utility functions (cn, etc.)
│   │   └── index.ts
│   ├── routes/              # SvelteKit routes
│   │   ├── (auth)/          # Public auth routes
│   │   ├── (protected)/     # Protected routes
│   │   └── api/             # API routes
│   ├── app.html             # HTML template
│   ├── app.css              # Global styles
│   └── app.d.ts             # Type definitions
├── emails/                  # React Email templates (preview)
├── drizzle/                 # Migration files
├── static/                  # Static assets
└── tests/                   # Test files
```

## Development Commands

```bash
# Development
bun run dev              # Start dev server

# Database
bun run db:push          # Push schema changes
bun run db:generate      # Generate migrations
bun run db:migrate       # Run migrations
bun run db:studio        # Open Drizzle Studio

# Testing
bun run test:unit        # Run unit tests
bun run test             # Run all tests

# Code Quality
bun run format           # Format code
bun run lint             # Lint code
bun run check            # Type check
```

## Important Notes

### Server vs Client Code
- **Server-only code**: Must be in `src/lib/server/` or `*.server.ts` files
- **Database access**: Only in `+page.server.ts`, `+layout.server.ts`, `+server.ts`, or hooks

### Type Safety
- Use `$types` imports for route data types
- Drizzle provides full type safety for database queries
- Enable strict mode in TypeScript
