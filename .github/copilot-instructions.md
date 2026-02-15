# Copilot Instructions for BoringBlog

## Project Snapshot
- BoringBlog is a Chinese-first, invite-only multi-author blog built with Next.js App Router + Prisma + PostgreSQL.
- Public reading routes live under `src/app/*`; authenticated authoring/admin flows are `/write`, `/edit/*`, `/drafts`, `/settings`.
- The same Next.js app serves both UI and backend APIs under `src/app/api/**`.

## First Commands to Run
- Local setup: `bash scripts/setup.sh`
- Start DB: `docker compose up -d`
- Install deps: `npm install`
- Prisma bootstrap: `npx prisma generate && npx prisma migrate dev --name init && npx prisma db seed`
- Run app: `npm run dev`
- Verify changes: prefer `npm run dev` for routine validation and quick checks
- Use `npm run build` only when there is a hard reason to validate production build behavior
- Run `npm run lint` when touching TS/React logic

## Architecture & Data Flow
- Auth uses `iron-session` (`src/lib/auth.ts`) with cookie `boringblog_session`.
- Route protection is centralized in `src/middleware.ts`:
  - Protected: `/write`, `/edit/*`, `/drafts`, `/settings`
  - Admin-only: `/settings`
- Session checks inside API handlers use `getIronSession(await cookies(), sessionOptions)`.
- Posts are stored as both ProseMirror JSON (`content`) and rendered HTML (`contentHtml`) in Prisma (`prisma/schema.prisma`).
- HTML is generated server-side in `src/app/api/posts/route.ts` and `src/app/api/posts/[slug]/route.ts` using Tiptap extensions.

## Critical Sync Points (Easy to Break)
- Keep Tiptap extension capabilities aligned across:
  - `src/components/Editor.tsx`
  - `src/app/api/posts/route.ts`
  - `src/app/api/posts/[slug]/route.ts`
- If adding/removing editor nodes/marks, update all three so saved JSON can still be rendered to HTML.
- Slugs are generated via `generateSlug` in `src/lib/utils.ts` (pinyin + normalized slug + random hex suffix).

## Storage, Email, and Env-Driven Behavior
- Image upload API: `src/app/api/upload/route.ts`
  - Validates image type + max 10MB
  - Re-encodes to WebP via `sharp` (max width 1920)
  - Uses Azure Blob when `AZURE_STORAGE_ACCOUNT_KEY` exists
  - Falls back to local `public/uploads/` in dev
- Password reset email logic is in `src/lib/email.ts`; local dev can run with email envs empty.
- Prisma client is lazily initialized in `src/lib/db.ts` to avoid build-time DB validation failures.

## Project-Specific Conventions
- UI and API user-facing copy is Chinese; keep new labels/errors in Chinese unless explicitly requested.
- Authorization model is role-based (`ADMIN` / `AUTHOR`), with author ownership checks on post edit/delete APIs.
- Tags are normalized by trimming input and creating/connecting `Tag` records by name.
- Login rate limiting in `src/app/api/auth/login/route.ts` is in-memory (per-instance); do not assume cross-instance consistency.

## Implementation Guidance for Agents
- Prefer minimal, surgical edits in existing files and patterns over introducing new abstractions.
- When changing post schema/fields, update both create and update APIs plus corresponding writer/editor UI.
- When changing auth/session behavior, verify both middleware redirects and API session checks.
- For feature work, use `README.md` as operational truth for setup/deploy commands and required env vars.
