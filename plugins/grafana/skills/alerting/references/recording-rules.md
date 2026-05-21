# Data-source-managed Rules (Mimir, Loki, Prometheus)

Mimir-, Loki-, and Prometheus-managed alert and recording rules. Stored in the data source and evaluated by its ruler,
not by Grafana. Use when rules must live alongside data (multi-tenant Mimir/Loki, GitOps with the data source) or when
Grafana-managed rules don't fit. Recording rules pre-compute expensive queries; alert rules evaluate thresholds — both
share the same delivery mechanism.

## Contents

- [When to use](#when-to-use)
- [Rule types and trade-offs](#rule-types-and-trade-offs)
- [Mimir / Loki managed alert rules](#mimir--loki-managed-alert-rules)
- [Mimir / Loki managed recording rules](#mimir--loki-managed-recording-rules)
- [Namespaces and groups](#namespaces-and-groups)
- [How recorded metrics work](#how-recorded-metrics-work)
- [Naming](#naming)
- [Alerting on recorded metrics](#alerting-on-recorded-metrics)
- [Loki rule files](#loki-rule-files)
- [Mimir managed recording rules](#mimir-managed-recording-rules)
- [Common pitfalls](#common-pitfalls)

---

## When to use

Reach for recording rules when one or more is true:

- A query is expensive (large aggregation, wide time range) and runs frequently from multiple places
- The same complex expression appears in several alerts or dashboard panels
- A query touches a large data set and dashboard refresh needs to be fast
- A high-cardinality source (e.g., per-tenant logs in Loki) must be reduced to bounded metric cardinality before
  alerting

If a query is cheap or runs once, alert and query against it directly. Recording rules add operational complexity (rule
storage, evaluation lag, alignment).

## Rule types and trade-offs

Both alert rules and recording rules come in two flavors. The choice affects features, RBAC, and operational model.

- **Grafana-managed rules** (recommended default) — query any data source supported by alerting, stored in the Grafana
  database, follow the unified rule lifecycle, support expressions, No Data / Error state handling, images in
  notifications, RBAC, alert state/version history, and Terraform provisioning
- **Data source-managed rules** — Prometheus-compatible, supported by Mimir and Loki (Prometheus is read-only). Stored
  in the data source and evaluated by the Mimir/Loki ruler. Use when data-source-side scaling is needed or rules must
  live alongside the data (multi-tenancy, GitOps with the data source).

### Restrictions of data-source-managed rules vs Grafana-managed

Per the
[Grafana docs page on creating data-source-managed alert rules](https://grafana.com/docs/grafana/latest/alerting/alerting-rules/create-mimir-loki-managed-rule/),
data-source-managed rules do **not** support:

- Multiple mixed data sources in a single rule
- Expressions / data transformations (the rule's `expr` is the only computation)
- No Data / Error state handling
- Images in notifications
- Role-based access control
- Alert state / version history within Grafana
- Terraform provisioning

They **do** support recording rules and horizontal scaling.

Practical implications of the data-source-managed model:

- Co-location with the data — no cross-system query at evaluation time
- Per-tenant rule isolation in multi-tenant Mimir/Loki
- Independent scaling of the ruler from Grafana
- Compatibility with existing Prometheus-style rule files (lift-and-shift)

## Mimir / Loki managed alert rules

Fires when the query evaluates to at least one series with value > 0. An alert instance is created per result series.

### Prerequisites

- **Write permission** to the Mimir / Loki / Prometheus data source — otherwise the rule can't be created or updated
- **Editor or Admin role** in Grafana — required to edit or delete alert rules
- **Ruler API enabled** on the data source
- **For Loki:** the default `local` rule storage type is view-only. To edit rules, configure a non-`local` storage type
- **For Mimir:** use the `/prometheus` prefix in the data source URL. Grafana expects the Query API and Ruler API to
  share a single base URL — a separate Ruler URL can't be configured.
- To disable Grafana-driven rule management for a Loki / Prometheus / Mimir data source, clear **Manage alerts via
  Alerting UI** in data source settings (the `manageAlerts` jsonData field).

### Authoring workflow (Grafana UI)

1. Open **Alerts & IRM → Alert rules → New alert rule**
2. Enter a **Rule name** — this is the `alertname` label on every alert instance produced by the rule
3. Switch the rule type to **Data source-managed**
4. Select a Prometheus-based data source (Mimir, Loki, or Prometheus — Prometheus is view-only)
5. Choose a **Namespace** — pick existing or create new. Namespaces hold one or more rule groups and exist purely for
   organization (often mapped to tenant ID or team).
6. Choose a **Group** within the namespace — pick existing or create new. Rules in a group evaluate **sequentially at
   the group's evaluation interval**, sharing the same evaluation timestamp. New rules append to the end of the group.
7. Enter the **query** — PromQL for Mimir/Prometheus, LogQL for Loki. The rule fires when the result has at least one
   series with value > 0. Include any threshold inline in the expression (e.g., `... > 0.05`).
8. Set the **For** (pending period) — duration the condition must be true before the alert transitions Pending → Firing.
   Set to `0s` to skip Pending and fire immediately. Once the condition stops being true, the alert returns to Normal
   directly (no Recovering state for data-source-managed rules).
9. Add **annotations** (summary, description, runbook URL) — these can use Go template syntax referencing `$labels` and
   `$value`
10. Add **labels** for routing through notification policies
11. **Preview alerts** to evaluate the rule and see what alerts it would produce
12. **Save** or **Save and exit**

### YAML rule shape (file-based / ruler API)

Mimir and Loki accept Prometheus-compatible rule files consumed directly by the Mimir / Loki ruler (via `mimirtool` /
`lokitool` or the ruler HTTP API) — _not_ the Grafana file-provisioning schema (which uses different field names for
Grafana-managed rules).

```yaml
groups:
  - name: api_alerts # required — the group's name
    interval: 1m # optional — overrides the ruler default
    limit: 0 # optional — max alerts produced per evaluation (0 = unlimited)
    rules:
      - alert: HighErrorRate # required for alert rule
        expr: | # required — PromQL (Mimir) or LogQL (Loki)
          sum(rate(http_requests_total{status=~"5.."}[5m])) by (service)
            /
          sum(rate(http_requests_total[5m])) by (service)
            > 0.05
        for: 5m # pending period
        labels:
          severity: warning
          team: platform
        annotations:
          summary: '{{ $labels.service }} error rate {{ printf "%.2f" $value }}'
          runbook_url: https://runbooks.example.com/high-error-rate
```

A single group can mix `alert:` and `record:` entries. Each entry is one rule.

### Loki alert rule example (LogQL)

```yaml
groups:
  - name: credentials_leak
    rules:
      - alert: http-credentials-leaked
        expr: |
          sum by (cluster, job, pod) (
            count_over_time(
              {namespace="prod"} |~ "http(s?)://(\\w+):(\\w+)@" [5m]
            )
          ) > 0
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: '{{ $labels.job }} is leaking HTTP basic auth credentials'
```

LogQL alert rules are useful for high-cardinality alerting where extracting metrics first would explode cardinality
(e.g., per-tenant error alerting in multi-tenant systems).

## Mimir / Loki managed recording rules

Same delivery model as alert rules; the rule writes a new time series instead of firing alerts.

### Prerequisites

Same as alert rules — write permission, Editor/Admin role, ruler API enabled, Loki rule storage configured for write,
Mimir URL using `/prometheus`.

### Authoring workflow (Grafana UI)

1. **Alerts & IRM → Alert rules → New alert rule**
2. Enter a **Rule name** — used as the recorded metric name
3. Switch the rule type to **Mimir or Loki recording rule**
4. Select a Prometheus-based data source
5. Choose **Namespace** and **Group** (same semantics as alert rules)
6. Enter the **query** — PromQL or LogQL expression. Must return a value per series; the value is recorded as a new
   sample in the recorded metric.
7. Add **labels** for the recorded series (attached to every sample)
8. Add optional **annotations** (descriptions, runbook URLs)
9. **Save** or **Save and exit**

### YAML rule shape

```yaml
groups:
  - name: api_recordings
    interval: 30s
    rules:
      - record: service:http_requests:rate5m # required — recorded metric name
        expr: |
          sum by (service) (rate(http_requests_total[5m]))
        labels:
          environment: production
```

Recording rule entries use `record:` (not `alert:`). The expression's result is written into the data source as a new
series on every evaluation tick.

## Namespaces and groups

Two organizational units for data-source-managed rules. Understanding them is essential before authoring more than a
handful of rules.

### Namespace

- Container for one or more rule groups
- Purely organizational — no impact on evaluation
- Conventions: name namespaces by team (`platform`, `payments`), tenant ID, or environment
- Mimir multi-tenancy: each tenant has its own namespaces; tenants can't see each other's rules
- Loki single-tenant uses tenant ID `fake`
- Rename namespaces from the Grafana UI (edit any rule in the namespace → namespace dropdown)

### Group

- Container for one or more rules within a namespace
- Defines the **evaluation interval** for all rules in the group (default `1m` for Mimir/Loki)
- Rules evaluate **sequentially** at the same evaluation timestamp — later rules can reference earlier rules'
  just-emitted recorded metrics
- Rule order matters: new rules append to the end
- Group-level options (Mimir/Loki rule file format):
  - `interval` — evaluation interval (overrides ruler default)
  - `limit` — max alerts produced or samples recorded per evaluation; exceeding sets rule health to `err` and clears all
    alerts produced by the rule (guards against runaway high-cardinality queries; default `0` = no limit)

### Sequential evaluation pattern

Compute a recorded metric in rule N, alert on it in rule N+1, both in the same group.

```yaml
groups:
  - name: api_health
    interval: 30s
    rules:
      - record: service:http_errors:ratio5m
        expr: |
          sum by (service) (rate(http_requests_total{status=~"5.."}[5m]))
            /
          sum by (service) (rate(http_requests_total[5m]))

      - alert: HighErrorRate
        expr: service:http_errors:ratio5m > 0.05
        for: 5m
        labels:
          severity: warning
```

The recording rule runs before the alert rule in the same evaluation tick, so the alert always evaluates against
freshly-recorded data.

## How recorded metrics work

A recording rule definition must return a **single value per evaluation**. Grafana writes that value as a new sample in
the recorded metric on each evaluation interval.

- Definitions are either instant queries returning a scalar/single value, or range queries reduced to a single value via
  a **Reduce** expression
- The new metric name is supplied by the rule (Grafana-managed: `metric` field; Prometheus-style: `record` field)
- Optional labels in the rule attach to every recorded sample
- Aggregations and small evaluation lags mean the recorded metric **is not guaranteed to exactly match raw source data**
  — shorter intervals reduce divergence

## Naming

Use Prometheus's `level:metric:operations` convention:

- `level` — what the aggregation level represents (e.g., `instance`, `job`, `cluster`)
- `metric` — the underlying metric being aggregated
- `operations` — aggregation/transformation applied, joined with underscores (e.g., `rate5m_sum`, `rate1m`,
  `count_over_time5m`)

Examples:

- `job:http_requests:rate5m` — per-job 5-minute request rate
- `cluster:node_memory_usage:ratio` — per-cluster memory usage ratio
- `nginx:requests:rate1m` — per-job nginx request rate over 1 minute (Loki-style)

Colons are reserved for recording rules — never use colons in directly instrumented metric names.

## Alerting on recorded metrics

Recorded metrics integrate with alert rules, but timing alignment matters.

- **Match evaluation frequencies.** If a recording rule runs every 3 minutes, the consuming alert should evaluate at a
  similar cadence — alerting more often than the producer updates produces redundant evaluations against stale data;
  alerting less often delays response.
- **Beware long recording intervals.** A 1-hour recording rule plus a 1-minute alert pending period gives 1-hour pending
  granularity (the metric only changes hourly).
- **Use `_over_time` instant queries.** Alert rules run as instant queries, so prefer `max_over_time(my_metric[5m])`
  over `[5m]` range + Reduce — fewer moving parts.
- **Use sequential evaluation** when an alert in the same group depends on a recording rule in that group — sequential
  evaluation ensures the recording rule completes before the alert evaluates.

## Loki rule files

Loki uses Prometheus-compatible YAML rule files. The Loki ruler reads them and writes recorded metrics to a remote-write
endpoint (Prometheus, Mimir, Thanos Receiver).

### Rule file structure

```yaml
groups:
  - name: production_rules
    limit: 10
    interval: 1m
    rules:
      - alert: HighPercentageError
        expr: |
          sum(rate({app="foo", env="production"} |= "error" [5m])) by (job)
            /
          sum(rate({app="foo", env="production"}[5m])) by (job)
            > 0.05
        for: 10m
        labels:
          severity: page
        annotations:
          summary: High request latency
      - record: nginx:requests:rate1m
        expr: |
          sum(rate({container="nginx"}[1m]))
        labels:
          cluster: us-central1
```

- `interval` — group-level evaluation interval (overrides ruler default)
- `limit` — max alerts produced or samples recorded per evaluation; exceeding sets rule health to `err` and clears
  produced alerts (guards against runaway high-cardinality queries)
- Rule entries are either `alert:` or `record:` — never both

### Ruler configuration essentials

- Sharding: enable `enable_sharding`, configure the ring (`ring.kvstore`) for horizontal scaling. Rules re-shard on
  every ruler join/leave.
- Storage backends: `azure`, `gcs`, `s3`, `swift`, `cos`, `local`. Local is read-only, useful for mounted ConfigMaps.
- Remote-write target: configure under `ruler.remote_write` — Prometheus 2.25+, Mimir, or Thanos Receiver.
- Remote evaluation: prefer remote evaluation against the query frontend for large deployments; local evaluation can
  produce inconsistent results vs. dashboards.

### Multi-tenant rules layout

```
/tmp/loki/rules/<tenant id>/rules1.yaml
                            /rules2.yaml
```

In single-tenant Loki, the tenant ID is `fake`.

### lokitool workflow

`lokitool` (replaces `cortextool` for Loki ≥ 3.1) manages remote rules from a local directory.

- `lokitool rules lint ./output/rules.yaml` — validate and reformat
- `lokitool rules diff --rule-dirs=./output` — compare local vs. remote
- `lokitool rules sync --rule-dirs=./output` — push local to remote, deleting remote-only rules
- `lokitool rules print` — dump remote ruleset
- Filter flags: `--namespaces`, `--namespaces-regex`, `--ignored-namespaces`, `--ignored-namespaces-regex` (mutually
  exclusive)
- Multi-tenant: set `--id=<tenant>` or `LOKI_TENANT_ID` env var

## Mimir managed recording rules

For Mimir, the same Prometheus-compatible rule format applies. The Mimir ruler reads rule files (or rules pushed via the
API) and writes recorded samples back into Mimir.

- Use Grafana-managed recording rules to query non-Prometheus data sources (e.g., compute a metric from PostgreSQL) and
  write the result into a Prometheus-compatible store for downstream querying
- Use data source-managed (Mimir) recording rules when the source data already lives in Mimir/Prometheus and the
  recording rule is purely an aggregation — keeps the data path local

## Common pitfalls

- Adding a label whose value changes per evaluation — produces a new series per cycle, blowing up cardinality
- Forgetting aggregation is irreversible — once `sum without (instance)` runs, no consumer can recover the per-instance
  breakdown
- Long evaluation interval for a recording rule consumed by short-pending alerts — alerts wait for stale data to update
- Averaging a ratio in a consumer — record `numerator` and `denominator` separately, divide at query time
- Naming a recorded metric the same as a source metric — confuses readers and triggers cardinality collisions if labels
  differ
- Alert and record rules in the same group without sequential evaluation when the alert depends on the recording rule's
  just-emitted value
