# BoringBlog

A dead-simple, self-hosted family blog. Invite-only authors write with a rich-text editor (text, images, embedded video) and publish publicly.

## Architecture

```
┌────────────────────────────────────────────────┐
│                  Readers                        │
│          yourdomain.com (HTTPS)                │
└──────────────────┬─────────────────────────────┘
                   │
┌──────────────────▼─────────────────────────────┐
│         Azure Container Apps (Node 20)          │
│           Next.js 16 (App Router)              │
│                                                │
│  Public:  /, /posts/*, /tags/*, /author/*      │
│  Auth:    /login, /forgot-password, /reset-*   │
│  Protected: /write, /edit/*, /drafts, /settings│
│  API:     /api/auth/*, /api/posts/*, /api/upload│
└──────┬──────────────────┬──────────────┬───────┘
       │                  │              │
┌──────▼─────┐   ┌───────▼────┐  ┌──────▼─────┐
│ PostgreSQL │   │ Azure Blob │  │  Key Vault  │
│ Flex B1ms  │   │  Storage   │  │  (secrets)  │
└────────────┘   └────────────┘  └─────────────┘
```

---

## Quick Start

### Option A: Local Development (recommended for contributing)

```bash
# 1. Clone & setup
git clone https://github.com/b1tank/boringblog.git
cd boringblog
bash scripts/setup.sh        # generates .env with random secrets + defaults

# 2. Start database
docker compose up -d          # starts PostgreSQL on localhost:5432

# 3. Install, migrate, seed
npm install
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed            # creates admin@example.com / admin123

# 4. Run
npm run dev                   # http://localhost:3000
```

Login: go to `/login` → `admin@example.com` / `admin123`

> **Note:** Email (password reset) and Azure Blob Storage are disabled in local dev. Images save to `public/uploads/` as a fallback.

### Option B: Docker Run (full app in containers)

```bash
git clone https://github.com/b1tank/boringblog.git
cd boringblog
docker compose --profile app up --build   # builds app + starts DB + app
```

Then open http://localhost:3000. You'll still need to run migrations against the Dockerized DB:

```bash
# In another terminal:
DATABASE_URL="postgresql://boringblog:boringblog@localhost:5432/boringblog" \
  npx prisma migrate deploy
DATABASE_URL="postgresql://boringblog:boringblog@localhost:5432/boringblog" \
  npx prisma db seed
```

---

## Environment Variables

| Variable | Description | Local Dev | Production |
|----------|-------------|-----------|------------|
| `DATABASE_URL` | PostgreSQL connection string | Auto (setup.sh) | Required |
| `SESSION_SECRET` | 32+ char random string for cookie encryption | Auto (setup.sh) | Required |
| `ACS_CONNECTION_STRING` | Azure Communication Services connection string | Optional (empty = email disabled) | Required |
| `ACS_SENDER_ADDRESS` | ACS sender email address | Optional | Required |
| `NEXT_PUBLIC_SITE_URL` | Public URL of the blog | `http://localhost:3000` | `https://yourdomain.com` |
| `AZURE_STORAGE_ACCOUNT_NAME` | Azure Blob Storage account name | Optional (empty = local fallback) | Required |
| `AZURE_STORAGE_ACCOUNT_KEY` | Azure Blob Storage account key | Optional | Required |
| `AZURE_STORAGE_CONTAINER_NAME` | Blob container name | `images` | `images` |
| `SEED_ADMIN_EMAIL` | Admin email for `prisma db seed` | `admin@example.com` | Your email |
| `SEED_ADMIN_PASSWORD` | Admin password for `prisma db seed` | `admin123` | Strong password |
| `SEED_ADMIN_NAME` | Admin display name | `管理员` | Your name |
| `SEED_AUTHOR_EMAIL` | First author email | `author@example.com` | Author email |
| `SEED_AUTHOR_PASSWORD` | First author password | `author123` | Strong password |
| `SEED_AUTHOR_NAME` | First author display name | `作者` | Author name |

---

## Deploy to Azure (Optional)

This section guides you through hosting BoringBlog on Azure. You can also deploy to any platform that supports Docker.

### Prerequisites

- Azure CLI installed and logged in (`az login`)
- A resource group created (`az group create -n <rg-name> -l <region>`)
- Docker installed locally (for building the image)

### 1. Deploy Infrastructure (Bicep)

```bash
# Copy and fill in your values
cp infra/main.bicepparam.example infra/main.bicepparam
# Edit infra/main.bicepparam with your domain, passwords, storage account name

# Deploy all Azure resources
az deployment group create \
  -g <your-rg-name> \
  -f infra/main.bicep \
  -p infra/main.bicepparam
```

This creates: PostgreSQL Flexible Server, Storage Account, Key Vault, Container Registry, Container Apps Environment, Container App, Azure Communication Services (email).

### 2. Build & Deploy the App

```bash
# Login to your ACR
az acr login --name <your-acr-name>

# Build and push
docker build -t <your-acr-name>.azurecr.io/boringblog:latest .
docker push <your-acr-name>.azurecr.io/boringblog:latest

# Update Container App
az containerapp update \
  --name <your-app-name> \
  --resource-group <your-rg-name> \
  --image <your-acr-name>.azurecr.io/boringblog:latest
```

### 3. Migrate & Seed Production DB

```bash
# Add your IP to PostgreSQL firewall
az postgres flexible-server firewall-rule create \
  -g <your-rg-name> --name <your-pg-name> \
  --rule-name AllowMyIP \
  --start-ip-address <your-ip> --end-ip-address <your-ip>

# Run migrations + seed
DATABASE_URL="postgresql://<user>:<password>@<pg-host>:5432/boringblog?sslmode=require" \
  npx prisma migrate deploy
DATABASE_URL="postgresql://<user>:<password>@<pg-host>:5432/boringblog?sslmode=require" \
  npx prisma db seed
```

### 4. Configure DNS (Custom Domain)

Point your domain's nameservers to Azure DNS (output from Bicep deployment). See `plan.md` for detailed steps.

### 5. CI/CD via GitHub Actions

Set these GitHub repository secrets:

| Secret | Value |
|--------|-------|
| `AZURE_CREDENTIALS` | Service principal JSON (`az ad sp create-for-rbac --sdk-auth`) |
| `AZURE_RESOURCE_GROUP` | Your resource group name |
| `ACR_NAME` | Your ACR name (e.g. `myacrname`) |
| `CONTAINER_APP_NAME` | Your Container App name |
| `DATABASE_URL` | Production PostgreSQL connection string |

Then every push to `main` auto-deploys via `.github/workflows/deploy.yml`.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL |
| ORM | Prisma 7 |
| Auth | iron-session + bcrypt |
| Editor | Tiptap v3 (WYSIWYG) |
| Email | Azure Communication Services |
| Storage | Azure Blob Storage (local fallback: filesystem) |
| Hosting | Azure Container Apps (or any Docker host) |
| CI/CD | GitHub Actions |
| IaC | Bicep |

## License

MIT
