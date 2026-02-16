# Operational Runbook — BoringBlog

Quick reference for production operations. Not a tutorial — assumes familiarity with `az` CLI.

## Resource Names

| Resource | Name |
|----------|------|
| Resource Group | *(check Azure portal)* |
| Container App | `boringblog-app` |
| Container Env | `boringblog-env` |
| ACR | `boringblogacr` |
| PostgreSQL | `boringblog-pg` |
| Storage Account | *(see .bicepparam)* |
| App Insights | `boringblog-insights` |
| Grafana | `boringblog-grafana` |

## Common Operations

### Rollback a deploy

Every deploy tags the image with the git SHA. To rollback:

```bash
# Find recent images
az acr repository show-tags --name boringblogacr --repository boringblog --orderby time_desc --top 5

# Rollback to a specific SHA
az containerapp update \
  --name boringblog-app \
  --resource-group <RG> \
  --image boringblogacr.azurecr.io/boringblog:<PREVIOUS_SHA>
```

### Check container logs

```bash
# Recent logs (last 100 lines)
az containerapp logs show \
  --name boringblog-app \
  --resource-group <RG> \
  --tail 100

# Follow logs in real-time
az containerapp logs show \
  --name boringblog-app \
  --resource-group <RG> \
  --follow
```

### Check app health

```bash
curl -s https://lezhiweng.com/api/health | jq .
# Expected: {"status":"ok","checks":{"db":"connected"},"timestamp":"..."}
```

### Restart the container

```bash
az containerapp revision restart \
  --name boringblog-app \
  --resource-group <RG> \
  --revision <REVISION_NAME>

# Or: list revisions first
az containerapp revision list \
  --name boringblog-app \
  --resource-group <RG> \
  -o table
```

## Database Operations

### Connect to production DB

```bash
# Get connection string from Key Vault or portal, then:
psql "postgresql://user:pass@boringblog-pg.postgres.database.azure.com:5432/boringblog?sslmode=require"
```

### Reset a user's password

```bash
# Connect to prod DB, then:
# Generate a bcrypt hash (use Node.js locally):
node -e "const b=require('bcryptjs');b.hash('newpassword',10).then(h=>console.log(h))"

# Update in DB:
UPDATE "User" SET "passwordHash" = '<BCRYPT_HASH>' WHERE email = 'user@example.com';
```

### Restore DB from backup

Azure PostgreSQL Flexible Server has automated backups (7-day retention by default).

```bash
# Point-in-time restore to a new server
az postgres flexible-server restore \
  --resource-group <RG> \
  --name boringblog-pg-restore \
  --source-server boringblog-pg \
  --restore-time "2026-02-14T00:00:00Z"

# After verification, swap the connection string in Container App env
# or copy data from restored server to original
```

### Run migrations manually

```bash
# From local machine with DATABASE_URL pointing to prod:
DATABASE_URL="<PROD_CONNECTION_STRING>" npx prisma migrate deploy
```

## Storage Operations

### List uploaded images

```bash
az storage blob list \
  --account-name <STORAGE_ACCOUNT> \
  --container-name images \
  --output table
```

### Recover a deleted image (soft-delete enabled, 7-day window)

```bash
# List soft-deleted blobs
az storage blob list \
  --account-name <STORAGE_ACCOUNT> \
  --container-name images \
  --include d \
  --output table

# Undelete
az storage blob undelete \
  --account-name <STORAGE_ACCOUNT> \
  --container-name images \
  --name <BLOB_NAME>
```

## Secrets Rotation

### Rotate session secret

1. Generate new secret: `openssl rand -base64 32`
2. Update in Key Vault (or Container App secrets directly)
3. Restart the container app (existing sessions will be invalidated — users need to log in again)

### Rotate storage account key

1. Rotate key in Azure portal (Storage Account → Access Keys → Rotate key1)
2. Update the new key in Container App secrets
3. Restart container

### Rotate DB password

1. Update password on PostgreSQL Flexible Server
2. Update connection string in Container App secrets
3. Restart container
4. Verify with health check

## Monitoring Quick Access

| Tool | URL |
|------|-----|
| App Insights | Azure Portal → boringblog-insights |
| Grafana | `az deployment group show -g <RG> -n main --query properties.outputs.grafanaEndpoint` |
| Container Logs | See "Check container logs" above |
| Live Metrics | App Insights → Live Metrics |

## Alert Responses

| Alert | Severity | First Response |
|-------|----------|----------------|
| App down (0 requests/5min) | Critical | Check health endpoint → check container logs → restart container |
| High error rate (>5 errors/5min) | Error | Check App Insights failures → check container logs for stack traces |
| Slow response (avg >5s/15min) | Warning | Check App Insights performance → check DB query duration → check if under load |
