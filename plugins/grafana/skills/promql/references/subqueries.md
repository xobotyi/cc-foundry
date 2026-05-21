# Subqueries

Embed a range query inside an instant query, producing a range vector from an arbitrary expression rather than only from
a raw selector. Used when a range-vector function needs already-aggregated or transformed input.

## Contents

- [Syntax](#syntax)
- [When to Use a Subquery](#when-to-use-a-subquery)
- [Resolution and Alignment](#resolution-and-alignment)
- [Nested Subqueries](#nested-subqueries)
- [Subqueries vs Recording Rules](#subqueries-vs-recording-rules)
- [Pitfalls](#pitfalls)

---

## Syntax

```
<instant-vector-expression> '[' <range> ':' [<resolution>] ']' [ @ <timestamp> ] [ offset <duration> ]
```

- `<range>` — how far back to evaluate the inner expression
- `<resolution>` — step between evaluations within the range; optional. Defaults to the global evaluation interval.
- `@` and `offset` — same as on a selector

Example:

```promql
rate(http_requests_total[5m])[1h:]                  # 5m-averaged rate sampled over the last hour at default resolution
rate(http_requests_total[5m])[1h:15s]               # same, but with explicit 15s resolution
```

A subquery returns a range vector — exactly what range-vector functions (`max_over_time`, `avg_over_time`,
`quantile_over_time`, `predict_linear`, `deriv`, etc.) need.

## When to Use a Subquery

When **a range-vector function needs the output of another function or aggregation as input** — situations a raw
selector with `[5m]` cannot serve.

### Pattern: aggregate-then-aggregate over time

"Peak 5-minute request rate over the last hour?"

```promql
max_over_time(
  rate(http_requests_total[5m])[1h:]
)
```

`rate()` produces an instant vector; `max_over_time(rate(http_requests_total[5m])[1h])` won't parse — the outer `[1h]`
needs a range vector of `rate()` outputs, which only a subquery produces.

### Pattern: SLO over a recording-rule-free metric

"Fraction of 5-minute windows over the last day with error rate above 1%?"

```promql
avg_over_time((
  sum(rate(errors[5m])) / sum(rate(requests[5m])) > bool 0.01
)[1d:5m])
```

### Pattern: derivative of a rate

"Is the request rate accelerating or decelerating?"

```promql
deriv(rate(http_requests_total[5m])[30m:])
```

### Pattern: quantile across time

"99th percentile of per-minute error rates over the last day?"

```promql
quantile_over_time(0.99, rate(errors_total[1m])[1d:])
```

## Resolution and Alignment

Resolution determines how many points the subquery generates within the range. Default is the global rule evaluation
interval (commonly 15s or 1m, set by `evaluation_interval`).

`[1h:1m]` evaluates the inner expression at 60 timestamps. `[1h:15s]` evaluates at 240 — 4× more work for the same
range.

**Alignment rule:** subquery steps are aligned **independently of the surrounding query's evaluation time**. Steps are
anchored to `t=0` (Unix epoch). With outer step 3s and subquery resolution 5s, subquery output uses the same sample
timestamps regardless of which 3s step is being evaluated.

**Consequence:** an instant query at `t=100` and a range-query step at `t=100` see the **same** subquery output. This
preserves the principle that range queries are syntactic sugar over many independent instant queries.

**Practical implication:** changing the outer query's step does not affect the subquery's internal sampling — only how
often the **subquery itself** is evaluated. A high-resolution subquery is expensive regardless of the outer query.

## Nested Subqueries

Subqueries can nest. The inner subquery's "now" is the outer subquery's evaluation step.

```promql
max_over_time(
  deriv(
    rate(distance_covered_total[5s])[30s:5s]
  )[10m:]
)
```

This computes:

1. The inner `rate(distance_covered_total[5s])` runs every 5s over the 30s window.
2. `deriv()` applies linear regression across those 6 rate samples.
3. The outer subquery runs `deriv()` repeatedly across the last 10m at default resolution.
4. `max_over_time()` picks the largest derivative.

Nested subqueries are powerful but expensive. Each level multiplies the work — `[1h:1m]` containing `[5m]` evaluates the
inner expression at 60 timestamps, each consuming 5 minutes of samples. Recording rules are usually a better choice for
production.

## Subqueries vs Recording Rules

Subqueries solve the same problem as recording rules — pre-computing intermediates — but at query time instead of
scheduled intervals.

**Use a subquery when:**

- Ad-hoc query (exploration, debugging, one-off dashboards)
- You don't want to wait for recording-rule data to accumulate
- The inner expression is cheap

**Use a recording rule when:**

- The expression is expensive (large cardinality, deep aggregation, long ranges)
- The query is in a frequently-refreshed dashboard
- Multiple alerts or dashboards consume the same intermediate result
- The query runs in an alert evaluation (subqueries in alerts re-do the work every cycle)

**Avoid subqueries inside recording rules.** If you need one, split it: define a recording rule for the intermediate
result, then a second rule that consumes it.

```yaml
# BAD — subquery inside a recording rule
- record: job:rate5m:max_over_time1h
  expr: max_over_time(sum by (job) (rate(http_requests_total[5m]))[1h:])

# GOOD — split into two rules
- record: job:requests:rate5m
  expr: sum by (job) (rate(http_requests_total[5m]))
- record: job:requests:rate5m_max1h
  expr: max_over_time(job:requests:rate5m[1h])
```

## Pitfalls

### Subqueries are expensive

The inner expression runs at every subquery step. `[1d:1m]` executes 1,440 times per query evaluation. Check that the
inner expression operates on a manageable cardinality.

### Resolution too coarse

If the resolution exceeds the inner range vector's `[X]`, the inner function may return NaN or empty.
`rate(x[5m])[1h:10m]` — each 10m step runs `rate(x[5m])`, sees 5 minutes of data, fine. `rate(x[1m])[1h:10m]` could miss
samples.

### Resolution and range mismatch

Outer step 30s and subquery resolution 25s: alignment differences mean each outer step sees slightly different subquery
output. By design (alignment anchored to t=0), but produces counter-intuitive graph artifacts on small ranges.

### `@` modifier with subqueries

```promql
some_metric[1h:1m] @ end()
```

Pins the subquery to the end of the range query. Useful for "same window in every step" patterns, but defeats the
purpose of a range query — usually you want per-step evaluation.

### Cannot subquery a range vector

```promql
http_requests_total[5m][1h:]    # INVALID
```

Inner must be an **instant vector**. Wrap in a function first:

```promql
rate(http_requests_total[5m])[1h:]    # OK
```
