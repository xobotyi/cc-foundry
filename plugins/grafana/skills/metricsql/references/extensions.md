# MetricsQL Extensions Over PromQL

Features with no PromQL equivalent. Avoid in queries that may be ported back to vanilla Prometheus.

## Contents

- [Series Selectors](#series-selectors)
- [Binary Operators](#binary-operators)
- [group_left(\*) / group_right(\*)](#group_left-group_right)
- [WITH Templates](#with-templates)
- [keep_metric_names](#keep_metric_names)
- [Aggregate Limit and Many-Args](#aggregate-limit-and-many-args)
- [Numeric and Duration Syntax](#numeric-and-duration-syntax)
- [Modifier Placement](#modifier-placement)
- [Histogram Extensions](#histogram-extensions)
- [Subqueries](#subqueries)
- [Graphite Compatibility](#graphite-compatibility)

---

## Series Selectors

### Multiple `or` Filters

```
{env="prod",job="a" or env="dev",job="b"}
```

Top-level `or` = disjunction of label-matcher groups. Within group: comma-separated AND. Across groups: set union.

Equivalent to `{env="prod",job="a"} or {env="dev",job="b"}` at the selector level, written compactly.

### Value Set Matching

```
status_code == (300, 301, 304)
status_code != (300, 301, 304)
```

Returns series where the value matches (or doesn't) any listed constant. Cleaner than
`status_code == 300 or status_code == 301 or status_code == 304`.

### Escape Sequences

```
foo\-bar{baz\=aa="b"}
```

Backslash-escapes special chars in names. `\xXX` for ASCII, `\uXXXX` for Unicode.

### Unicode

Identifiers can contain arbitrary Unicode letters:

```
ტემპერატურა{πόλη="Київ"}
```

Available for internationalized names; readability suffers.

---

## Binary Operators

### `default`

```
q1 default q2
```

Fills gaps in `q1` from matching series in `q2`. Chain for fallback:

```
metric_a default metric_b default 0
```

Replaces the awkward `metric_a or vector(0)` pattern. Handles labels correctly via vector matching.

### `if` and `ifnot`

- `q1 if q2` — keeps `q1` where `q2` has a sample.
- `q1 ifnot q2` — keeps `q1` where `q2` has **no** sample.

```
http_request_duration_seconds_sum if up == 1   # exclude periods when target was down
errors_total ifnot maintenance_mode            # exclude maintenance windows
```

### Keep-Metric-Names on Binary Ops

```
(rate(http_requests_total[5m]) / 1024) keep_metric_names
```

Preserves the metric name through binary ops; without it, names are stripped (Prometheus behavior).

---

## group_left(\*) / group_right(\*)

```
kube_pod_info * on(namespace) group_left(*) prefix "ns_" kube_namespace_labels
```

- `*` copies all labels from right side except those in `on(...)`.
- `prefix "ns_"` prepends to copied names; avoids collisions.
- Without `prefix`, collisions error at query time.

`group_right(*)` mirrors. Use case: enriching pod metrics with namespace labels without listing them.

---

## WITH Templates

```
WITH (
  total = rate(http_requests_total[5m]),
  errs = rate(http_requests_total{status=~"5.."}[5m]),
  ratio = sum(errs) by (job) / sum(total) by (job),
)
ratio > 0.01
```

Expanded at parse time — executed query is the substituted form. Readability gain, no runtime cost.

### String Concatenation

```
WITH (commonPrefix = "my_app_") {__name__=commonPrefix+"errors_total"}
```

For parameterizing dashboards over metric prefixes.

### Nested WITH

References to earlier definitions:

```
WITH (
  base = rate(http_requests_total[5m]),
  total = sum(base) by (job),
  errs = sum(base{status=~"5.."}) by (job),
)
errs / total
```

---

## keep_metric_names

Functions and arithmetic ops strip `__name__`. Prevents mislabeling when meaning changes, but causes
`duplicate time series` errors when distinct names collapse to the same label set.

- **Function call:** `rate({__name__=~"foo|bar"}[5m]) keep_metric_names`.
- **Binary expression:** `({__name__=~"foo|bar"} / 10) keep_metric_names`.

Available on all rollups, transforms, binary ops, and aggregates (via parenthesized form).

Trade-off: kept name may misrepresent new meaning (a `rate()` of `requests_total` is no longer requests_total). Use only
when the downstream needs the name and meaning is clear.

---

## Aggregate Limit and Many-Args

### `limit N`

```
sum(http_requests_total) by (path) limit 10
```

Caps post-aggregation series count. Other series dropped silently.

Distinct from `topk(10, ...)`:

- `topk` keeps 10 largest values.
- `limit N` keeps arbitrary 10 (implementation-defined order).

Use `limit` for high-cardinality safety nets; `topk` for ranked dashboards.

### Multiple Arguments

```
avg(q1, q2, q3)
```

Per-timestamp avg across all three queries. Available on `min`, `max`, `avg`, `sum`. Avoids `(q1 + q2 + q3) / 3`
verbosity.

---

## Numeric and Duration Syntax

### Underscores in Numbers

```
1_234_567_890
```

Readability separator. Equivalent to `1234567890`.

### Binary and Decimal Suffixes

| Suffix | Multiplier |
| :----- | :--------- |
| `K`    | 1000       |
| `Ki`   | 1024       |
| `M`    | 1000²      |
| `Mi`   | 1024²      |
| `G`    | 1000³      |
| `Gi`   | 1024³      |
| `T`    | 1000⁴      |
| `Ti`   | 1024⁴      |

`8K = 8000`, `1.2Mi = 1258291.2`.

### Fractional Durations

```
rate(metric[1.5m])
rate(metric offset 0.5d)
```

Any decimal fraction valid in duration positions.

### Optional Duration Suffix

Bare numbers = seconds:

```
rate(m[300] offset 1800)  ==  rate(m[5m]) offset 30m
```

### Duration as a Value

Durations anywhere a number is expected:

```
sum_over_time(m[1h]) / 1h  ==  sum_over_time(m[1h]) / 3600
```

`1h` evaluates to 3600.

### `[Ni]` Step-Relative Durations

`Ni` = N times current Grafana step:

```
rate(metric[10i] offset 5i)
```

10-step window, 5-step offset. Scales with dashboard time range. `1i` is most common.

---

## Modifier Placement

### `offset` Anywhere

```
sum(foo) offset 24h
```

PromQL requires `offset` immediately after the selector. MetricsQL accepts it anywhere in the chain.

### `@` Modifier Anywhere

```
sum(foo) @ end()
foo @ (end() - 1h)
```

Evaluates at the named timestamp. `end()`, `start()`, `now()` return range end, beginning, wall clock. Arbitrary
subexpressions valid.

### Trailing Commas

```
m{foo="bar",}
f(a, b,)
WITH (x=y,) x
```

All valid. Helps multi-line editing.

---

## Histogram Extensions

### `histogram_quantile` with boundsLabel

```
histogram_quantile(0.95, rate(metric_bucket[5m]), "bound")
```

Optional third arg = label name. Result gains `{bound="lower"}` and `{bound="upper"}` for confidence interval. For
plotting "p95 ± uncertainty."

### `histogram_over_time`

```
histogram_over_time(gauge_metric[24h])
```

VictoriaMetrics-format histograms from gauge values. Pair with `histogram_quantile`:

```
histogram_quantile(0.5, sum(histogram_over_time(temperature[24h])) by (vmrange, country))
```

Median temperature by country over 24h, no histogram instrumentation needed.

### `histogram_quantiles` (Plural)

```
histogram_quantiles("phi", 0.5, 0.95, 0.99, rate(metric_bucket[5m]))
```

One series per quantile with `phi` label. Cheaper than three `histogram_quantile` calls — buckets scanned once.

---

## Subqueries

```
max_over_time(rate(http_requests_total[5m])[1h:30s])
```

Extensions:

- **Step omission** — `[1h]` instead of `[1h:1m]`; defaults to `1i`.
- **Nested via implicit conversion** — `delta(sum(m))` becomes a subquery automatically.
- **Disable** with `-search.disableImplicitConversion` if implicit formation hurts perf.

Inner rollup uses outer step; outer uses query `step`. Deterministic, cacheable.

---

## Graphite Compatibility

```
{__graphite__="foo.*.bar"}
```

Graphite-style metric path matching against ingested Graphite metrics. Plus `label_graphite_group()` extracts dotted
segments into labels. Makes VictoriaMetrics usable as a Graphite datasource.
