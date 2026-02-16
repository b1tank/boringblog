# Sprint Plan — Launch Readiness (lezhiweng.com)

## Sprint Goal

Make the production stack reliable, observable, and operable before dad starts relying on it daily. No product feature work — pure operational hardening.

## Pre-Conditions (already done)

- [x] Custom domain (lezhiweng.com) + HTTPS via ACA managed cert
- [x] Dad onboarded — password reset, logged in, creating articles
- [x] `minReplicas: 1` set manually in Azure portal

---

## Prioritized Task List

### P0 — Deploy Safety

- [x] **T1** Sync Bicep: set `minReplicas: 1` in `infra/modules/containerapp.bicep`
  - Prevents next `infra.yml` run from reverting to 0 and causing cold-start surprise
  - 1-line change

- [x] **T2** Fix CI migration ordering in `.github/workflows/deploy.yml`
  - Current: deploy new image → run migrations (risky: new code hits old schema)
  - Target: run migrations → deploy new image
  - Also: ensure migration failure blocks the deploy (don't push broken image to live)

### P1 — Health & Probes

- [x] **T3** Add `/api/health` endpoint
  - Returns `200 { status: 'ok', db: 'connected' }` when healthy
  - Checks: DB reachable (`SELECT 1`), app running
  - Lightweight — no auth required

- [x] **T4** Configure Container App health probes in Bicep
  - Liveness probe: `GET /api/health` every 30s
  - Startup probe: `GET /api/health` with longer `initialDelaySeconds` (Next.js cold boot)
  - Without probes, Azure keeps routing to a crashed container

### P1 — Observability

- [x] **T5** Add OpenTelemetry instrumentation to Next.js
  - Installed `@azure/monitor-opentelemetry` + OTel SDK (not `@vercel/otel` — Azure distro gives auto-instrumentation for HTTP, pg, Azure SDK)
  - Created `src/instrumentation.ts` → `src/instrumentation.node.ts` with `useAzureMonitor()`
  - Created `src/lib/logger.ts` structured JSON logger
  - Replaced `console.error` in API routes with structured logger
  - Telemetry gracefully disabled when `APPLICATIONINSIGHTS_CONNECTION_STRING` not set
  - Key signals:
    - **Traces**: request lifecycle across API routes, DB calls, blob storage calls (auto-instrumented)
    - **Metrics**: request count, latency (p50/p95/p99), error rate (auto via Azure Monitor)
    - **Logs**: structured JSON to stdout with severity levels

- [x] **T6** Add Application Insights resource to Bicep
  - New module `modules/appinsights.bicep`: Log Analytics workspace + Application Insights
  - Refactored: extracted Log Analytics from containerapp.bicep to avoid circular deps
  - Wire connection string into Container App env vars

- [x] **T7** Set up Azure Managed Grafana (Bicep)
  - New module `modules/grafana.bicep`: Grafana Standard SKU + system-assigned managed identity
  - Monitoring Reader role assigned for App Insights / Log Analytics access
  - Custom dashboards deferred to post-deploy; App Insights portal suffices initially

### P1 — Alerting

- [x] **T8** Configure Azure Monitor alerts
  - New module `modules/alerts.bicep`: action group + 3 metric alert rules
  - Alert 1: **App down** — 0 requests for 5 min (severity 0 / critical) → email
  - Alert 2: **High error rate** — >5 failed requests in 5 min (severity 1 / error) → email
  - Alert 3: **Slow response** — avg >5s over 15 min (severity 2 / warning) → email
  - Added `alertEmail` param to main.bicep and .bicepparam.example

### P2 — Data Safety

- [ ] **T9** Verify PostgreSQL automated backups *(requires manual Azure portal action)*
  - Confirm retention period (7 days minimum) in Bicep params or Azure portal
  - Perform one test point-in-time restore to a throwaway server
  - Document restore procedure in a runbook (even a few lines in README)
  - A backup you've never tested is not a backup

- [x] **T10** Enable blob soft-delete on storage account
  - Added `deleteRetentionPolicy` to `infra/modules/storage.bicep` (7-day soft delete)
  - Protects against accidental image deletion

### P2 — Security Headers

- [x] **T11** Add security headers in `next.config.ts`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - `Referrer-Policy: strict-origin-when-cross-origin`

### P3 — Operational Runbook

- [x] **T12** Document operational procedures in `docs/ops.md`
  - Rollback a deploy, check container logs, restore DB from backup
  - Reset a user's password, recover deleted images (soft-delete)
  - Secrets rotation procedures
  - Alert response playbook

---

## Execution Order & Dependencies

```
T1 (Bicep minReplicas) ─┐
T2 (CI migration order) ─┤
T11 (Security headers)  ─┤─── Independent, can parallelize
T10 (Blob soft-delete)  ─┘

T3 (Health endpoint) → T4 (Container probes in Bicep)

T5 (OTel instrumentation) → T6 (App Insights Bicep) → T7 (Grafana)
                                                     → T8 (Alerts)

T9 (Verify DB backups) — standalone, manual procedure
T12 (Runbook) — accumulates throughout sprint
```

## Suggested Implementation Batches

| Batch | Tasks | Est. Effort | Notes |
|-------|-------|-------------|-------|
| **Batch 1** | T1, T2, T10, T11 | 1h | Quick wins, all independent |
| **Batch 2** | T3, T4 | 1h | Health endpoint + probes |
| **Batch 3** | T5, T6 | 3-4h | Core observability (biggest chunk) |
| **Batch 4** | T7, T8 | 2h | Grafana + alerts (build on Batch 3) |
| **Batch 5** | T9, T12 | 1h | Manual verification + documentation |

**Total estimate: ~8-10 hours**

## Success Criteria

- `GET https://lezhiweng.com/api/health` returns 200
- Container App has liveness + startup probes configured
- Application Insights shows traces for page loads and API calls
- At least 2 alerts fire correctly (test with a synthetic failure)
- Blob soft-delete enabled (verify with test delete + undelete)
- DB backup restore tested at least once
- Security headers present (verify with `curl -I`)
- All Bicep changes are committed (no portal-only drift)
- Runbook exists with rollback + restore procedures

## Out of Scope

- Product features (editor improvements, comments, search)
- Performance optimization (ISR tuning, CDN)
- Custom Grafana dashboards beyond starter set
- Multi-region / HA (overkill for family blog)
- Uptime SLA commitments

## Hiccups & Notes

- **Log Analytics refactor**: The Log Analytics workspace was originally created inside `containerapp.bicep`. To avoid circular dependency (container app needs App Insights connection string, App Insights needs Log Analytics workspace), moved workspace creation into `appinsights.bicep` and passed workspace customer ID + shared key to container app as params.
- **OTel package choice**: Chose `@azure/monitor-opentelemetry` (Azure distro) over `@vercel/otel` — the Azure distro auto-instruments `pg` (Prisma queries), `@azure/storage-blob`, and `@azure/communication-email` out of the box, which the Vercel package doesn't.
- **T9 (DB backup verification)**: Requires manual Azure portal action — cannot be automated in this sprint. Documented restore procedure in `docs/ops.md`.
- **Build**: Passed successfully with Next.js 16.1.6 (Turbopack). Compiled in 3.2 min.
