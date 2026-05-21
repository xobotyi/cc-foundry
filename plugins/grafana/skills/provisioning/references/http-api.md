# HTTP API

Grafana HTTP API for runtime resource management — dashboards, folders, data sources, alerts, annotations. Use for CI
pipelines, custom tooling, and integrations where file provisioning and IaC tools don't fit.

## Contents

- [API structure overview](#api-structure-overview)
- [Authentication](#authentication)
- [Dashboard API](#dashboard-api)
- [Folder API](#folder-api)
- [Data source API](#data-source-api)
- [Alerting provisioning API](#alerting-provisioning-api)
- [Annotation API](#annotation-api)
- [Common patterns](#common-patterns)
- [Common pitfalls](#common-pitfalls)

---

## API structure overview

Grafana 12+ introduces a Kubernetes-style API surface under `/apis/`. The legacy `/api/` surface remains functional but
deprecated for resources with a new equivalent.

- **New APIs** (`/apis/<group>.grafana.app/<version>/namespaces/<namespace>/<kind>`) — Kubernetes-style resources with
  `kind`, `apiVersion`, `metadata`, `spec`. Covers dashboards, folders, library panels, playlists. Built on these: `gcx`
  / `grafanactl`, Foundation SDK, Git Sync.
- **Legacy APIs** (`/api/...`) — older surface. Still required for data sources, annotations, admin endpoints, and
  alerting provisioning. Won't receive new functionality.

For new tooling, prefer `/apis/` where available. For data sources and alerting provisioning, use `/api/`.

## Authentication

All endpoints require authentication. Three common options:

- **Service account token** (recommended) — `Authorization: Bearer <token>`. Long-lived, scoped to a service account's
  role.
- **API key** (legacy) — `Authorization: Bearer <key>`. Deprecated in favor of service account tokens.
- **Basic auth** — `Authorization: Basic <base64(user:pass)>`. Local development only.

For Grafana Enterprise / RBAC, the service account must have the required `actions` and `scopes` for each endpoint (see
the per-endpoint Required Permissions tables in upstream docs).

## Dashboard API

New API: `dashboard.grafana.app/v1`. Namespace is `default` for single-org Grafana, or `stack-<id>` / `org-<id>` for
multi-stack/multi-org setups.

### Create

```
POST /apis/dashboard.grafana.app/v1/namespaces/:namespace/dashboards
```

Body:

```json
{
  "metadata": {
    "name": "gdxccn",
    "annotations": {
      "grafana.app/folder": "fef30w4jaxla8b"
    }
  },
  "spec": {
    "title": "Example Dashboard",
    "schemaVersion": 41,
    "panels": [...],
    "templating": {"list": [...]},
    "time": {"from": "now-6h", "to": "now"}
  }
}
```

- `metadata.name` — the dashboard's stable identifier (matches the `uid` in legacy). Provide one or use
  `metadata.generateName: <prefix>` to auto-generate.
- `metadata.annotations.grafana.app/folder` — parent folder UID
- `spec` — dashboard JSON (panels, templating, etc.)

Status codes: 201 created, 400 invalid, 401 unauthorized, 403 denied, 409 conflict (uid exists).

### Update

```
PUT /apis/dashboard.grafana.app/v1/namespaces/:namespace/dashboards/:uid
```

Same body shape. Add `metadata.annotations.grafana.app/message` to record a commit message in version history.

### Get

```
GET /apis/dashboard.grafana.app/v1/namespaces/:namespace/dashboards/:uid
GET /apis/dashboard.grafana.app/v1/namespaces/:namespace/dashboards/:uid/dto   # with access info
```

### List with pagination

```
GET /apis/dashboard.grafana.app/v1/namespaces/:namespace/dashboards?limit=100
```

Response contains `metadata.continue` token. Pass as `?continue=<token>` on the next request. Continue until the
response has no `continue` field.

### Delete

```
DELETE /apis/dashboard.grafana.app/v1/namespaces/:namespace/dashboards/:uid
```

### Version history

Use the resource history API:

```
GET /apis/dashboard.grafana.app/v1/namespaces/:namespace/dashboards/:uid/history
```

## Folder API

New API: `folder.grafana.app/v1`.

### List

```
GET /apis/folder.grafana.app/v1/namespaces/:namespace/folders?limit=100
```

Same pagination contract as dashboards.

### Get

```
GET /apis/folder.grafana.app/v1/namespaces/:namespace/folders/:uid
```

Response includes `metadata.annotations.grafana.app/folder` (parent folder UID) if it's a subfolder.

### Create

```
POST /apis/folder.grafana.app/v1/namespaces/:namespace/folders
```

Body:

```json
{
  "metadata": {
    "name": "aef30vrzxs3y8d",
    "annotations": {"grafana.app/folder": "fef30w4jaxla8b"}
  },
  "spec": {"title": "child-folder"}
}
```

Set `metadata.annotations.grafana.app/folder` to nest under a parent (requires nested folders enabled).

### Update

```
PUT /apis/folder.grafana.app/v1/namespaces/:namespace/folders/:uid
```

Change `metadata.annotations.grafana.app/folder` to move under a different parent.

### Delete

```
DELETE /apis/folder.grafana.app/v1/namespaces/:namespace/folders/:uid?forceDeleteRules=false
```

`forceDeleteRules=true` lets the delete proceed when the folder contains alerts (alerts are deleted too). Without the
flag, the request fails with 400 if alerts exist.

Returns 412 (Precondition Failed) if the folder was modified concurrently — refetch and retry.

## Data source API

Legacy `/api/datasources` is the only data source surface.

### List

```
GET /api/datasources
```

Returns up to 5000 entries (no pagination). Override via `default.ini`.

### Get by UID / name

```
GET /api/datasources/uid/:uid
GET /api/datasources/name/:name   # deprecated
```

### Create

```
POST /api/datasources
```

```json
{
  "name": "test_datasource",
  "type": "graphite",
  "url": "http://mydatasource.com",
  "access": "proxy",
  "basicAuth": true,
  "basicAuthUser": "user",
  "secureJsonData": {
    "basicAuthPassword": "secret"
  }
}
```

Always put secrets (`password`, `basicAuthPassword`, `tlsClientKey`, etc.) in `secureJsonData`. Response lists the
encrypted field names under `secureJsonFields`.

### Update

```
PUT /api/datasources/uid/:uid
```

Same body shape. `uid` cannot be changed.

### Delete

```
DELETE /api/datasources/uid/:uid
DELETE /api/datasources/name/:name   # deprecated
```

### Proxy and health

```
GET /api/datasources/proxy/uid/:uid/*    # proxy any call to the data source
GET /api/datasources/uid/:uid/health     # health check (plugin must implement)
GET /api/datasources/uid/:uid/resources/* # data-source-specific resource endpoint
```

### Query

```
POST /api/ds/query
```

```json
{
  "queries": [
    {
      "refId": "A",
      "datasource": {"uid": "PD8C..."},
      "format": "time_series",
      "maxDataPoints": 1848,
      "intervalMs": 200,
      "expr": "rate(http_requests_total[5m])"
    }
  ],
  "from": "now-5m",
  "to": "now"
}
```

`from`/`to` accept epoch milliseconds or relative time (`now-5m`). Each query needs a `refId` and a `datasource.uid`.
Data-source-specific properties (`expr`, `stringInput`, `scenarioId`, etc.) sit alongside the generic ones — inspect a
working dashboard request in browser dev tools to model your own.

Response shape: `{ "results": { "<refId>": { "frames": [...] } } }`.

## Alerting provisioning API

`/api/v1/provisioning/...` — manage alerting resources programmatically. Returns JSON, **not compatible with file
provisioning** for round-tripping.

### Resources

- `/alert-rules` — `GET`, `POST`, `PUT /:uid`, `DELETE /:uid`
- `/contact-points` — `GET`, `POST`, `PUT /:uid`, `DELETE /:uid`
- `/policies` — `GET`, `PUT` (replaces the entire tree)
- `/templates` — `GET`, `PUT /:name`, `DELETE /:name`
- `/mute-timings` — `GET`, `POST`, `PUT /:name`, `DELETE /:name`

### Export endpoints (returns file-provisioning-compatible format)

For round-tripping via configuration files, use `/export` endpoints — they return YAML/JSON in provisioning file format
(`?download=true` to download as a file):

- `GET /api/v1/provisioning/alert-rules/export`
- `GET /api/v1/provisioning/alert-rules/:uid/export`
- `GET /api/v1/provisioning/folder/:folderUid/rule-groups/:group/export`
- `GET /api/v1/provisioning/contact-points/export`
- `GET /api/v1/provisioning/policies/export`
- `GET /api/v1/provisioning/mute-timings/export`
- `GET /api/v1/provisioning/mute-timings/:name/export`

Add `?format=yaml` or `?format=json` to select format. `?format=hcl` returns Terraform HCL.

### Data-source-managed alerts

The provisioning API covers only Grafana-managed alerts. For data-source-managed alerts (Mimir/Loki/Prometheus ruler),
use the Mimir/Cortex/Loki tooling instead (`mimirtool`, `cortextool`, `lokitool`).

### Provenance

Resources created via the API are marked as provisioned and **can't be edited in the Grafana UI** by default. To allow
UI edits:

- Set HTTP header `X-Disable-Provenance: true` on the create/update request, or
- Use the Terraform `disable_provenance` attribute, or
- Manually unset provenance via the provisioning API

## Annotation API

`/api/annotations`. Arbitrary time-range markers attached to dashboards (or globally).

- `POST /api/annotations` — create
- `GET /api/annotations?dashboardId=...&panelId=...&from=...&to=...` — search
- `PUT /api/annotations/:id` — update
- `PATCH /api/annotations/:id` — partial update
- `DELETE /api/annotations/:id` — delete
- `POST /api/annotations/graphite` — Graphite-format annotation

Useful for marking deploys, incidents, or operator events from CI hooks.

## Common patterns

### Pagination

For `/apis/` resources:

```bash
continue=""
while :; do
  resp=$(curl -s -H "Authorization: Bearer $TOKEN" \
    "${URL}/apis/dashboard.grafana.app/v1/namespaces/default/dashboards?limit=100&continue=$continue")
  echo "$resp" | jq -r '.items[].metadata.name'
  continue=$(echo "$resp" | jq -r '.metadata.continue // empty')
  [ -z "$continue" ] && break
done
```

### Idempotent upsert

Use PUT with a stable `uid` — Grafana treats it as create-or-update. Wrap with retry logic for 412 Precondition Failed
(concurrent update).

### CI export → commit → push

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "${URL}/api/v1/provisioning/alert-rules/export?format=yaml&download=true" \
  > provisioning/alerting/all-rules.yaml
git add provisioning/alerting/all-rules.yaml
git commit -m 'sync alert rules'
```

This produces a file you can later apply via file provisioning on a fresh instance.

### Migrating between instances

1. Export from source via `/api/v1/provisioning/.../export?format=yaml`
2. Modify environment-specific fields (URLs, contact addresses)
3. Apply on target via `POST /api/v1/provisioning/...` or copy into `provisioning/alerting/` and restart

## Common pitfalls

- Calling `/api/dashboards/db` (legacy) when `/apis/dashboard.grafana.app/v1/...` is required for v2 dashboards
- Forgetting legacy dashboard `uid` is `metadata.name` in the new API
- Round-tripping alerting JSON between `/api/v1/provisioning` and file provisioning — formats differ; use `/export`
  endpoints when going to files
- Storing secrets in `jsonData` instead of `secureJsonData` — plaintext
- Creating a folder via the API without parent — lands at root; set `metadata.annotations.grafana.app/folder` to nest
- Missing `X-Disable-Provenance: true` when UI edits should be allowed afterward
- Listing dashboards without pagination — defaults to 5000 max for some endpoints; mandatory for large instances
- `/api/admin/provisioning/*/reload` without admin role — silently 403s
