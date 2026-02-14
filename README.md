# 乐之翁 — BoringBlog

A dead-simple, self-hosted family blog. Invite-only authors write with a rich-text editor (text, images, embedded video) and publish publicly. Deployed on Azure.

## Architecture

```
┌────────────────────────────────────────────────┐
│                  Readers                        │
│         lezhiweng.com (HTTPS)                  │
└──────────────────┬─────────────────────────────┘
                   │
┌──────────────────▼─────────────────────────────┐
│           Azure App Service (Node 20)          │
│           Next.js 16 (App Router)              │
│                                                │
│  Public:  /, /posts/*, /tags/*, /author/*      │
│  Auth:    /login, /forgot-password, /reset-*   │
│  Protected: /write, /edit/*, /drafts, /settings│
│  API:     /api/auth/*, /api/posts/*, /api/upload│
└─────┬──────────────────┬──────────────┬────────┘
      │                  │              │
┌─────▼──────┐   ┌──────▼─────┐  ┌─────▼──────┐
│ PostgreSQL │   │ Azure Blob │  │  Key Vault  │
│ Flex B1ms  │   │  Storage   │  │  (secrets)  │
│            │   │  (images)  │  │             │
└────────────┘   └────────────┘  └─────────────┘
```

## Quick Start (Local Development)

```bash
# 1. Clone
git clone https://github.com/b1tank/boringblog.git
cd boringblog

# 2. Copy env file and fill in values
cp .env.example .env

# 3. Start PostgreSQL
docker-compose up -d

# 4. Install dependencies
npm install

# 5. Generate Prisma client + run migrations
npx prisma generate
npx prisma migrate dev --name init

# 6. Seed initial users (admin + author)
npx prisma db seed

# 7. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Login at [http://localhost:3000/login](http://localhost:3000/login).

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `SESSION_SECRET` | 32+ char random string for cookie encryption | ✅ |
| `ACS_CONNECTION_STRING` | ACS connection string for password reset emails | ✅ |
| `ACS_SENDER_ADDRESS` | ACS sender email address | ✅ |
| `NEXT_PUBLIC_SITE_URL` | Public URL of the blog | ✅ |
| `AZURE_STORAGE_ACCOUNT_NAME` | Azure Blob Storage account name | For prod |
| `AZURE_STORAGE_ACCOUNT_KEY` | Azure Blob Storage account key | For prod |
| `AZURE_STORAGE_CONTAINER_NAME` | Blob container name (default: images) | For prod |
| `SEED_ADMIN_EMAIL` | Admin user email for seeding | For seed |
| `SEED_ADMIN_PASSWORD` | Admin user password for seeding | For seed |
| `SEED_ADMIN_NAME` | Admin display name | For seed |
| `SEED_AUTHOR_EMAIL` | First author email for seeding | For seed |
| `SEED_AUTHOR_PASSWORD` | First author password for seeding | For seed |
| `SEED_AUTHOR_NAME` | First author display name | For seed |

## Deployment (Azure)

### One-Time Infrastructure Setup

1. Create resource group (already done): `boringblog-wus2-rg` in West US 2
2. Copy and fill Bicep parameters:
   ```bash
   cp infra/main.bicepparam.example infra/main.bicepparam
   # Edit with real values
   ```
3. Deploy infrastructure:
   ```bash
   az deployment group create \
     -g boringblog-wus2-rg \
     -f infra/main.bicep \
     -p infra/main.bicepparam
   ```
4. Configure DNS: Update Namecheap nameservers to Azure DNS (see `plan.md` for details)
5. Set GitHub Secrets: `AZURE_CREDENTIALS`, `AZURE_WEBAPP_PUBLISH_PROFILE`, `DATABASE_URL`

### Continuous Deployment

Push to `main` → GitHub Actions builds and deploys automatically.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL (Azure Flexible Server) |
| ORM | Prisma 7 |
| Auth | iron-session + bcrypt |
| Editor | Tiptap v3 (WYSIWYG) |
| Email | Azure Communication Services |
| Storage | Azure Blob Storage |
| Hosting | Azure App Service |
| CI/CD | GitHub Actions |
| IaC | Bicep |

## License

MIT
