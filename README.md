# FormTrap

A SaaS form backend built with SvelteKit 2 and a Go API. Collect form submissions, manage workspaces (spaces), and bring your own email/storage providers.

## Tech Stack

- **Frontend:** SvelteKit 2, Svelte 5, TypeScript, Tailwind CSS v4, shadcn-svelte
- **API:** Go (handles form submissions, job queue, file uploads)
- **Database:** PostgreSQL with Drizzle ORM
- **Auth:** Better Auth
- **Email:** Mailgun (+ BYOS: Resend, SendGrid, SES, SMTP)
- **Storage:** Cloudflare R2 (+ BYOS options)

## Prerequisites

- [Bun](https://bun.sh/) (v1.1+)
- [Go](https://go.dev/) (v1.23+)
- PostgreSQL
- Redis (for rate limiting)

## Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your values. At minimum you need:

- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `BETTER_AUTH_SECRET` — generate with `openssl rand -base64 32`

### 3. Set up the database

```bash
bun run db:migrate
```

## Development

Run both servers in separate terminals:

```bash
# Terminal 1 — SvelteKit frontend (port 5173)
bun run dev

# Terminal 2 — Go API (port 8080)
cd api && make watch
```

`make watch` uses [Air](https://github.com/air-verse/air) for live reload. If Air isn't installed, it'll prompt you to install it. You can also run the API without live reload:

```bash
cd api && make run
```

## Scripts

### Database

| Command | Description |
|---|---|
| `bun run db:migrate` | Run migrations |
| `bun run db:generate` | Generate migration files from schema changes |
| `bun run db:push` | Push schema directly (dev only) |
| `bun run db:studio` | Open Drizzle Studio GUI |

### Testing

| Command | Description |
|---|---|
| `bun run test:unit` | Run unit tests (Vitest) |
| `bun run test:e2e` | Run e2e tests (Playwright) |
| `cd api && make test` | Run Go API tests |

### Code Quality

| Command | Description |
|---|---|
| `bun run check` | TypeScript type checking |
| `bun run lint` | Lint with ESLint + Prettier |
| `bun run format` | Auto-format code |

### Other

| Command | Description |
|---|---|
| `bun run email:dev` | Preview email templates (port 3001) |
| `bun run build` | Production build |
| `bun run preview` | Preview production build |

## Project Structure

```
formtrap/
├── src/
│   ├── routes/
│   │   ├── (auth)/          # Login, register, etc.
│   │   ├── (marketing)/     # Landing, pricing, docs
│   │   ├── (protected)/     # Dashboard, spaces, forms, settings
│   │   ├── (superadmin)/    # Admin panel
│   │   └── api/             # API routes
│   └── lib/
│       ├── components/ui/   # shadcn-svelte components
│       ├── server/db/       # Drizzle schema & queries
│       └── server/          # Auth, email, storage, etc.
├── api/                     # Go API (submissions, jobs, uploads)
├── drizzle/                 # Migration files
└── emails/                  # Email templates (preview only)
```
