# Recording and Alerting Rules

Recording rules pre-compute expressions into new time series. Alerting rules raise alerts from expressions. Both are
PromQL queries scheduled at regular intervals, persisted to TSDB or sent to Alertmanager.

## Contents

- [Rule File Structure](#rule-file-structure)
- [Recording Rule Syntax](#recording-rule-syntax)
- [Naming Convention — `level:metric:operations`](#naming-convention--levelmetricoperations)
- [Recording Rule Patterns](#recording-rule-patterns)
- [Alerting Rule Syntax](#alerting-rule-syntax)
- [Alert Naming and Severity](#alert-naming-and-severity)
- [`for`, `keep_firing_for`, and Pending State](#for-keep_firing_for-and-pending-state)
- [Labels and Annotations Templating](#labels-and-annotations-templating)
- [Alerting Best Practices](#alerting-best-practices)
- [Rule Group Settings](#rule-group-settings)
- [Anti-Patterns](#anti-patterns)

---

## Rule File Structure

Rules live in YAML files, loaded by Prometheus via `rule_files` in its main config. Reload with `SIGHUP` or
`POST /-/reload`. Validate with `promtool check rules <file>`.

```yaml
groups:
  - name: api-server-rules
    interval: 30s
    rules:
      - record: job:http_requests:rate5m
        expr: sum by (job) (rate(http_requests_total[5m]))

      - alert: HighErrorRate
        expr: job:errors:ratio_rate5m > 0.05
        for: 10m
        labels:
          severity: page
        annotations:
          summary: "High error rate on {{ $labels.job }}"
```

Rules within a group run sequentially at the group's evaluation interval. A later rule can reference the result of an
earlier rule — cross-group dependencies see the previous cycle's value.

## Recording Rule Syntax

```yaml
- record: <metric_name>           # new series name (valid metric name — snake_case, colons allowed)
  expr: <promql>                  # PromQL evaluated every interval
  labels:                         # optional extra labels added to all output series
    key: value
```

The new series is identified by `record` plus all labels from the query result plus any rule-level labels.

## Naming Convention — `level:metric:operations`

Community convention `level:metric:operations`, each component encoding meaning:

- **`level`** — aggregation level: which labels remain in the output. Common: `instance`, `job`, `cluster`,
  `instance_path`, `job_path`, `code`. No aggregation → level matches the input.
- **`metric`** — metric name. Strip `_total` after `rate()` or `irate()` (`http_requests_total` → `http_requests`).
- **`operations`** — operations applied, newest first. Shortcuts:
  - Omit `_sum` when other operations present (`sum()` is the default aggregation)
  - Associative operations merge (`min_min` → `min`)
  - Use `mean` instead of `rate` for division-by-`_count` to get a mean
  - For ratios, use `_per_` between the two metrics and name the operation `ratio`

### Examples

```
instance:http_requests:rate5m                       # per-instance request rate over 5m
job:http_requests:rate5m                            # rolled up to per-job
job:http_errors_per_requests:ratio_rate5m           # ratio of error rate to request rate, per job
instance_path:request_latency_seconds:mean5m        # average latency per (instance, path) from a Summary
job:request_latency_seconds:mean5m                  # rolled up to per-job
job:request_latency_seconds:histogram_quantile_p95_rate5m   # 95th percentile from a histogram
```

### Why this convention matters

- Pattern-matching dashboards: a Grafana variable can match `job:*:rate5m` to find all per-job rate metrics
- Refactoring: stable metric name across aggregation levels makes search/replace safe
- Reasoning: the level in the name should match what's in the labels — mismatch is a code smell

## Recording Rule Patterns

### Layer 1: per-instance rate

```yaml
- record: instance_path:requests:rate5m
  expr: rate(requests_total[5m])
```

### Layer 2: aggregate up

```yaml
- record: path:requests:rate5m
  expr: sum without (instance) (instance_path:requests:rate5m)
```

`sum without (instance)` removes one label, preserves the rest — result still carries `job`, `path`, and others.

### Layer 3: ratio (per-instance first, then aggregate)

```yaml
# Per-instance ratio
- record: instance_path:request_failures_per_requests:ratio_rate5m
  expr: |
      instance_path:request_failures:rate5m
    /
      instance_path:requests:rate5m

# Aggregate numerator and denominator separately, then divide
- record: path:request_failures_per_requests:ratio_rate5m
  expr: |
      sum without (instance) (instance_path:request_failures:rate5m)
    /
      sum without (instance) (instance_path:requests:rate5m)

# Strip path too — promote to job level
- record: job:request_failures_per_requests:ratio_rate5m
  expr: |
      sum without (instance, path) (instance_path:request_failures:rate5m)
    /
      sum without (instance, path) (instance_path:requests:rate5m)
```

**Rule:** never aggregate a ratio. Aggregate numerator and denominator separately, then divide. Same applies to averages
— never average an average.

### Layer 4: average from Summary `_count`/`_sum`

```yaml
- record: instance_path:request_latency_seconds_count:rate5m
  expr: rate(request_latency_seconds_count[5m])

- record: instance_path:request_latency_seconds_sum:rate5m
  expr: rate(request_latency_seconds_sum[5m])

- record: instance_path:request_latency_seconds:mean5m
  expr: |
      instance_path:request_latency_seconds_sum:rate5m
    /
      instance_path:request_latency_seconds_count:rate5m
```

Note `mean5m` — "mean" replaces "rate" when the result is a per-period average rather than a per-second rate.

### Histogram quantile recording rule

```yaml
- record: job:http_request_duration_seconds:histogram_quantile_p95_rate5m
  expr: |
    histogram_quantile(
      0.95,
      sum by (job, le) (rate(http_request_duration_seconds_bucket[5m]))
    )
```

## Alerting Rule Syntax

```yaml
- alert: <CamelCaseAlertName>
  expr: <promql>                  # query that returns non-empty vector when alert should fire
  for: <duration>                 # how long the expression must be true before the alert fires
  keep_firing_for: <duration>     # how long the alert keeps firing after the expression stops being true
  labels:
    severity: page                # routing labels for Alertmanager
    team: api
  annotations:
    summary: "..."                # short human-readable description (templated)
    description: "..."            # longer explanation; can include runbook link
    runbook_url: "https://..."
```

The alert fires for each label combination in the expression's result. Empty vector → no alert active.

## Alert Naming and Severity

- **Camel case** — `HighRequestLatency`, `KubePodCrashLooping`. Community standard (see monitoring-mixins.dev).
- **Severity labels** — typical values:
  - `critical` / `page` — wake someone up
  - `warning` — handle next business day, but acknowledge
  - `info` — informational; no notification routing
- **Routing keys** — labels like `team`, `service`, `severity` drive Alertmanager routing. Standardize across alerts.

## `for`, `keep_firing_for`, and Pending State

- **`for: 0s` (default)** — fires on the first evaluation where the expression is true.
- **`for: <duration>`** — expression must be true for every evaluation across the duration. During this window the alert
  is **pending**. Filters out transient blips.
- **`keep_firing_for: <duration>`** — keep the alert firing for this duration after the expression becomes false.
  Prevents flapping when an alert oscillates around its threshold.

**`for` window selection:**

- Short (1-2 min): low-noise infrastructure alerts (`up == 0`)
- Medium (5-10 min): rate-based alerts where minor spikes are expected
- Long (30 min+): trend-based alerts (disk filling, slow leaks)

Match `for` to the rate window — `rate(x[5m])` with `for: 30s` is contradictory; the 5-minute window already smooths
spikes.

**Pending state and synthetic series:**

Prometheus emits `ALERTS{alertname="X", alertstate="pending|firing", ...}` for every active alert. Queryable like any
metric — useful for meta-alerting (alerts on alert volume, missing-alert detection).

## Labels and Annotations Templating

Both labels and annotations support Go template syntax with three context variables:

- `{{ $labels.<label> }}` — value of a label on the firing series
- `{{ $value }}` — numeric sample value at evaluation time
- `{{ $externalLabels.<label> }}` — Prometheus `external_labels` (cluster, replica, etc.)

```yaml
- alert: InstanceDown
  expr: up == 0
  for: 5m
  labels:
    severity: page
  annotations:
    summary: "Instance {{ $labels.instance }} down"
    description: "{{ $labels.instance }} of job {{ $labels.job }} has been down for more than 5 minutes (value: {{ $value }})."
    runbook_url: "https://wiki.example.com/runbooks/{{ $labels.job }}"
```

**Templating gotchas:**

- Templates apply per-firing-series. `up == 0` firing for 50 instances → 50 templated annotations.
- Annotations are sent to Alertmanager — keep short. Long descriptions inflate notification payloads.
- Don't put query results in labels — label cardinality should remain bounded.

## Alerting Best Practices

From Rob Ewaschuk's "My Philosophy on Alerting" and Prometheus community guidance.

### Alert on symptoms, not causes

Symptoms are user-visible. Causes are inferred. Page on symptoms — operator gets a clear "is this real?" signal.

- **Bad:** "Garbage collection time on the API server is high" — may or may not affect users
- **Good:** "API request latency P99 > 500ms for 10 minutes" — definitely affects users

Use dashboards to drill down to the cause once an alert fires.

### Page on the right layer

For latency, page on one point in the stack — typically the user-facing endpoint. If user latency is fine, do not page
on a slow internal component. Multiple pages on overlapping symptoms create alert fatigue.

### Have as few alerts as possible

Aim for "every page is actionable." Alert fires and nothing to do → delete it.

### Standard categories

- **Online serving** — high latency, high error rate at the top of the stack
- **Offline processing** — data taking too long end-to-end through the pipeline
- **Batch jobs** — last success too long ago (≥2× normal cycle time)
- **Capacity** — heading toward exhaustion (disk, file handles, connection pool) with enough lead time to act
- **Metamonitoring** — Prometheus, Alertmanager, exporters themselves; supplement with blackbox monitoring

### Latency alert idioms

```yaml
- alert: HighRequestLatencyP99
  expr: |
    histogram_quantile(0.99,
      sum by (job, le) (rate(http_request_duration_seconds_bucket[5m]))
    ) > 0.5
  for: 10m
  labels:
    severity: page
```

### Error rate ratio alert

```yaml
- alert: HighErrorRatio
  expr: |
      sum by (job) (rate(http_requests_total{status=~"5.."}[5m]))
    /
      sum by (job) (rate(http_requests_total[5m]))
    > 0.05
  for: 10m
  labels:
    severity: page
```

### Batch job freshness

```yaml
- alert: BatchJobStale
  expr: time() - my_batch_last_success_timestamp_seconds > 2 * 3600
  for: 5m
  labels:
    severity: warning
```

### Capacity prediction

```yaml
- alert: DiskWillFill
  expr: predict_linear(node_filesystem_avail_bytes{mountpoint="/"}[6h], 24 * 3600) < 0
  for: 30m
  labels:
    severity: warning
  annotations:
    summary: "Disk on {{ $labels.instance }} will fill within 24 hours"
```

### Missing metric

```yaml
- alert: MetricMissing
  expr: absent_over_time(up{job="critical-service"}[15m])
  for: 5m
  labels:
    severity: page
```

## Rule Group Settings

```yaml
groups:
  - name: example
    interval: 30s              # evaluation interval (default: global evaluation_interval)
    limit: 10                  # max series produced by recording rules / max alerts per rule (0 = unlimited)
    query_offset: 30s          # offset evaluation by this duration into the past
    labels:                    # group-level labels added to all rule outputs
      cluster: prod-us-east
    rules:
      - ...
```

**`query_offset`** — delays rule evaluation to allow underlying scrape data to arrive. Critical for Prometheus running
as a remote-write target where ingestion lag is normal.

**`limit`** — when exceeded, **all** rule series are discarded and (for alerting rules) all alerts cleared. Protects
against runaway cardinality; choose limits bounding expected output.

**Failed evaluation:** rule group runs longer than its interval → next evaluation is skipped (gap in recording rule
output, incremented `rule_group_iterations_missed_total` counter).

## Anti-Patterns

### Subquery inside a recording rule

```yaml
# BAD
- record: job:rate5m:max_over_time1h
  expr: max_over_time(sum by (job) (rate(http_requests_total[5m]))[1h:])
```

Subqueries are expensive — re-run the inner expression every evaluation. Split into two rules:

```yaml
# GOOD
- record: job:requests:rate5m
  expr: sum by (job) (rate(http_requests_total[5m]))
- record: job:requests:rate5m_max1h
  expr: max_over_time(job:requests:rate5m[1h])
```

### Recording rule level doesn't match labels

```yaml
# BAD — name says job, but `instance` is still in the label set
- record: job:requests:rate5m
  expr: rate(requests_total[5m])
```

The level prefix must match the labels in the output. No aggregation → level matches the input level.

### Alert on cause, not symptom

```yaml
# BAD — internal metric, not user-visible
- alert: HighGCTime
  expr: process_gc_seconds > 5
```

Page on user latency. Use the GC metric in a dashboard for diagnosis.

### Multi-layer latency pages

```yaml
# BAD — three pages for the same incident
- alert: ApiLatencyHigh
  expr: api_latency > 0.5
- alert: BackendLatencyHigh
  expr: backend_latency > 0.3
- alert: DbLatencyHigh
  expr: db_latency > 0.1
```

Page on the top of the stack only. If the user is unaffected, lower layers can wait. Move lower-layer alerts to
diagnostic dashboards or warning-level (no-page) alerts.

### Aggregating a ratio in a recording rule

```yaml
# BAD
- record: job:error_ratio:avg_rate5m
  expr: avg by (job) (instance:errors:rate5m / instance:requests:rate5m)
```

Average of per-instance ratios is meaningless. Aggregate numerator and denominator separately:

```yaml
# GOOD
- record: job:error_ratio:rate5m
  expr: |
      sum by (job) (instance:errors:rate5m)
    /
      sum by (job) (instance:requests:rate5m)
```
