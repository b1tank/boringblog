# Sprint Plan — BoringBlog Full Build

## Sprint Scope

Build the entire BoringBlog application from empty repo to working local dev + Azure-ready infra. Skip steps requiring user credentials (az login, Namecheap DNS, GitHub Secrets setup).

## Prioritized Task List

- [x] **T1** Phase 0.1 — Initialize Next.js, install all deps, .gitignore, .env.example, docker-compose.yml, next.config.ts
- [x] **T2** Phase 0.2 — Bicep infrastructure (6 modules + main.bicep + bicepparam.example)
- [x] **T3** Phase 0.4 — GitHub Actions workflows (deploy.yml + infra.yml)
- [x] **T4** Phase 1 — Prisma schema, client singleton, seed script
- [x] **T5** Phase 2.1–2.2 — Auth lib (iron-session config) + auth API routes (login, logout, me, forgot, reset)
- [x] **T6** Phase 2.3–2.4 — Login page, forgot password page, reset password page
- [x] **T7** Phase 2.5 — Admin settings page (invite users)
- [x] **T8** Phase 2.6 — Auth middleware
- [x] **T9** Phase 3.1 — Root layout + typography + Tailwind config
- [x] **T10** Phase 2.7 + 3.7 — Header component with auth state + dark mode toggle
- [x] **T11** Phase 3.2 — Homepage (post list)
- [x] **T12** Phase 3.3 — Post detail page
- [x] **T13** Phase 3.4–3.5 — Author pages + tag pages
- [x] **T14** Phase 3.6 — RSS feed
- [x] **T15** Phase 4.1 — Tiptap editor setup (Editor.tsx + video embed)
- [x] **T16** Phase 4.2 — Image upload API + Azure Blob helpers
- [x] **T17** Phase 4.4 — Post CRUD API (/api/posts)
- [x] **T18** Phase 4.5–4.7 — Write page, edit page, drafts page
- [x] **T19** Phase 5.1–5.2 — SEO (sitemap, robots, structured data) + performance (ISR, revalidation)
- [x] **T20** Phase 5.5 — Dockerfile
- [x] **T21** Phase 5.6 — README.md
- [x] **T22** Final build check + push all commits

## Deferred (Requires User Input)

- **Phase 0.3** — DNS delegation: requires Namecheap login (manual step)
- **Phase 0.2 deployment** — `az deployment group create` requires `az login` session
- **Phase 0.4 secrets** — GitHub repo secrets (AZURE_CREDENTIALS, DATABASE_URL, etc.)
- **Phase 5.4** — Custom domain binding: requires deployed DNS zone + az login
- **Prisma migrate** — Needs running PostgreSQL (user starts with `docker-compose up`)
- **Prisma seed** — Needs running PostgreSQL + real credentials in .env

## Hiccups & Notes

- **Prisma 7 breaking change**: `url` property no longer allowed in `schema.prisma` datasource block. Moved to `prisma.config.ts`. PrismaClient constructor doesn't accept `datasourceUrl` either. Fixed with lazy Proxy initialization — PrismaClient only created on first property access, avoiding build-time DB connection attempts.
- **Resend API key validation**: `new Resend()` throws at module load if API key is missing. Fixed with lazy factory function `getResend()`.
- **Next.js 16 middleware deprecation**: Warning about "middleware" → "proxy" convention. Middleware still works but is deprecated. Low priority to migrate.
- **Tailwind v4**: No `tailwind.config.ts` — all config in CSS via `@import "tailwindcss"` and `@theme inline` blocks.
- **Static pre-rendering**: Server components using Prisma fail during `next build` without DB. Added `export const dynamic = "force-dynamic"` to all pages/routes that query the database.
- **create-next-app interactive**: Prompt for React Compiler (`--turbopack` flag doesn't skip it). Piped `echo "n"` to bypass.
