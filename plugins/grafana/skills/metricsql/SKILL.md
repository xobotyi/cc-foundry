---
name: metricsql
description: >-
  VictoriaMetrics MetricsQL query language as a PromQL superset: rollup extensions, behavioral
  differences from PromQL (rate/increase semantics, implicit conversions, auto-aligned subqueries),
  label manipulation, WITH templates, keep_metric_names modifier, multiple-or filters, and query
  API enhancements. Invoke whenever task involves any interaction with MetricsQL or VictoriaMetrics
  queries — writing, debugging, optimizing, migrating PromQL to VictoriaMetrics, or reviewing.
---

# MetricsQL

VictoriaMetrics PromQL superset. Syntactically backwards-compatible; **semantically different** for a subset of queries.
Lead with the diffs — that's where users get burned. PromQL fundamentals live in the sibling `promql` skill; this covers
only what PromQL doesn't.

## References

- **Behavioral diffs from PromQL** — [`${CLAUDE_SKILL_DIR}/references/behavioral-diffs.md`]
  `rate`/`increase`/`delta`/`changes` diffs, `_prometheus`-suffixed variants, scalar/instant-vector unification, NaN
  handling, name retention, implicit conversions, auto-aligned subqueries, `default_rollup` lookback, staleness markers.
- **MetricsQL-only extensions** — [`${CLAUDE_SKILL_DIR}/references/extensions.md`] Rollup family, `WITH` templates,
  multiple-`or` filters, `default`/`if`/`ifnot` ops, `group_left(*) prefix`, `keep_metric_names`, `[Ni]` step, numeric
  suffixes, aggregate `limit N`, `boundsLabel`, fractional durations, Graphite, multi-line.
- **Full function catalog** — [`${CLAUDE_SKILL_DIR}/references/functions-catalog.md`] All rollup, transform,
  label-manipulation, aggregate functions by category, with PromQL/MetricsQL provenance.
- **Query API enhancements** — [`${CLAUDE_SKILL_DIR}/references/api-enhancements.md`] `extra_label`, `extra_filters[]`,
  `round_digits`, `limit`, timestamp formats, `stats` response, cluster vmselect URL layout, multi-tenancy.

Read the relevant reference before proceeding.

## What MetricsQL Is

- **Strict syntactic superset** of PromQL — every valid PromQL parses as MetricsQL.
- **Not** semantic superset — `rate`, `increase`, `delta`, `changes` differ.
- `_prometheus`-suffixed variants give byte-parity: `rate_prometheus`, `increase_prometheus`, `delta_prometheus`,
  `changes_prometheus`.
- Implemented by `vmselect` (cluster) or single-node binary; exposed via standard `/api/v1/query` and
  `/api/v1/query_range`.

## The Five Behavioral Diffs That Bite

1. **Lookbehind anchor.** `rate`/`increase` use the **last sample before** the window for the first delta; Prometheus
   doesn't. For `increase(metric[$__interval])` on a slow counter, Prometheus loses one delta per window. Use
   `rate_prometheus`/`increase_prometheus` for parity.
2. **No extrapolation.** Returns actual measured delta; Prometheus extrapolates to window edges, producing fractional
   results from integer counters. Affects alerts comparing `increase()` to integer thresholds.
3. **Scalar = instant vector without labels.** Prometheus's scalar/instant-vector distinction collapses.
   `scalar(metric)` coercion rarely needed; arithmetic on aggregation results works.
4. **NaN drop.** `(-1)^0.5` returns empty in MetricsQL; Prometheus returns a NaN series. Grafana renders identically;
   programmatic consumers see different shapes.
5. **Metric names retained for safe functions.** `min_over_time(foo)`, `round(foo)`, `abs(foo)` keep `foo`. Prometheus
   strips.

Full mechanics, edge cases, implicit-conversion pipeline, per-function table:
[`${CLAUDE_SKILL_DIR}/references/behavioral-diffs.md`].

## Lookbehind Window — Auto-Selection

Omitting `[d]` is allowed:

- `default_rollup` and `rate`: `max(step, scrape_interval)` — prevents gaps when `step < scrape_interval`.
- All other rollups: `step` (`$__interval` in Grafana, `1i`).
- `rate(node_network_receive_bytes_total)` ≡ `rate(node_network_receive_bytes_total[$__interval])`.

**Silent** behavior change across panels with different steps. For alerting and recording rules, **always specify the
window explicitly**.

## Implicit Query Conversions

VictoriaMetrics rewrites every query before evaluation (unless `-search.disableImplicitConversion`):

- Bare selectors → `default_rollup`: `foo` → `default_rollup(foo)`.
- Selectors inside transform/aggregate get the same wrap: `abs(temperature)` → `abs(default_rollup(temperature))`,
  `count(up)` → `count(default_rollup(up))`.
- Rollups on non-selectors become subqueries: `rate(sum(up))` → `rate((sum(default_rollup(up)))[1i:1i])`.
- Subqueries with missing step get `1i`: `avg_over_time(rate(m[5m])[1h])` → `avg_over_time(rate(m[5m])[1h:1i])`.

When debugging, mentally apply these first — the actual computation may differ from what was typed.

Full conversion list with disable flags: [`${CLAUDE_SKILL_DIR}/references/behavioral-diffs.md`].

## The Rollup Family — MetricsQL-Only

- **`rollup(m[d])`** — min/max/avg with `rollup="..."` label.
- **`rollup_rate(m[d])`** — per-second rate min/max/avg over adjacent samples; better than `irate` for spike detection.
- **`rollup_increase(m[d])`** / **`rollup_delta(m[d])`** / **`rollup_deriv(m[d])`** — same pattern.
- **`rollup_candlestick(m[d])`** — OHLC.
- **`aggr_over_time(("func1","func2",...), m[d])`** — multiple rollups in one pass.

Pair with `keep_metric_names` to preserve the original name.

## keep_metric_names

Functions and binary ops strip the metric name. This causes `duplicate time series` errors when distinct names collapse
into the same label set. Suffix with `keep_metric_names`:

- `rate({__name__=~"foo|bar"}) keep_metric_names`
- `({__name__=~"foo|bar"} / 10) keep_metric_names`

Available on all rollups, transforms, and binary operators.

## Multiple `or` in Series Selectors

PromQL `{env="prod",job="a"}` is a single AND. MetricsQL adds top-level disjunction:

```
{env="prod",job="a" or env="dev",job="b"}
```

Each `or`-group is an AND of matchers. Compose with comma within a group.

Multi-constant matching: `status_code == (300, 301, 304)` returns series where `status_code` is any listed value.

## WITH Templates

Reusable named subexpressions:

```
WITH (
  errs = rate(http_requests_total{status=~"5.."}[5m]),
  total = rate(http_requests_total[5m]),
)
sum(errs) by (job) / sum(total) by (job)
```

String concat: `WITH (commonPrefix="my_app_") {__name__=commonPrefix+"errors_total"}`. Expanded at parse time.

## Binary Operators Beyond PromQL

- **`q1 default q2`** — fills gaps in `q1` from `q2`.
- **`q1 if q2`** — keeps `q1` where `q2` has a value (conditional masking).
- **`q1 ifnot q2`** — keeps `q1` where `q2` has no value (inverse).

Compose with `default`-on-missing: `(up{job="x"} default 0) == 0` reliably alerts on disappearing targets.

## group_left(\*) and Label Copy

```
kube_pod_info * on(namespace) group_left(*) prefix "ns_" kube_namespace_labels
```

Copies **all** labels from right side except those in `on(...)`, prefixed with `ns_`. `group_right(*)` mirrors. Without
`prefix`, collisions error.

## Aggregate `limit N`

```
sum(http_requests_total) by (path) limit 10
```

Returns 10 paths total. Other series dropped silently. Distinct from `topk(10, ...)`: `limit N` is order-arbitrary;
`topk` keeps the top by value.

## Grafana `$__interval` and `[Ni]` Syntax

- `1i` = one step (Grafana `step` arg).
- `[10i]` = lookbehind covering ten steps.
- `offset 5i` = shift back five steps.
- Works in rollup windows, offsets, subquery step: `rate(metric[10i] offset 5i)`.
- Use over hard-coded durations so panels scale with the time range.

## Cluster Endpoint Structure

```
http://<vmselect>:8481/select/<accountID>/prometheus/api/v1/query
http://<vmselect>:8481/select/<accountID>/prometheus/api/v1/query_range
```

`<accountID>` is `accountID` or `accountID:projectID` (32-bit ints). Single-node uses unprefixed `/api/v1/query`.
`/prometheus/` prefix is optional but explicit.

Full URL layout (ingestion, federation, Graphite, vmstorage admin, vmalert proxy):
[`${CLAUDE_SKILL_DIR}/references/api-enhancements.md`].

## Query API Enhancements

- **`extra_label=<name>=<value>`** — adds `{name="value"}` to every selector. Repeatable. Used by auth proxies for
  tenant scoping.
- **`extra_filters[]=<selector>`** — adds a full selector with regex support: `extra_filters[]={env=~"prod|staging"}`.
- **`round_digits=N`** — rounds response values to N decimals.
- **`limit=N`** on `/api/v1/labels`, `/api/v1/label/<name>/values`, `/api/v1/series`.

Responses include `stats` with `executionTimeMsec` and `seriesFetched`. `seriesFetched` is approximate; vmalert uses it
to flag never-firing rules.

## Syntax Conveniences

- **Underscore in numbers** — `1_234_567_890` ≡ `1234567890`
- **Numeric suffixes** — `8K` (8000), `1.2Mi` (1.2×1024²), supports `K Ki M Mi G Gi T Ti`
- **Fractional durations** — `[1.5m]`, `offset 0.5d`
- **Optional duration suffix** — `[300]` is seconds: `rate(m[300] offset 1800)` ≡ `rate(m[5m]) offset 30m`
- **Duration anywhere** — `sum_over_time(m[1h]) / 1h` ≡ `sum_over_time(m[1h]) / 3600`
- **Trailing commas** — `m{foo="bar",}`, `f(a, b,)`, `WITH (x=y,) x` all valid. Use in multi-line queries.
- **Unicode in names** — `ტემპერატურა{πόλη="Київ"}` is valid
- **Escape sequences** — `foo\-bar{baz\=aa="b"}`, `\xXX`, `\uXXXX`
- **`@ modifier` anywhere** — `sum(foo) @ end()`, `foo @ (end() - 1h)`

## Histogram Extensions

`histogram_quantile(phi, buckets, boundsLabel?)` — optional third arg returns `lower`/`upper` bounds in `boundsLabel`.
For plotting quantile confidence intervals.

`histogram_over_time(gauge[d])` produces VictoriaMetrics-format histograms from gauge values:

```
histogram_quantile(0.5, sum(histogram_over_time(temperature[24h])) by (vmrange,country))
```

Computes quantiles over gauge distributions without re-instrumenting.

## Application

When **writing**:

- Omit lookbehind only when panel-wide `$__interval` is appropriate. Otherwise use `[5m]` or `[Ni]` explicitly.
- For alerting/recording rules: **always specify the lookbehind window**. Implicit selection couples rule behavior to
  evaluation interval.
- Prefer `default` over `or vector(0)` — more readable, handles labels correctly.
- Use `rollup_rate` for counter spike detection over `irate` — min/max/avg in one query.

When **migrating from Prometheus**:

- Audit alerts comparing `increase()` to integer thresholds — exact integers may fire differently.
- Use `*_prometheus` variants only when byte-parity is required (cross-backend SLO consistency).
- Enable `-search.logImplicitConversion` to see rewrites.

When **reviewing**:

- Flag missing lookbehind windows in alerting/recording rules.
- Flag `rate(sum(...))` — silent subquery formation.
- Flag bare selectors in arithmetic — silent `default_rollup` wrap.
- Cite the specific diff and show the fix inline.

## Integration

**promql** — shared fundamentals (selectors, operators, aggregations, vector matching). This skill — MetricsQL
extensions and diffs.

**prometheus** — instrumentation; this skill — query-time behavior.
