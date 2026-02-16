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

### End-to-End Tests (Playwright)

```bash
# Make sure DB is up and seeded first
docker compose up -d
npx prisma migrate dev --name init
npx prisma db seed

# Install browser binaries once
npx playwright install

# Run critical authoring flows
npm run test:e2e
```

Optional env overrides (defaults target seeded admin):

- `E2E_ADMIN_EMAIL` (default: `admin@example.com`)
- `E2E_ADMIN_PASSWORD` (default: `admin123`)
- `PLAYWRIGHT_BASE_URL` (default: `http://127.0.0.1:3300`)

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

## Self-Host on Azure

Deploy your own BoringBlog on Azure in ~20 minutes. Everything is automated via GitHub Actions — you only need to set a few values.

### What You'll Get

| Resource | Purpose | Est. Cost |
|----------|---------|-----------|
| Container App | Hosts the blog (Node 20 + Next.js) | ~$5/mo |
| PostgreSQL Flexible (B1ms) | Database | ~$12/mo |
| Storage Account (LRS) | Image uploads (WebP, Blob) | ~$0.50/mo |
| Container Registry (Basic) | Stores Docker images | ~$5/mo |
| Key Vault | Secrets storage | ~$0.10/mo |
| Communication Services | Password reset emails | Free tier |
| Application Insights | Monitoring + alerts | Free tier (5 GB/mo) |
| Managed Grafana | Dashboards | ~$0/mo (included) |
| **Total** | | **~$23/mo** |

### Prerequisites

- [ ] **Azure subscription** — [free trial](https://azure.microsoft.com/free/) works
- [ ] **Domain name** — registered anywhere (Namecheap, Cloudflare, GoDaddy, etc.)
- [ ] **GitHub account** — to fork the repo and run Actions

---

### Step 1: Fork & Clone

```bash
# Fork on GitHub, then:
git clone https://github.com/<your-username>/boringblog.git
cd boringblog
```

### Step 2: Create Azure Resources

```bash
# Login to Azure
az login

# Create a resource group (pick any region)
az group create --name boringblog-rg --location westus2
```

### Step 3: Create a Service Principal

This gives GitHub Actions permission to deploy to Azure:

```bash
az ad sp create-for-rbac \
  --name "boringblog-github-deploy" \
  --role Contributor \
  --scopes /subscriptions/<YOUR_SUBSCRIPTION_ID>/resourceGroups/boringblog-rg \
  --sdk-auth
```

Copy the entire JSON output — you'll need it in the next step.

Then grant it permission to manage role assignments (needed for Key Vault + Grafana):

```bash
az role assignment create \
  --assignee <clientId-from-json-above> \
  --role "User Access Administrator" \
  --scope /subscriptions/<YOUR_SUBSCRIPTION_ID>/resourceGroups/boringblog-rg
```

### Step 4: Configure GitHub Secrets & Variables

Go to your forked repo → **Settings → Secrets and variables → Actions**.

**Secrets tab** (sensitive, encrypted):

| Secret | Value | How to get it |
|--------|-------|---------------|
| `AZURE_CREDENTIALS` | The full JSON from Step 3 | `az ad sp create-for-rbac` output |
| `AZURE_RESOURCE_GROUP` | `boringblog-rg` | Name from Step 2 |
| `POSTGRES_ADMIN_PASSWORD` | Strong password | `openssl rand -base64 24` |
| `SESSION_SECRET` | 32+ char random string | `openssl rand -base64 32` |
| `DATABASE_URL` | *(set after Step 5)* | From deployment outputs |
| `ACR_NAME` | `boringblogacr` | Must match Bicep (or your fork's name) |
| `CONTAINER_APP_NAME` | `boringblog-app` | Must match Bicep |

**Variables tab** (non-sensitive, visible):

| Variable | Value | Example |
|----------|-------|---------|
| `DOMAIN_NAME` | Your domain | `myblog.com` |
| `STORAGE_ACCOUNT_NAME` | Globally unique, 3-24 lowercase alphanumeric | `myblogimages` |
| `SITE_URL` | `https://` + your domain | `https://myblog.com` |
| `ALERT_EMAIL` | Your email for alerts | `you@example.com` |

### Step 5: Deploy Infrastructure

1. Go to **Actions → Deploy Infrastructure → Run workflow**
2. Select **"deploy"** → click **"Run workflow"**
3. Wait ~5 minutes for all Azure resources to be created
4. Check the **"Show outputs"** step for:
   - `appUrl` — your Container App URL (temporary, before custom domain)
   - `postgresFqdn` — your database hostname

Now set the `DATABASE_URL` secret:

```
postgresql://pgadmin:<YOUR_POSTGRES_PASSWORD>@<postgresFqdn>:5432/boringblog?sslmode=require
```

### Step 6: Deploy the App

Push any change to `main` (or re-run the **Deploy App** workflow manually):

```bash
git commit --allow-empty -m "chore: trigger first deploy" && git push
```

This builds the Docker image, runs migrations, and deploys to Container App.

### Step 7: Seed Your Admin Account

```bash
# Allow your IP through the PostgreSQL firewall
az postgres flexible-server firewall-rule create \
  -g boringblog-rg --name boringblog-db \
  --rule-name AllowMyIP \
  --start-ip-address <YOUR_IP> --end-ip-address <YOUR_IP>

# Set your admin credentials in .env (copy from .env.example)
cp .env.example .env
# Edit .env: set DATABASE_URL, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME

# Seed
npx prisma db seed
```

### Step 8: Point Your Domain

Point your domain's DNS to the Container App. Two records needed:

| Type | Host | Value |
|------|------|-------|
| A | `@` (apex) | Container App's IP (from Azure Portal → Container App → Custom domains) |
| CNAME | `www` | `boringblog-app.<your-env>.azurecontainerapps.io` |

> **Tip:** If your registrar supports ALIAS/ANAME records, use that for apex instead of A record.

After DNS propagates (usually minutes, up to 48h), re-run **Deploy Infrastructure** — the post-deploy step will automatically create managed HTTPS certificates and bind your custom domain.

### Step 9: Verify

```bash
curl -s https://yourdomain.com/api/health
# → {"status":"ok","checks":{"db":"connected"},...}

curl -sI https://yourdomain.com | grep strict-transport
# → strict-transport-security: max-age=31536000; includeSubDomains
```

Visit `https://yourdomain.com/login` and sign in with your seeded admin credentials. You're live! 🎉

---

### CI/CD: What Happens Automatically

| Trigger | Workflow | What it does |
|---------|----------|--------------|
| Push to `main` | **Deploy App** | Runs migrations → builds Docker image → deploys to Container App |
| Manual dispatch | **Deploy Infrastructure** | Creates/updates Azure resources → configures custom domain + HTTPS |

### Monitoring (included)

- **Application Insights** — traces, metrics, error logs for every request
- **Azure Monitor Alerts** — email alerts for: app down, high error rate, slow responses
- **Managed Grafana** — dashboard URL in deployment outputs (connect to App Insights as data source)
- **Health endpoint** — `GET /api/health` returns app + DB status

### Operational Runbook

See [docs/ops.md](docs/ops.md) for:
- How to rollback a deploy
- How to check container logs
- How to restore DB from backup
- How to reset a user's password
- How to rotate secrets

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
