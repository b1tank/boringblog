# Sprint Plan — BoringBlog Full Build

## Sprint Scope

Build the entire BoringBlog application from empty repo to working local dev + Azure-ready infra. Skip steps requiring user credentials (az login, Namecheap DNS, GitHub Secrets setup).

## Prioritized Task List

- [ ] **T1** Phase 0.1 — Initialize Next.js, install all deps, .gitignore, .env.example, docker-compose.yml, next.config.ts
- [ ] **T2** Phase 0.2 — Bicep infrastructure (6 modules + main.bicep + bicepparam.example)
- [ ] **T3** Phase 0.4 — GitHub Actions workflows (deploy.yml + infra.yml)
- [ ] **T4** Phase 1 — Prisma schema, client singleton, seed script
- [ ] **T5** Phase 2.1–2.2 — Auth lib (iron-session config) + auth API routes (login, logout, me, forgot, reset)
- [ ] **T6** Phase 2.3–2.4 — Login page, forgot password page, reset password page
- [ ] **T7** Phase 2.5 — Admin settings page (invite users)
- [ ] **T8** Phase 2.6 — Auth middleware
- [ ] **T9** Phase 3.1 — Root layout + typography + Tailwind config
- [ ] **T10** Phase 2.7 + 3.7 — Header component with auth state + dark mode toggle
- [ ] **T11** Phase 3.2 — Homepage (post list)
- [ ] **T12** Phase 3.3 — Post detail page
- [ ] **T13** Phase 3.4–3.5 — Author pages + tag pages
- [ ] **T14** Phase 3.6 — RSS feed
- [ ] **T15** Phase 4.1 — Tiptap editor setup (Editor.tsx + video embed)
- [ ] **T16** Phase 4.2 — Image upload API + Azure Blob helpers
- [ ] **T17** Phase 4.4 — Post CRUD API (/api/posts)
- [ ] **T18** Phase 4.5–4.7 — Write page, edit page, drafts page
- [ ] **T19** Phase 5.1–5.2 — SEO (sitemap, robots, structured data) + performance (ISR, revalidation)
- [ ] **T20** Phase 5.5 — Dockerfile
- [ ] **T21** Phase 5.6 — README.md
- [ ] **T22** Final build check + push all commits

## Deferred (Requires User Input)

- **Phase 0.3** — DNS delegation: requires Namecheap login (manual step)
- **Phase 0.2 deployment** — `az deployment group create` requires `az login` session
- **Phase 0.4 secrets** — GitHub repo secrets (AZURE_CREDENTIALS, DATABASE_URL, etc.)
- **Phase 5.4** — Custom domain binding: requires deployed DNS zone + az login
- **Prisma migrate** — Needs running PostgreSQL (user starts with `docker-compose up`)
- **Prisma seed** — Needs running PostgreSQL + real credentials in .env

## Hiccups & Notes

(updated during sprint)
