# Selectors and Data Types

PromQL expression types, selector syntax, label matchers, time durations, and time-shift modifiers. These primitives
determine what reaches operators and functions.

## Contents

- [Expression Data Types](#expression-data-types)
- [Instant Vector Selectors](#instant-vector-selectors)
- [Range Vector Selectors](#range-vector-selectors)
- [Time Durations](#time-durations)
- [Offset Modifier](#offset-modifier)
- [@ Modifier](#-modifier)
- [Staleness and Lookback Delta](#staleness-and-lookback-delta)
- [Instant vs Range Queries](#instant-vs-range-queries)
- [String and Float Literals](#string-and-float-literals)

---

## Expression Data Types

Every PromQL expression evaluates to one of four types. Functions and operators require specific input/output types —
type mismatch is the most common source of query errors.

- **instant vector** — set of time series, one sample per series, all at the same timestamp. Produced by metric name
  selectors, aggregations, most functions.
- **range vector** — set of time series with a range of samples per series. Produced only by range vector selectors
  (`metric[5m]`) and subqueries (`expr[5m:1m]`).
- **scalar** — single float, no labels. Numeric arguments (`histogram_quantile(0.9, ...)`, `topk(3, ...)`) and
  arithmetic.
- **string** — single string. Function arguments only (`label_join`, `count_values`); cannot be a top-level result.

**Range vectors cannot be graphed directly.** They must pass through a function returning an instant vector (`rate()`,
`avg_over_time()`, etc.) before appearing as a result over time.

**Type rules:**

- Counter functions (`rate`, `irate`, `increase`) — range vector → instant vector
- `histogram_quantile()` — scalar + instant vector → instant vector
- `predict_linear`, `deriv`, `delta` — range vector → instant vector
- Aggregation operators (`sum`, `avg`, `max`) — instant vector → instant vector
- Range queries accept instant-vector or scalar expressions; instant queries accept any type

## Instant Vector Selectors

Select the latest sample for each matching series within the lookback window.

```promql
http_requests_total                                    # all series by metric name
http_requests_total{job="api"}                         # filter by label
http_requests_total{job="api", method="GET"}           # multiple matchers (AND)
{__name__=~"http_.*"}                                  # regex on metric name
```

### Label Matchers

- `=` exact match
- `!=` not equal
- `=~` regex match (RE2 syntax, fully anchored — `"foo"` becomes `"^foo$"`)
- `!~` negative regex match

### Empty-Value Matching

A matcher that matches the empty string also matches series that do not have the label set at all.

```promql
http_requests_total{environment=""}    # matches series with no environment label OR environment=""
```

### Multiple Matchers on Same Label

All matchers must pass — they combine with AND, not OR.

```promql
http_requests_total{replica!="rep-a", replica=~"rep.*"}    # rep-b, rep-c, etc. but not rep-a
```

### Required Selectors

A selector must have at least one matcher that does not match the empty string. Pure-empty matchers are illegal — they
could match every series in the database.

```promql
{job=~".*"}                # ILLEGAL — matches empty values, no constraint
{job=~".+"}                # OK — requires non-empty
{job=~".*", method="GET"}  # OK — has at least one constraint
```

### Metric Name as Label

The metric name is stored internally as the `__name__` label. Use this for regex matching against metric names.

```promql
http_requests_total                  # equivalent to {__name__="http_requests_total"}
{__name__=~"job:.*"}                 # all metrics with names starting with "job:"
{__name__="on"}                      # workaround when name conflicts with keywords (on, ignoring, etc.)
```

Reserved keywords that cannot be used as bare metric names: `bool`, `on`, `ignoring`, `group_left`, `group_right`.

## Range Vector Selectors

Append `[duration]` to a vector selector to fetch all samples in the window.

```promql
http_requests_total[5m]
http_requests_total{job="api"}[1h]
```

**Window semantics:** left-open, right-closed. Left boundary excluded; right boundary included.

Not directly graphable — pass to range-vector functions (`rate`, `avg_over_time`, `delta`, `deriv`, `predict_linear`,
`*_over_time`, etc.).

## Time Durations

One or more integer-unit pairs concatenated, longest unit to shortest. Each unit at most once. No floats.

- `ms` — milliseconds
- `s` — seconds
- `m` — minutes
- `h` — hours
- `d` — days (24h, ignoring DST)
- `w` — weeks (7d)
- `y` — years (365d, ignoring leap days)

Valid combinations:

```promql
5m
1h30m
12h34m56s
54s321ms
```

Invalid:

```promql
1.5h        # floats not allowed with units — use 1h30m
5m30s10m    # duplicate unit (m)
30s1m       # wrong order — must go longest to shortest
```

Durations are equivalent to bare float seconds — `5m` equals `300`.

## Offset Modifier

Time-shift a selector into the past (or, with negative offset, the future).

```promql
http_requests_total offset 5m                       # value 5 minutes ago
rate(http_requests_total[5m] offset 1w)             # rate as it was one week ago
rate(http_requests_total[5m] offset -1w)            # rate one week into the future (look-ahead)
```

**Placement rule:** `offset` must immediately follow the selector. It cannot appear outside an aggregation.

```promql
sum(http_requests_total{method="GET"} offset 5m)    # CORRECT — offset on selector
sum(http_requests_total{method="GET"}) offset 5m    # INVALID
```

**Use cases:**

- Week-over-week: `rate(x[5m]) - rate(x[5m] offset 1w)`
- Comparing today's traffic to yesterday's
- Detecting trend changes against historical baseline

## @ Modifier

Pin a selector to a specific Unix timestamp regardless of query evaluation time.

```promql
http_requests_total @ 1609746000                    # value at 2021-01-04T07:40:00Z
rate(http_requests_total[5m] @ 1609746000)
http_requests_total @ start()                       # value at start of range query
rate(http_requests_total[5m] @ end())               # rate evaluated at end of range query
```

`start()` and `end()` resolve to the range query's start and end. For instant queries, both resolve to the evaluation
time.

Combines with `offset` — order is interchangeable; offset is relative to the `@` time:

```promql
http_requests_total @ 1609746000 offset 5m          # same as
http_requests_total offset 5m @ 1609746000
```

**"Value at the time of a peak":**

```promql
some_metric @ end() - some_metric @ start()         # absolute change over the range query window
```

## Staleness and Lookback Delta

Instant vector selectors return the most recent sample within the lookback window — 5 minutes by default. A series with
no sample in the window disappears from the result.

**Implications:**

- After a target stops being scraped, its series still appear for up to 5 minutes.
- Re-deploys with pod-name-in-label create coexisting old+new series for 5 minutes (double-count risk in `sum`).
- **Staleness markers** (special NaN values) cut off the 5-minute trail immediately when Prometheus detects a series
  ending.

**Tuning:** `--query.lookback-delta` globally, or `lookback_delta` URL parameter per-query.

**Diagnosis:** empty `rate()` over a short window usually means the range is shorter than the lookback delta and
contains fewer than two samples. Use `rate(x[5m])` or wider with the default 15s scrape interval.

## Instant vs Range Queries

Same language — the difference is the API call, not the expression.

- **Instant query** (`/api/v1/query`) — evaluates at one timestamp. Result can be any type: scalar, instant vector,
  range vector, string.
- **Range query** (`/api/v1/query_range`) — evaluates at every step between `start` and `end`. Result is always a range
  vector (stitched from per-step evaluations). Only scalar and instant-vector expressions are valid at the root.

A range query is conceptually many independent instant queries — no cross-step memory. A range vector selector inside a
range query selects relative to each step's evaluation time, not the query range.

**Terminology overlap:** "instant" and "range" describe both _query types_ and _vector selector types_. A range query
typically has instant-vector selectors at the root; a range-vector selector inside any query yields a range vector.

## String and Float Literals

### Strings

Three quoting styles, all following Go string escape rules (except backticks, which take no escapes):

```promql
"this is a string"
'these are unescaped: \n \\ \t'
`these are not unescaped: \n ' " \t`
```

Strings appear as arguments to functions like `label_join`, `label_replace`, `count_values`.

### Floats

Standard decimal/hex notation plus underscores for readability and special values:

```promql
23
-2.43
3.4e-9
0x8f
1_000_000
.123_456_789
NaN
Inf
-Inf
```
