---
name: promql
description: >-
  PromQL query writing: selectors, operators, vector matching, functions, aggregations, histograms, subqueries,
  recording rules, alerting rules, and query optimization. Invoke whenever task involves any interaction with PromQL —
  writing, debugging, optimizing, reviewing, or explaining Prometheus queries for dashboards, alerts, recording rules,
  or ad-hoc exploration.
---

# PromQL

PromQL is a nested functional language for selecting and aggregating Prometheus time series. Every query is an
expression tree: selectors at the leaves, functions and operators at the nodes, a single root value (scalar, instant
vector, range vector, or string) at the top. Type discipline makes queries correct; cardinality awareness makes them
fast.

Authoritative reference for **writing PromQL queries** — dashboards, alerts, recording rules, exploration. The companion
`backend/prometheus` skill covers **instrumentation** (metric types, naming, labels, exporters). When both apply, use
`backend/prometheus` for emitting metrics and this skill for querying them.

## References

- **Selectors and data types** — [`${CLAUDE_SKILL_DIR}/references/selectors-and-types.md`] Expression types, instant and
  range vector selectors, label matchers (`=`, `!=`, `=~`, `!~`), time durations, offset and `@` modifiers, staleness,
  instant vs range queries, string and float literals
- **Operators** — [`${CLAUDE_SKILL_DIR}/references/operators.md`] Arithmetic, comparison, logical/set, vector matching
  (`on`, `ignoring`, `group_left`, `group_right`), aggregation operators, `by`/`without`, fill modifiers, operator
  precedence
- **Functions** — [`${CLAUDE_SKILL_DIR}/references/functions.md`] Full function catalog: counter family, gauge
  functions, classic and native histograms, `*_over_time`, existence checks, label manipulation, math, time, type
  conversion, sorting, trigonometric
- **Native histograms** — [`${CLAUDE_SKILL_DIR}/references/native-histograms.md`] Native vs classic detection,
  `histogram_quantile` across both forms, native-only functions (`histogram_avg`, `histogram_count`, `histogram_sum`,
  `histogram_fraction`, `histogram_stddev`, `histogram_stdvar`), aggregation without `le`, NHCB semantics, trim
  operators, migration patterns, function compatibility matrix, gotchas, annotations
- **Subqueries** — [`${CLAUDE_SKILL_DIR}/references/subqueries.md`] Syntax, resolution and alignment, nested subqueries,
  when to use subqueries vs recording rules, pitfalls
- **Optimization and pitfalls** — [`${CLAUDE_SKILL_DIR}/references/optimization.md`] Cardinality awareness, common
  pitfalls (rate-of-gauge, aggregate-then-rate, averaging ratios, averaging summary quantiles), counter resets,
  staleness, rate window sizing, native histograms, diagnostics
- **Recording and alerting rules** — [`${CLAUDE_SKILL_DIR}/references/recording-alerting-rules.md`] Rule file structure,
  `level:metric:operations` naming, ratio aggregation patterns, alert syntax, `for`/`keep_firing_for`, templating,
  alerting best practices, anti-patterns

Read the relevant reference before proceeding.

---

## Data Types

Every expression has one type. Functions and operators require specific input types — type mismatch is the most common
cause of "query parses but returns nothing".

- **instant vector** — set of series, one sample per series at one timestamp. Default result of metric selectors,
  aggregations, most functions.
- **range vector** — set of series, multiple samples per series across a time window. Produced **only** by range vector
  selectors (`metric[5m]`) and subqueries. Cannot be graphed directly — must pass through a function returning an
  instant vector.
- **scalar** — single numeric value, no labels. Used as numeric arguments and in arithmetic.
- **string** — function arguments only; cannot be a query result.

**Function type rules:**

- `rate`, `irate`, `increase`, `delta`, `idelta`, `deriv`, `predict_linear`, `*_over_time` — range vector → instant
  vector
- `histogram_quantile`, `histogram_fraction`, `histogram_*` — instant vector (histogram or bucket series) → instant
  vector
- Aggregation operators (`sum`, `avg`, `max`, `topk`, ...) — instant vector → instant vector
- `scalar()` — instant vector → scalar; `vector()` — scalar → instant vector

## Selectors

### Instant Vector Selectors

```promql
http_requests_total                                # all series with this metric name
http_requests_total{job="api"}                     # filtered by label
http_requests_total{job="api", method="GET"}       # multiple matchers — AND
http_requests_total{status=~"5.."}                 # regex match (RE2, fully anchored)
http_requests_total{method!="OPTIONS"}             # negative match
{__name__=~"http_.*"}                              # regex on metric name via __name__
```

**Label matchers:** `=` exact, `!=` not equal, `=~` regex match, `!~` negative regex.

**Regex is fully anchored** — `=~"foo"` matches `^foo$`, not arbitrary substrings. Use `=~".*foo.*"` for substrings.

**Required selectors:** at least one matcher must not match the empty string. `{job=~".*"}` is illegal; `{job=~".+"}` is
valid.

### Range Vector Selectors

Append `[duration]` to a selector:

```promql
http_requests_total[5m]                            # last 5 minutes of samples
http_requests_total{job="api"}[1h]
```

Duration units: `ms`, `s`, `m`, `h`, `d`, `w`, `y`. Combine longest-first: `1h30m`, `12h34m56s`. Floats with units are
not allowed (`1.5h` is invalid — use `1h30m`).

### Modifiers

- **`offset <duration>`** — time-shift into the past (or future with negative). Must immediately follow the selector.

  ```promql
  http_requests_total offset 5m
  rate(http_requests_total[5m] offset 1w)            # rate one week ago
  ```

- **`@ <unix-timestamp>`** — pin evaluation to an absolute time. `start()` and `end()` resolve to the range query's
  bounds.

  ```promql
  http_requests_total @ 1609746000
  rate(http_requests_total[5m] @ end())
  ```

**Staleness:** instant vector selectors return the most recent sample within the lookback window (default 5 minutes).
Series with no sample in the window disappear from the result.

Full selector reference, lookback delta tuning, instant-vs-range-query semantics:
[`${CLAUDE_SKILL_DIR}/references/selectors-and-types.md`].

## Operators

### Arithmetic and Comparison

`+`, `-`, `*`, `/`, `%`, `^` — IEEE 754 arithmetic. The metric name is dropped from any vector arithmetic result.

`==`, `!=`, `>`, `<`, `>=`, `<=` — by default **filter**: drop series where the comparison is false. Add `bool` after
the operator to return `0` or `1` instead.

```promql
http_requests_total > 100                          # only series whose latest value exceeds 100
http_requests_total > bool 100                     # all series, value is 1 if > 100 else 0
```

### Logical/Set Operators

Operate on label-set membership, ignoring sample values:

- `vector1 and vector2` — intersection
- `vector1 or vector2` — union
- `vector1 unless vector2` — complement

```promql
up{job="prom"} or up{job="node"}                       # union
metric and on(device) (other_metric == 0)              # constrained intersection
```

### Vector Matching

The biggest source of "no results returned". Default rule: **two elements match if they have exactly the same label
set** (after the metric name drops). When operands have different label sets, match keywords are required:

- **`on(labels)`** — match only on these labels; ignore all others
- **`ignoring(labels)`** — match on all labels except these

**Group modifiers for many-to-one** (arithmetic, comparison, trigonometric only — not set operators):

- **`group_left(extra_labels)`** — many on the left, one on the right; copy extra_labels from right to result
- **`group_right(extra_labels)`** — symmetric

**Canonical patterns:**

```promql
# Error ratio: errors carry an extra `code` label; ignore it to match
errors:rate5m{code="500"} / ignoring(code) requests:rate5m

# Many-to-one: same denominator for every code
errors:rate5m / ignoring(code) group_left requests:rate5m

# Join info-style metric: bring `version` label into result
node_filesystem_avail_bytes * on(instance, job) group_left(version) node_exporter_build_info
```

### Aggregation

Instant vector → instant vector with fewer elements.

- **`sum`**, **`avg`**, **`min`**, **`max`** — reduce across dimensions
- **`count`** — number of series; **`group`** — value 1 per group
- **`topk(k, v)`** / **`bottomk(k, v)`** — k largest/smallest; preserves labels
- **`stddev`**, **`stdvar`** — population statistics
- **`quantile(φ, v)`** — quantile across series
- **`count_values(label, v)`** — distribution of values

**`by` vs `without`:**

- `by (labels)` keeps **only** the listed labels
- `without (labels)` keeps **everything except** the listed labels

**Prefer `without`** for normal aggregations — preserves `job`, `instance`, and friends. Use `by` for a known output
dimension set (typically recording rules).

```promql
sum without (instance) (rate(http_requests_total[5m]))    # collapses instance, keeps job/method/status
sum by (job) (rate(http_requests_total[5m]))              # collapses everything except job
```

### Operator Precedence (highest to lowest)

1. `^`
2. `*`, `/`, `%`, `atan2`
3. `+`, `-`
4. `==`, `!=`, `<=`, `<`, `>=`, `>`
5. `and`, `unless`
6. `or`

Left-associative except `^` (right-associative). Use parentheses when mixing comparison and logical operators.

Full operator catalog, fill modifiers, detailed vector matching examples:
[`${CLAUDE_SKILL_DIR}/references/operators.md`].

## Key Functions by Category

### Counters — `rate`, `irate`, `increase`

The three most important PromQL functions. All take a range vector, return an instant vector, handle counter resets
automatically.

- **`rate(v[5m])`** — per-second average rate over the range, extrapolated. Use for alerts and slow counters.
- **`irate(v[1m])`** — instant rate from the last two samples. Graphing volatile counters only; never alerts (flaps).
- **`increase(v[1h])`** — total increase over the range; syntactic sugar for `rate(v) * range_seconds`. Use for
  human-readable totals.

**Composition rule — `rate()` first, then aggregate:**

```promql
sum(rate(http_requests_total[5m]))             # CORRECT
rate(sum(http_requests_total)[5m])             # WRONG — counter resets disappear into the sum
```

Applies to all counter functions (`rate`, `irate`, `increase`), gauge functions (`delta`, `deriv`, `predict_linear`),
and `*_over_time` functions.

**Window sizing:** range must contain ≥2 samples. Rule of thumb: 4× the scrape interval, minimum 1m. With 15s scrapes
the standard default is `[5m]`.

### Gauges — `delta`, `idelta`, `deriv`, `predict_linear`

For gauges only. Never apply `rate()` to a gauge.

```promql
delta(cpu_temp_celsius[2h])                                  # absolute change over 2h
deriv(node_memory_MemAvailable_bytes[5m])                    # smoothed per-second change
predict_linear(node_filesystem_avail_bytes[1h], 4*3600) < 0  # will fs fill in 4h?
```

### Histograms

**Classic histograms** expose `_bucket{le="..."}`, `_sum`, `_count` series:

```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Aggregating across instances — `le` MUST be preserved
histogram_quantile(0.95, sum by (job, le) (rate(http_request_duration_seconds_bucket[5m])))
histogram_quantile(0.95, sum without (instance) (rate(http_request_duration_seconds_bucket[5m])))

# Average from sum/count
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])
```

**Native histograms** are single composite series — quantile aggregation does not require `le`:

```promql
histogram_quantile(0.9, sum by (job) (rate(http_request_duration_seconds[5m])))
histogram_fraction(0, 0.2, rate(http_request_duration_seconds[5m]))     # fraction ≤ 200ms
histogram_avg(rate(http_request_duration_seconds[5m]))
histogram_count(rate(http_request_duration_seconds[5m]))                # rate of observations
histogram_sum(rate(http_request_duration_seconds[5m]))
```

If native histograms are available, prefer them — fewer series, easier aggregation, lower error.

Full native histogram semantics — detection, function compatibility matrix, NHCB behavior, trim operators, migration,
gotchas: [`${CLAUDE_SKILL_DIR}/references/native-histograms.md`].

### Aggregation Over Time — `*_over_time`

Range vector → one summary value per series.

- **`avg_over_time(range-vector)`** — average across the range
- **`min_over_time`** / **`max_over_time`** — extremes
- **`sum_over_time`** / **`count_over_time`** — totals
- **`last_over_time`** / **`present_over_time`** — most recent / existence
- **`quantile_over_time(φ, range-vector)`** — quantile across time
- **`stddev_over_time`** / **`stdvar_over_time`**

```promql
avg_over_time(node_memory_MemAvailable_bytes[1h])
max_over_time(rate(http_requests_total[5m])[1h:])         # subquery needed — rate is instant vector
```

### Existence and Counter Resets

```promql
absent(up{job="critical"})                         # 1 if no series, empty if any
absent_over_time(up{job="critical"}[5m])           # missing for the entire window
resets(http_requests_total[1h])                    # how many counter resets in the range
changes(up[1h])                                    # how many times the value changed
```

### Label Manipulation

```promql
label_replace(up, "host", "$1", "instance", "(.+):(\\d+)")        # extract host from instance="host:port"
label_join(rate(x[5m]), "endpoint", " ", "method", "path")        # concatenate labels
info(rate(http_server_duration_count[5m]))                        # auto-join with target_info (experimental)
```

Full function catalog: [`${CLAUDE_SKILL_DIR}/references/functions.md`].

## Subqueries

Embed a range query inside an instant query. Syntax:

```promql
<instant-vector-expression>[<range>:[<resolution>]]
```

Use when a range-vector function needs the output of another function or aggregation:

```promql
max_over_time(rate(http_requests_total[5m])[1h:])             # peak 5m-rate over the last hour
quantile_over_time(0.99, rate(errors[1m])[1d:])               # 99th percentile of per-minute error rates over a day
deriv(rate(http_requests_total[5m])[30m:])                    # is the rate accelerating?
```

**Performance:** subqueries re-run the inner expression at every resolution step. A `[1d:1m]` subquery runs the inner
1,440 times. For expensive inner expressions or repeated use, convert to a recording rule.

**Avoid subqueries inside recording rules.** Split into two recording rules.

Full syntax, alignment rules, subquery vs recording rule guidance: [`${CLAUDE_SKILL_DIR}/references/subqueries.md`].

## Common Query Idioms

```promql
# Request rate by job
sum by (job) (rate(http_requests_total[5m]))

# Error ratio — aggregate numerator and denominator separately
  sum(rate(http_requests_total{status=~"5.."}[5m]))
/
  sum(rate(http_requests_total[5m]))

# P99 latency by handler (classic histogram)
histogram_quantile(0.99, sum by (handler, le) (rate(http_request_duration_seconds_bucket[5m])))

# Top 5 CPU consumers
topk(5, sum by (app) (rate(process_cpu_seconds_total[5m])))

# Disk-full prediction
predict_linear(node_filesystem_avail_bytes{mountpoint="/"}[6h], 24*3600) < 0

# Alert on missing scrape target
absent(up{job="critical-service"})

# Week-over-week request rate comparison
  rate(http_requests_total[5m])
-
  rate(http_requests_total[5m] offset 1w)

# Batch job staleness
time() - my_batch_last_success_timestamp_seconds > 2 * 3600
```

## Pitfalls — Quick Reference

Positive rules when writing or reviewing queries:

- **Apply `rate()` to counters only.** Use `delta()`, `idelta()`, or `deriv()` for gauges. `rate()` on a gauge silently
  produces nonsense.
- **`rate()` first, then aggregate.** `sum(rate(x[5m]))`, never `rate(sum(x)[5m])`. Counter resets are per-series.
- **Aggregate ratios correctly.** Sum numerator and denominator separately, then divide. Never `avg(ratio)` or
  `avg(avg)`.
- **Don't average summary quantiles.** `avg(metric{quantile="0.95"})` is statistically invalid. Use histograms for
  cross-instance aggregation.
- **Preserve `le` when aggregating classic histogram buckets.** `sum by (job, le)` or `sum without (instance)`.
- **Range ≥ 4× scrape interval, minimum 1m.** Avoid `rate(x[1m])` with 30s+ scrape intervals.
- **`rate()` (not `irate()`) for alerts.** `irate()` is for graphing volatile counters.
- **`without` over `by`** for most aggregations — preserves useful labels like `job` automatically.
- **`offset` must immediately follow the selector.** `sum(x offset 5m)` is correct; `sum(x) offset 5m` is invalid.
- **Filter early.** Push label matchers into the innermost selector.

Full pitfall catalog with diagnostics: [`${CLAUDE_SKILL_DIR}/references/optimization.md`].

## Recording and Alerting Rules

### Recording Rule Naming — `level:metric:operations`

```
instance:http_requests:rate5m                   # per-instance rate (no aggregation)
job:http_requests:rate5m                        # rolled up to per-job
job:http_errors_per_requests:ratio_rate5m       # ratio, per job
job:request_latency_seconds:mean5m              # average latency from Summary
```

- **`level`** — labels remaining in the output (`instance`, `job`, `cluster`, `instance_path`, etc.)
- **`metric`** — metric name; strip `_total` after `rate()`
- **`operations`** — operations applied, newest first. Omit `_sum` when other ops present; `mean` replaces `rate` for
  sum/count averages; `ratio` for divisions named with `_per_`

Recording rule examples and ratio aggregation patterns: [`${CLAUDE_SKILL_DIR}/references/recording-alerting-rules.md`].

### Alerting Rule Essentials

```yaml
- alert: HighErrorRatio                   # CamelCase community convention
  expr: |
      sum by (job) (rate(http_requests_total{status=~"5.."}[5m]))
    /
      sum by (job) (rate(http_requests_total[5m]))
    > 0.05
  for: 10m                                # must be true for the entire window before firing
  keep_firing_for: 5m                     # keep firing this long after expression becomes false
  labels:
    severity: page
  annotations:
    summary: "High error rate on {{ $labels.job }}"
    description: "Error ratio is {{ $value | humanizePercentage }} for {{ $labels.job }}"
    runbook_url: "https://wiki.example.com/runbooks/{{ $labels.job }}"
```

**Alerting principles:**

- **Alert on symptoms, not causes.** User-visible latency, error rates — not internal-only metrics.
- **Page on one stack layer.** If user latency is fine, don't page on a slow sub-component.
- **Every page must be actionable.** Nothing to do → delete the alert.
- **Match `for:` to the rate window.** `rate(x[5m])` with `for: 30s` is contradictory.

Full alerting best practices, template variables, anti-patterns:
[`${CLAUDE_SKILL_DIR}/references/recording-alerting-rules.md`].

## Application

**Writing PromQL queries:**

- Apply conventions silently — don't narrate each rule.
- Wrap counters in `rate()` or `increase()` before any further operation.
- Aggregate before joining; filter at the innermost selector.
- Prefer `without` over `by` when removing a noise dimension.
- For histograms, prefer native when available; otherwise preserve `le` in aggregations.

**Writing recording rules:**

- Follow `level:metric:operations` naming.
- Build a hierarchy: per-instance rule first, then aggregate up. Strip `_total` after `rate()`.
- Aggregate ratios by computing numerator and denominator separately.
- No subqueries inside recording rules — split into two rules.

**Writing alerting rules:**

- CamelCase alert names; `severity` label for routing.
- Alert on symptoms at the top of the stack.
- Set `for:` to filter blips, sized to match the underlying rate window.
- Use templating for context-rich notifications (`{{ $labels.X }}`, `{{ $value }}`).

**Reviewing PromQL:**

- Cite the violation and show the fix inline.
- Check first: `rate()` on a counter? Aggregation inside `rate()`? `le` preserved?

## Integration

`backend/prometheus` governs instrumentation (metric types, naming, labels, exporters, cardinality). This skill governs
query writing. When both apply:

- "What metric should I emit" — `backend/prometheus`
- "How do I query this" — this skill
- Naming a recording rule output — use `level:metric:operations` here; that becomes the metric name `backend/prometheus`
  rules then apply to

`grafana/metricsql` (forthcoming) covers VictoriaMetrics' PromQL superset. MetricsQL extends PromQL with extra functions
and looser type rules — write standard PromQL when targeting either Prometheus or VictoriaMetrics; reach for
MetricsQL-only features only when the deployment is VictoriaMetrics and the standard expression is awkward.
