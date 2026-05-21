# VictoriaMetrics Query API Enhancements

Query-side enhancements and cluster URL layout. Ingestion endpoints out of scope.

## Contents

- [Standard Prometheus Endpoints](#standard-prometheus-endpoints)
- [Query Args Beyond Prometheus](#query-args-beyond-prometheus)
- [Timestamp Formats](#timestamp-formats)
- [Response Extensions](#response-extensions)
- [Additional Handlers](#additional-handlers)
- [Cluster URL Layout](#cluster-url-layout)
- [Multitenancy](#multitenancy)

---

## Standard Prometheus Endpoints

All standard Prometheus query endpoints work:

- `/api/v1/query` — instant query
- `/api/v1/query_range` — range query
- `/api/v1/series` — series metadata
- `/api/v1/labels` — label names
- `/api/v1/label/<name>/values` — label values
- `/api/v1/status/tsdb` — TSDB stats
- `/api/v1/targets` — scrape targets
- `/api/v1/metadata` — metric metadata
- `/federate` — federation export

All accept the optional `/prometheus` prefix: `/prometheus/api/v1/query` is equivalent to `/api/v1/query`.

---

## Query Args Beyond Prometheus

### `extra_label=<name>=<value>`

Adds a label matcher to every selector:

```
GET /api/v1/query_range?extra_label=user_id=123&extra_label=group_id=456&query=<query>
```

Rewritten as if `{user_id="123",group_id="456"}` were appended. Repeatable for AND across args.

For auth proxies (vmauth, vmgateway) — user query untouched; executed query sees only the user's slice.

### `extra_filters[]=<selector>`

Adds a full selector (regex supported):

```
GET /api/v1/query_range?extra_filters[]={env=~"prod|staging",user="xyz"}&query=<query>
```

More expressive than `extra_label` — supports `=~`, `!=`, regex values, multi-label filters.

### `round_digits=N`

Rounds response values to N decimals:

```
GET /api/v1/query?query=avg_over_time(temperature[1h])&round_digits=2
```

For snapshot testing, payload reduction, avoiding spurious diffs.

### `limit=N`

Available on:

- `/api/v1/labels?limit=N` — caps label names.
- `/api/v1/label/<name>/values?limit=N` — caps values.
- `/api/v1/series?limit=N` — caps series.

Capped at server limits (`-search.maxTagKeys`, `-search.maxTagValues`, `-search.maxSeries`).

### Time Range Defaults

`/api/v1/series`, `/api/v1/labels`, `/api/v1/label/<name>/values` default to **last day** from 00:00 UTC when
`start`/`end` omitted. Prometheus defaults to all time.

Rounded to day granularity for perf. For exact ranges, use `/api/v1/query` or `/api/v1/query_range`.

---

## Timestamp Formats

Accepted for `time`, `start`, `end`:

- **Unix seconds, optional fractional ms:** `1562529662.678`.
- **Unix ms:** `1562529662678`.
- **Unix µs:** `1562529662678901`.
- **Unix ns:** `1562529662678901234`.
- **RFC3339:** `2022-03-29T01:02:03Z` or `2022-03-29T01:02:03+02:30`.
- **Partial RFC3339:** `2022`, `2022-03`, `2022-03-29`, `2022-03-29T01`, etc.
  - Partial values use the VictoriaMetrics host's local timezone unless suffix added.
  - `Z` for UTC: `2022-03-01Z`.
  - `+hh:mm` or `-hh:mm` for explicit offset: `2022-03-01+06:30`.
- **Relative duration:** `1h5m`, `-1h5m`, `now-1h5m`, `now`.

Unix ns for max precision; partial RFC3339 for human-readable URLs.

---

## Response Extensions

### `stats` Object in `/api/v1/query` and `/api/v1/query_range`

```json
{
  "status": "success",
  "data": { ... },
  "stats": {
    "executionTimeMsec": 142,
    "seriesFetched": "1532"
  }
}
```

- **`executionTimeMsec`** — wall-clock query time.
- **`seriesFetched`** — approximate pre-filter series count. vmalert uses to flag misconfigured rules (millions fetched
  for tiny results).

`seriesFetched` is approximate; don't assert exact values in tests.

---

## Additional Handlers

### `/vmui`

Built-in web UI — query playground, graph rendering, cardinality explorer.

### `/api/v1/series/count`

Total series count. Notes:

- Scans all IndexDBs end-to-end — slow at tens of millions of series.
- May inflate if series exists in multiple IndexDBs.
- May count deleted series alongside live ones.

### `/api/v1/status/active_queries`

Currently executing queries. Each vmselect tracks its own list — hit each directly in cluster setups.

### `/api/v1/status/top_queries`

Three expensive-query lists:

- `topByCount` — most frequent.
- `topByAvgDuration` — biggest average duration.
- `topBySumDuration` — most total duration.

Args:

- `topN=K` — entries per list.
- `maxLifetime=duration` — filter to recent queries.

Underlying flags: `-search.queryStats.lastQueriesCount`, `-search.queryStats.minQueryDuration`.

Example: `GET /api/v1/status/top_queries?topN=5&maxLifetime=30s`.

---

## Cluster URL Layout

Cluster splits read/write:

- **vminsert** (ingestion) — port 8480.
- **vmselect** (queries) — port 8481.
- **vmstorage** (admin) — port 8482.

### Query Path

```
http://<vmselect>:8481/select/<accountID>/prometheus/<suffix>
http://<vmselect>:8481/select/<accountID>/graphite/<suffix>
```

Examples:

- `http://vmselect:8481/select/0/prometheus/api/v1/query`
- `http://vmselect:8481/select/42/prometheus/api/v1/query_range`
- `http://vmselect:8481/select/0/graphite/render`

### Single-Node vs Cluster

| Aspect          | Single-node     | Cluster                                       |
| :-------------- | :-------------- | :-------------------------------------------- |
| Query URL       | `/api/v1/query` | `/select/<accountID>/prometheus/api/v1/query` |
| Tenancy         | Single tenant   | Per-tenant via `<accountID>`                  |
| Component count | One binary      | vminsert + vmselect + vmstorage               |

### Admin Endpoints on vmselect

- `/select/<accountID>/vmui/` — tenant-scoped UI.
- `/api/v1/status/top_queries` (root, no tenant) — across tenants.
- `/delete/<accountID>/prometheus/api/v1/admin/tsdb/delete_series?match[]=...` — series deletion.
- `/admin/tenants?start=...&end=...` — list tenants with data.
- `/select/<accountID>/prometheus/vmalert/` — vmalert UI proxy (requires `-vmalert.proxyURL`).

### vmstorage Admin

Port 8482:

- `/internal/force_merge` — trigger compaction.
- `/snapshot/create` — instant snapshot for backup.
- `/snapshot/list`, `/snapshot/delete?snapshot=<id>`, `/snapshot/delete_all`.

Snapshots per-node; create on each vmstorage without sync. Live under `<storageDataPath>/snapshots`.

---

## Multitenancy

### Tenant ID Format

`<accountID>` = 32-bit integer. `<accountID>:<projectID>` adds sub-tenant (default 0). VictoriaMetrics doesn't validate;
auth proxy is responsible.

Tenant IDs can also come from HTTP headers (`AccountID`, `ProjectID`) or labels in ingested data — depends on `-cluster`
flags.

### Cross-Tenant Queries

`multitenant` path queries across tenants:

```
http://vmselect:8481/select/multitenant/prometheus/api/v1/query?query=up{vm_account_id=~"1|2|3"}
```

Each series gets `vm_account_id`, `vm_project_id` labels. Requires `-search.disableMultiTenantQueries=false` (default).
Disable for stricter isolation.

### Auth Proxies

`vmauth`, `vmgateway` map requests to tenants via:

- Auth headers (Basic, Bearer).
- URL path inspection.
- Custom routing rules.

Proxy strips user-visible auth, prepends `/select/<accountID>/` before forwarding. Injects `extra_label` /
`extra_filters[]` for label-level isolation.

**Never expose vmselect directly to untrusted callers.** Front with an auth proxy.
