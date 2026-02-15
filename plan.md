# BoringBlog — Technical Implementation Plan

## Overview

Six phases, each independently deployable. Estimated total: ~2,500–3,500 lines across ~50 files.

| Phase | Name | Depends On | Key Deliverable |
|-------|------|------------|-----------------|
| 0 | Project Bootstrap & Infra | — | Running Next.js on Azure App Service with DNS |
| 1 | Data Layer | Phase 0 | Prisma schema + migrated PostgreSQL |
| 2 | Authentication | Phase 1 | Invite-only email/password login, password reset, admin invite |
| 3 | Reading Experience (Public) | Phase 1 | Homepage, post pages, tags, RSS |
| 4 | Content Authoring (Protected) | Phase 2 + 3 | Tiptap editor, image upload, CRUD |
| 5 | Polish & Ship | Phase 4 | SEO, performance, CI/CD, custom domain |

Parallel candidates: **Phase 2 and Phase 3** can be built in parallel after Phase 1.

---

## Open-Source Secrets Strategy

> **Concern**: Repo is public from day 1. All Azure subscription IDs, passwords, connection strings, and keys must never touch Git.

### Design

```
Checked in (public):              Gitignored (private):
─────────────────────             ─────────────────────
.env.example                      .env
                                  .env.local
                                  .env.production.local
infra/main.bicepparam.example     infra/main.bicepparam
```

| Secret Category | Where It Lives | How It's Accessed |
|----------------|---------------|-------------------|
| DB connection string | Azure Key Vault | App Service Key Vault Reference |
| Blob Storage key | Azure Key Vault | App Service Key Vault Reference |
| Session encryption key | Azure Key Vault | App Service Key Vault Reference |
| ACS connection string | Azure Key Vault | App Service Key Vault Reference |
| Azure subscription/tenant IDs | GitHub Secrets | CI/CD workflow only |
| Azure service principal creds | GitHub Secrets | CI/CD workflow only |
| Namecheap DNS (manual) | Namecheap dashboard | One-time manual step |

### Rules

1. **`.gitignore`** includes: `.env*local*`, `*.bicepparam` (the real one), `infra/*.json` (ARM outputs)
2. **`.env.example`** has every key with placeholder values and comments in Chinese + English
3. **Bicep parameters**: `main.bicepparam.example` checked in with dummy values; real `main.bicepparam` gitignored
4. **GitHub Actions**: uses `AZURE_CREDENTIALS` (service principal JSON), `AZURE_SUBSCRIPTION_ID` as repo secrets
5. **App Service**: reads secrets from Key Vault via Managed Identity (zero secrets in App Settings directly)
6. **README.md** documents the full secrets setup flow for anyone forking the repo

---

## Auth Design

> **Goal**: Dad opens `yourdomain.com/login` (bookmarked, not linked in nav), types email + password, gets a session cookie, sees "写文章" button. Admin (you) can invite new authors via `/settings`. Authors can self-service reset passwords via email.

### Approach: `iron-session` + bcrypt + Azure Communication Services

**Why not NextAuth.js?** NextAuth is built for multi-provider OAuth flows. For invite-only email/password auth, it adds unnecessary abstraction. `iron-session` is ~3KB, handles encrypted/signed cookies, and works perfectly with Next.js App Router.

**Why ACS for email?** Azure-native, lives in the same resource group. Can use Managed Identity (no extra API key). Free tier: 100 emails/day first month.

See Phase 2 below for full implementation details (login, forgot password, reset, invite, middleware, header state).

---

## Infrastructure (Bicep)

### Azure Resources

```
<your-resource-group> (existing)
├── boringblog-dns          Azure DNS Zone (yourdomain.com)
├── boringblog-kv           Key Vault
├── boringblog-pg           PostgreSQL Flexible Server (Burstable B1ms)
│   └── boringblog          Database
├── boringblog-st           Storage Account
│   └── images              Blob Container (public read)
├── boringblog-plan         App Service Plan (Linux B1)
└── boringblog-app          App Service (Node 20 LTS)
    └── Managed Identity → Key Vault (get secrets), Storage (blob contributor)
```

### Cost Estimate (Monthly)

| Resource | SKU | Est. Cost |
|----------|-----|-----------|
| PostgreSQL Flexible | Burstable B1ms (1 vCore, 2GB) | ~$12 |
| App Service Plan | Linux B1 (1 core, 1.75GB) | ~$13 |
| Storage Account | LRS, minimal usage | ~$0.50 |
| DNS Zone | Per zone + queries | ~$0.50 |
| Key Vault | Minimal operations | ~$0.10 |
| **Total** | | **~$26/mo** |

### Bicep Module Structure

```
infra/
├── main.bicep                    # Orchestrator — calls all modules
├── main.bicepparam.example       # Checked in with placeholders
├── main.bicepparam               # Gitignored, real values
└── modules/
    ├── dns.bicep                 # DNS Zone + records
    ├── postgres.bicep            # PostgreSQL Flexible Server + DB
    ├── storage.bicep             # Storage Account + container + CORS
    ├── keyvault.bicep            # Key Vault + secrets + access policies
    ├── appservice.bicep          # App Service Plan + App + settings
    └── identity.bicep            # User-assigned Managed Identity
```

### Key Bicep Decisions

| Decision | Rationale |
|----------|-----------|
| User-assigned Managed Identity | Shared across App Service → KV + Storage. Cleaner than system-assigned for multi-resource access. |
| Key Vault References in App Settings | App Service reads secrets like `@Microsoft.KeyVault(SecretUri=...)`. No secrets in Bicep outputs. |
| PostgreSQL Flexible (not Single) | Single Server is deprecated. Flexible is the current offering. |
| Storage with public blob access | Blog images should be publicly readable. Container-level public access. |
| CORS on Storage | Allow uploads from `yourdomain.com` origin only. |
| DNS Zone only (no registrar) | Namecheap remains the registrar. Azure DNS is authoritative nameserver. Manual NS delegation. |

### DNS Setup Flow

```
1. Bicep deploys Azure DNS Zone for yourdomain.com
   → Outputs 4 nameservers (e.g., ns1-03.azure-dns.com)

2. MANUAL: Go to Namecheap → Domain → Custom DNS
   → Replace default NS with the 4 Azure NS records

3. Bicep adds A record / CNAME for:
   - yourdomain.com → App Service IP (A record + TXT for verification)
   - www.yourdomain.com → <your-app>.azurewebsites.net (CNAME)

4. App Service custom domain + managed SSL certificate (free)
```

---

## Project Structure

```
boringblog/
├── .github/
│   └── workflows/
│       ├── deploy.yml                # Build + deploy app
│       └── infra.yml                 # Deploy Bicep (manual trigger)
├── infra/
│   ├── main.bicep
│   ├── main.bicepparam.example
│   └── modules/
│       ├── dns.bicep
│       ├── postgres.bicep
│       ├── storage.bicep
│       ├── keyvault.bicep
│       ├── appservice.bicep
│       └── identity.bicep
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                       # Seed admin + first author
├── public/
│   └── favicon.ico
├── src/
│   ├── app/
│   │   ├── layout.tsx                # Root layout (header, fonts, theme)
│   │   ├── page.tsx                  # Home — published post list
│   │   ├── login/
│   │   │   └── page.tsx              # Login form (Chinese UI, hidden)
│   │   ├── forgot-password/
│   │   │   └── page.tsx              # Forgot password form
│   │   ├── reset-password/
│   │   │   └── page.tsx              # Reset password (with token)
│   │   ├── write/
│   │   │   └── page.tsx              # New post (protected)
│   │   ├── edit/
│   │   │   └── [slug]/
│   │   │       └── page.tsx          # Edit post (protected)
│   │   ├── drafts/
│   │   │   └── page.tsx              # My drafts (protected)
│   │   ├── settings/
│   │   │   └── page.tsx              # Admin: invite users (admin only)
│   │   ├── posts/
│   │   │   └── [slug]/
│   │   │       └── page.tsx          # Public post detail
│   │   ├── author/
│   │   │   └── [name]/
│   │   │       └── page.tsx          # Posts by author
│   │   ├── tags/
│   │   │   └── [tag]/
│   │   │       └── page.tsx          # Posts by tag
│   │   ├── feed.xml/
│   │   │   └── route.ts             # RSS feed
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── login/
│   │       │   │   └── route.ts      # POST: verify credentials, set session
│   │       │   ├── logout/
│   │       │   │   └── route.ts      # POST: destroy session
│   │       │   ├── me/
│   │       │   │   └── route.ts      # GET: check session status
│   │       │   ├── forgot-password/
│   │       │   │   └── route.ts      # POST: send reset email via Azure Communication Services
│   │       │   └── reset-password/
│   │       │       └── route.ts      # POST: validate token, update password
│   │       ├── users/
│   │       │   └── invite/
│   │       │       └── route.ts      # POST: admin invites new author
│   │       ├── posts/
│   │       │   ├── route.ts          # GET (list), POST (create w/ authorId)
│   │       │   └── [slug]/
│   │       │       └── route.ts      # GET, PUT (own/admin), DELETE (own/admin)
│   │       └── upload/
│   │           └── route.ts          # POST: upload image to Blob Storage
│   ├── components/
│   │   ├── Header.tsx                # Nav bar with role-aware buttons
│   │   ├── PostCard.tsx              # Post preview card (with author name)
│   │   ├── PostContent.tsx           # Rendered post body (Tiptap HTML output)
│   │   ├── Editor.tsx                # Tiptap WYSIWYG editor wrapper
│   │   ├── TagBadge.tsx              # Tag pill component
│   │   ├── LoginForm.tsx             # Login form component
│   │   ├── ThemeToggle.tsx           # Dark mode switch
│   │   └── TableOfContents.tsx       # Auto-generated TOC from headings
│   ├── lib/
│   │   ├── auth.ts                   # iron-session config + helpers
│   │   ├── db.ts                     # Prisma client singleton
│   │   ├── email.ts                  # ACS email helpers (reset, invite)
│   │   ├── storage.ts               # Azure Blob upload/delete helpers
│   │   └── utils.ts                  # Slug generation, reading time, etc.
│   └── styles/
│       └── globals.css               # Tailwind + Chinese typography
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml                # Local dev: PostgreSQL + app
├── next.config.ts
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── spec.md
├── plan.md
└── README.md
```

---

## Phase 0: Project Bootstrap & Infra

### 0.1 Initialize Next.js Project (~30 lines config)

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir
```

- Add dependencies: `prisma`, `@prisma/client`, `iron-session`, `bcryptjs`, ``@azure/communication-email`, `sharp`, `pinyin`, `@tiptap/*`, `@azure/storage-blob`
- Configure `next.config.ts` for image domains (blob storage)
- Set up `docker-compose.yml` for local PostgreSQL
- Create `.env.example` with all required vars and Chinese comments

**`.env.example` variables:**
```bash
# 数据库 / Database
DATABASE_URL="postgresql://user:password@localhost:5432/boringblog"

# 会话加密 / Session encryption (32+ characters)
SESSION_SECRET="change-me-to-a-random-32-char-string"

# 邮件服务 / Email (Azure Communication Services)
ACS_CONNECTION_STRING="endpoint=https://boringblog-acs.communication.azure.com/;accesskey=change-me"
ACS_SENDER_ADDRESS="DoNotReply@xxxxxxxx.azurecomm.net"

# Azure Blob Storage
AZURE_STORAGE_ACCOUNT_NAME="boringblogst"
AZURE_STORAGE_ACCOUNT_KEY="change-me"
AZURE_STORAGE_CONTAINER_NAME="images"

# 网站域名 / Site URL (used in emails and SEO)
NEXT_PUBLIC_SITE_URL="http://localhost:3000"

# 种子用户 / Seed users (only used by prisma/seed.ts)
SEED_ADMIN_EMAIL="admin@example.com"
SEED_ADMIN_PASSWORD="change-me"
SEED_ADMIN_NAME="管理员"
SEED_AUTHOR_EMAIL="author@example.com"
SEED_AUTHOR_PASSWORD="change-me"
SEED_AUTHOR_NAME="爸爸"
```

**Success criteria**: `npm run dev` works, local PG via Docker.

### 0.2 Bicep Infrastructure (~400 lines across modules)

Written in modular Bicep, deployed via `az deployment group create` or GitHub Actions.

| Module | Resources | Lines Est. |
|--------|-----------|------------|
| `identity.bicep` | User-assigned Managed Identity | ~20 |
| `dns.bicep` | DNS Zone + A/CNAME/TXT records | ~50 |
| `postgres.bicep` | PG Flexible Server + database + firewall | ~80 |
| `storage.bicep` | Storage Account + blob container + CORS | ~60 |
| `keyvault.bicep` | Key Vault + access policy + secret refs | ~70 |
| `appservice.bicep` | Plan + App + settings + custom domain + SSL | ~100 |
| `main.bicep` | Orchestrator, params, outputs | ~50 |

**Success criteria**: `az deployment group create -g <your-resource-group> -f infra/main.bicep -p infra/main.bicepparam` succeeds. App Service responds at `<your-app>.azurewebsites.net`.

### 0.3 DNS Delegation (Manual)

1. Deploy DNS Zone via Bicep → note the 4 Azure NS records
2. Go to Namecheap → Domain List → yourdomain.com → Custom DNS
3. Replace Namecheap default NS with Azure NS records
4. Wait for propagation (up to 48h, usually <1h)
5. Verify: `dig yourdomain.com NS` returns Azure nameservers

**Success criteria**: `nslookup yourdomain.com` resolves via Azure DNS.

### 0.4 GitHub Actions Scaffolding (~80 lines)

Two workflows:

**`infra.yml`** (manual dispatch):
- Authenticates to Azure via service principal (`AZURE_CREDENTIALS` secret)
- Runs `az deployment group create` with Bicep
- Outputs resource names for verify

**`deploy.yml`** (on push to `main`):
- `npm ci` → `npm run build` → `npx prisma migrate deploy`
- Zip deploy to App Service via `azure/webapps-deploy` action
- Smoke test: `curl https://yourdomain.com` returns 200

**Success criteria**: Both workflows run green. App deploys on push to `main`.

---

## Phase 1: Data Layer

### 1.1 Prisma Schema (~60 lines)

```prisma
model User {
  id                String    @id @default(cuid())
  email             String    @unique
  passwordHash      String
  name              String
  role              Role      @default(AUTHOR)
  resetToken        String?   @unique
  resetTokenExpiry  DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  posts             Post[]
}

enum Role {
  ADMIN
  AUTHOR
}

model Post {
  id          String   @id @default(cuid())
  title       String
  slug        String   @unique
  content     Json     // Tiptap JSON document
  contentHtml String   // Pre-rendered HTML for public pages
  coverImage  String?  // Blob Storage URL
  published   Boolean  @default(false)
  pinned      Boolean  @default(false)
  publishedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  author      User     @relation(fields: [authorId], references: [id])
  authorId    String
  tags        Tag[]
}

model Tag {
  id    String @id @default(cuid())
  name  String @unique
  slug  String @unique
  posts Post[]
}
```

**Key decisions**:
- `User` model with `Role` enum: supports N users, no hardcoded limit
- `Post.authorId` FK: each post belongs to one author
- `resetToken` + `resetTokenExpiry`: for self-service password reset
- `content` as JSON: stores Tiptap's native JSON format for re-editing
- `contentHtml` as pre-rendered HTML: avoids re-rendering on every public page load
- Implicit many-to-many via Prisma's `Tag[] ↔ Post[]`

### 1.2 Prisma Client Singleton (~15 lines)

Standard Next.js Prisma singleton pattern to avoid hot-reload connection exhaustion.

### 1.3 Seed Script (~30 lines)

Create `prisma/seed.ts`:
- Seeds admin user (you) with email + bcrypt-hashed password
- Seeds first author (dad) with email + bcrypt-hashed password
- Idempotent: uses `upsert` so it's safe to re-run

### 1.4 Initial Migration

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

**Success criteria**: `npx prisma studio` opens, User + Post + Tag tables exist, admin and author users seeded.

---

## Phase 2: Authentication

### 2.1 iron-session Configuration (~30 lines)

```typescript
// src/lib/auth.ts
const sessionOptions = {
  password: process.env.SESSION_SECRET!, // 32+ chars
  cookieName: 'boringblog_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

// Session stores: { userId: string, role: 'ADMIN' | 'AUTHOR' }
```

### 2.2 Auth API Routes (~100 lines)

- `POST /api/auth/login`: look up user by email, bcrypt.compare, create session with `{ userId, role }`
- `POST /api/auth/logout`: destroy session
- `GET /api/auth/me`: return `{ isLoggedIn, userId, name, role }`
- `POST /api/auth/forgot-password`: generate reset token, store in DB, send email via Azure Communication Services
- `POST /api/auth/reset-password`: validate token + expiry, update passwordHash, clear token

### 2.3 Login Page (~60 lines)

- Route: `/login` (not linked in nav — dad bookmarks it)
- Chinese UI: "邮箱", "密码", "登录" button
- "忘记密码？" link → `/forgot-password`
- Error state: "邮箱或密码错误"
- On success: redirect to `/`
- Simple, centered card design

### 2.4 Forgot Password + Reset Pages (~50 lines)

- `/forgot-password`: email input → POST → "重置链接已发送到您的邮箱"
- `/reset-password?token=xxx`: new password input → POST → redirect to `/login`
- Email template: Chinese text with reset link, 1-hour expiry

### 2.5 Admin Settings Page (~50 lines)

- Route: `/settings` (admin only)
- "家人管理" (Family Management) section:
  - List existing users (name, email, role, created date)
  - "邀请新作者" form: name + email → creates user with temp password → sends invite email
  - Deactivate/delete user (future)
- Minimal UI — not a dashboard, just a simple list + form

### 2.6 Auth Middleware (~20 lines)

Next.js middleware that checks session for protected routes (`/write`, `/edit/*`, `/drafts`, `/settings`). `/settings` additionally checks `role === 'ADMIN'`. Redirects to `/login` if not authenticated.

### 2.7 Header Auth State (~25 lines)

- Header calls `/api/auth/me` on mount (client-side)
- If logged in: show user name + "写文章" and "我的草稿" buttons + "退出" (logout)
- If admin: also show "设置" link
- If not logged in: show nothing extra (clean public header)

**Success criteria**: Can log in at `/login` with email/password, see "写文章" in header, log out, button disappears. Can reset password via email. Admin can invite new users via `/settings`. Protected routes redirect to `/login`.

---

## Phase 3: Reading Experience (Public)

*Can be built in parallel with Phase 2.*

### 3.1 Root Layout + Typography (~80 lines)

- Tailwind config with Chinese font stack: `'Noto Serif SC', 'Source Han Serif', serif`
- Google Fonts import for Noto Serif SC
- CSS: `line-height: 1.8`, paragraph spacing, proper heading scale
- Dark mode via `class` strategy (Tailwind)
- Responsive container widths: max-w-2xl for content

### 3.2 Homepage — Post List (~60 lines)

- Route: `/` (ISR, revalidate every 60s)
- Fetch published posts, newest first, pinned on top
- Each post card: title, author name, date, tags, excerpt (first 150 chars of text), cover image
- Pagination (simple "加载更多" / load more)

### 3.3 Post Detail Page (~80 lines)

- Route: `/posts/[slug]` (ISR)
- Fetch post by slug, render `contentHtml`
- Auto-generated table of contents from `<h2>` / `<h3>` headings
- Reading time estimate (Chinese: ~400 chars/min)
- Author name + avatar placeholder
- Tags at bottom
- Open Graph meta tags for social sharing
- If logged in as author of this post (or admin): show "编辑" (Edit) button

### 3.4 Author Pages (~40 lines)

- Route: `/author/[name]`
- List all published posts by that author
- Author name displayed at top
- Same card layout as homepage

### 3.5 Tag Pages (~40 lines)

- Route: `/tags/[tag]`
- List all published posts with that tag
- Same card layout as homepage

### 3.6 RSS Feed (~30 lines)

- Route: `/feed.xml` (route handler)
- Standard RSS 2.0 XML with recent 20 posts
- Include title, link, description, pubDate

### 3.7 Dark Mode Toggle (~20 lines)

- Theme toggle in header
- Persisted in `localStorage`
- `prefers-color-scheme` as default

**Success criteria**: Homepage shows posts with author names, clicking opens full post with proper Chinese typography. Tags filter correctly. Author pages work. RSS validates. Dark mode works.

---

## Phase 4: Content Authoring (Protected)

### 4.1 Tiptap Editor Setup (~150 lines)

Extensions:
- `StarterKit` (bold, italic, headings, lists, blockquotes, code blocks, hard break)
- `Image` (inline images with alt text, lazy loading)
- `Table` + `TableRow` + `TableHeader` + `TableCell`
- `Placeholder` ("开始写作..." placeholder text)
- `Link` (auto-detect URLs)
- Custom `VideoEmbed` extension (common video link iframe embed from URL)

Editor chrome:
- Floating toolbar on text selection (bold, italic, heading, link, etc.)
- Slash command menu (`/` to insert image, video, table, divider)
- Bubble menu for images (alt text, alignment)

### 4.2 Image Upload (~60 lines)

- `POST /api/upload` — accepts `multipart/form-data`
- Server-side: resize with `sharp` (max 1920px wide, 80% quality JPEG/WebP)
- Upload to Azure Blob Storage (`images` container)
- Return public URL
- Editor inserts `<img>` with returned URL
- File size limit: 10MB (enforced server-side)

### 4.3 Video Embed (~40 lines)

- Custom Tiptap node: user pastes a common video URL
- Parse URL and normalize known formats when needed
- Render responsive iframe (or native video element for direct media links)
- No file upload for MVP

### 4.4 Post CRUD API (~100 lines)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/posts` | GET | Public | List published posts (paginated) |
| `/api/posts` | POST | Required | Create new post (authorId from session) |
| `/api/posts/[slug]` | GET | Public (published) / Auth (draft) | Get single post |
| `/api/posts/[slug]` | PUT | Author (own) or Admin | Update post |
| `/api/posts/[slug]` | DELETE | Author (own) or Admin | Delete post |

Request body (create/update):
```json
{
  "title": "string",
  "content": { /* Tiptap JSON */ },
  "tags": ["string"],
  "coverImage": "url | null",
  "published": true,
  "pinned": false,
  "slug": "custom-slug (optional, auto-generated from title)"
}
```

Server-side on save:
1. Set `authorId` from session (on create)
2. Verify ownership: author can only edit/delete own posts; admin can edit/delete any
3. Convert Tiptap JSON → HTML (using `@tiptap/html` server-side renderer)
4. Store both JSON (`content`) and HTML (`contentHtml`)
5. Auto-generate slug from title if not provided (using `pinyin` lib for Chinese → ASCII)
6. Upsert tags (create if new)

### 4.5 Write Page (~60 lines)

- Route: `/write` (protected)
- Full-width editor
- Collapsible side panel: tags input, cover image, slug, publish toggle
- "保存草稿" (Save Draft) + "发布" (Publish) buttons
- Auto-save every 30 seconds to `/api/posts` (create on first save, update after)

### 4.6 Edit Page (~30 lines)

- Route: `/edit/[slug]` (protected)
- Same as Write but loads existing post
- "更新" (Update) button

### 4.7 Drafts Page (~30 lines)

- Route: `/drafts` (protected)
- List current user's unpublished posts with edit/delete actions (admin sees all drafts)
- Simple table: title, last updated, actions

**Success criteria**: Can write a post with formatted text + images + embedded video, save as draft, publish, edit, delete. Images upload to Blob Storage and display correctly.

---

## Phase 5: Polish & Ship

### 5.1 SEO (~40 lines)

- `sitemap.xml` route handler (auto-generated from published posts)
- `robots.txt` (allow all)
- JSON-LD structured data on post pages (BlogPosting schema)
- `<head>` meta: title, description, og:image, og:type, twitter:card

### 5.2 Performance (~30 lines)

- ISR for homepage (revalidate 60s) and post pages (revalidate on-demand via API)
- On-demand revalidation: after post create/update/delete, call `revalidatePath()`
- Next.js `<Image>` component with Azure Blob Storage domain whitelisted
- Font preloading for Noto Serif SC

### 5.3 CI/CD Pipeline Finalize (~60 lines)

**`deploy.yml`**:
```yaml
on:
  push:
    branches: [main]
    paths-ignore: ['infra/**', '*.md']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run build
      - run: npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
      - uses: azure/webapps-deploy@v3
        with:
          app-name: boringblog-app
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
          package: .
```

**`infra.yml`**:
```yaml
on:
  workflow_dispatch:
    inputs:
      action:
        description: 'Deploy or destroy'
        default: 'deploy'

jobs:
  infra:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      - run: |
          az deployment group create \
            -g <your-resource-group> \
            -f infra/main.bicep \
            -p infra/main.bicepparam
```

### 5.4 Custom Domain + HTTPS (~20 lines in Bicep)

- App Service custom domain binding for `yourdomain.com` and `www.yourdomain.com`
- App Service Managed Certificate (free SSL)
- HTTP → HTTPS redirect
- `www` → apex redirect (or vice versa)

### 5.5 Dockerfile (~25 lines)

Multi-stage build:
1. Stage 1: `node:20-alpine` — install deps + build
2. Stage 2: `node:20-alpine` — copy standalone output + run

Used for: local development parity and potential future Azure Container Apps migration.

### 5.6 README.md Update (~60 lines)

- Project description
- Architecture diagram (text-based)
- Local development setup (clone → docker-compose up → npm dev)
- Deployment guide (one-time infra → CI/CD)
- Environment variables reference table
- License

**Success criteria**: Full CI/CD pipeline deploys on push. `yourdomain.com` serves the blog with HTTPS. Lighthouse score > 90 on performance.

---

## Implementation Order & Dependency Graph

```
Phase 0.1 (Next.js init)
    │
    ├── Phase 0.2 (Bicep infra) ─── Phase 0.3 (DNS manual) ─── Phase 0.4 (GH Actions scaffold)
    │
    ▼
Phase 1 (Data layer)
    │
    ├───────────────┐
    ▼               ▼
Phase 2 (Auth)   Phase 3 (Reading)     ← PARALLEL
    │               │
    └───────┬───────┘
            ▼
    Phase 4 (Authoring)
            │
            ▼
    Phase 5 (Polish & Ship)
```

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| PostgreSQL Flexible Server cold start latency | Slow first load after idle | Use `B1ms` (always-on burstable), not serverless tier |
| Tiptap editor complexity for custom video embed | 1-2 day extra effort | Use a generic URL normalizer with responsive iframe/native video rendering |
| Azure Blob Storage CORS issues | Image upload fails | Test CORS config early in Phase 0.2; allow `yourdomain.com` + `localhost:3000` |
| Chinese slug generation | Bad URLs for Chinese titles | Use `pinyin` npm package to transliterate; fallback to cuid |
| Namecheap DNS propagation delay | Site unreachable for hours | Deploy with `*.azurewebsites.net` first; add custom domain after DNS propagates |
| Dad locks himself out (forgot password) | Can't write | Self-service password reset via email. Backup: admin (you) can reset in DB directly. |
| Free SSL cert renewal | Cert expires | App Service managed certs auto-renew. Monitor via Azure alerts. |

---

## Next Action

**Start with Phase 0.1**: Initialize the Next.js project, set up `docker-compose.yml` for local PostgreSQL, create `.env.example`, configure `.gitignore`, and get `npm run dev` running. This unblocks everything else.
