# Operators

Binary operators, vector matching, aggregation, operator precedence. Vector matching is the most error-prone area of
PromQL — most "no results returned" mistakes trace to mismatched label sets.

## Contents

- [Arithmetic Operators](#arithmetic-operators)
- [Comparison Operators](#comparison-operators)
- [Logical/Set Operators](#logicalset-operators)
- [Trigonometric and Histogram Trim Operators](#trigonometric-and-histogram-trim-operators)
- [Vector Matching](#vector-matching)
- [One-to-One Matching](#one-to-one-matching)
- [Many-to-One and One-to-Many](#many-to-one-and-one-to-many)
- [Fill Modifiers](#fill-modifiers)
- [Aggregation Operators](#aggregation-operators)
- [`by` vs `without`](#by-vs-without)
- [Operator Precedence](#operator-precedence)

---

## Arithmetic Operators

`+`, `-`, `*`, `/`, `%`, `^` — IEEE 754 floating point (`NaN`, `+Inf`, `-Inf`).

Defined between:

- **scalar/scalar** → scalar
- **vector/scalar** — applied to every sample in the vector
- **vector/vector** — applied to matching pairs (see [Vector Matching](#vector-matching))

**Metric name is dropped** from vector arithmetic. Labels of the matched pair survive (per matching rules).

```promql
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / 1024 / 1024     # MiB in use
demo_cpu_usage_seconds_total * 100                                              # vector × scalar
```

## Comparison Operators

`==`, `!=`, `>`, `<`, `>=`, `<=`

**Default is to filter** — series for which the comparison is false (or have no match) drop from the result. Original
sample values are preserved for surviving series.

```promql
http_requests_total > 100                                # series whose latest value > 100
node_filesystem_avail_bytes > 10*1024*1024              # files with > 10 MiB free
go_goroutines > go_threads                              # series where goroutines exceed threads
```

### `bool` Modifier

Add `bool` after the operator to return `0` or `1` instead of filtering. Required when comparing two scalars.

```promql
http_requests_total > bool 100                          # 1 if >100, 0 otherwise (all series kept)
go_goroutines > bool on(job, instance) go_threads       # boolean over matched pairs
```

With `bool`, the metric name is dropped. Without `bool`, the metric name from the LHS is retained (unless `on` is used,
in which case the name drops; or `group_right` is used, in which case the RHS name is kept).

## Logical/Set Operators

Only between two instant vectors. Ignore sample values — operate purely on label-set membership.

- `vector1 and vector2` — intersection: elements of `vector1` with an exact label match in `vector2`. Values from
  `vector1`.
- `vector1 or vector2` — union: all of `vector1`, plus elements of `vector2` whose labels don't match anything in
  `vector1`.
- `vector1 unless vector2` — complement: elements of `vector1` with no match in `vector2`.

```promql
up{job="prometheus"} or up{job="node"}                              # union of two selectors
node_network_mtu_bytes and (node_network_address_assign_type == 0) # MTUs only for fixed-IP interfaces
node_network_mtu_bytes unless (node_network_address_assign_type == 1) # MTUs excluding DHCP interfaces
```

Set operators can be constrained with `on(labels)` to match only on a subset of labels:

```promql
node_network_mtu_bytes and on(device) (node_network_address_assign_type == 0)
```

`group_left` / `group_right` are NOT used with set operators — they match all entries on either side by default.

## Trigonometric and Histogram Trim Operators

- **`atan2`** — binary trigonometric operator; float samples only. Enables `atan2` with vector matching (unlike unary
  `atan()`).
- **`</`** (trim upper) — remove observations above a threshold from a native histogram.
- **`>/`** (trim lower) — remove observations below a threshold from a native histogram.

Niche — common arithmetic and comparison operators cover almost all use cases.

## Vector Matching

For `vectorA <op> vectorB`, PromQL must decide which left series matches which right series. **Default: two elements
match if they have exactly the same label set** (after the metric name drops). Unmatched series disappear from the
result.

This default fails when operands have different label sets — e.g., an error counter labeled by `code` vs. a request
counter without it. Matching keywords solve this.

### Matching Keywords

- **`on(label1, label2, ...)`** — match only on these labels.
- **`ignoring(label1, label2, ...)`** — match on all labels except these.

Mutually exclusive in a single operation. Pick whichever requires the shorter list.

### Group Modifiers (Many-to-One / One-to-Many)

- **`group_left(extra_labels)`** — many entries on the left match one on the right; copy the listed extra labels from
  the right into the result.
- **`group_right(extra_labels)`** — symmetric; right is "many", left is "one".

`extra_labels` is optional. Without it, no labels are added — only the matching becomes many-to-one.

Only with arithmetic, comparison, and trigonometric operators. Not with set operators.

## One-to-One Matching

Each left element has at most one matching right element.

```promql
# Default: full label-set equality
node_memory_MemFree_bytes + node_memory_Cached_bytes

# Restrict matching to specific labels
node_memory_MemFree_bytes + on(instance, job) node_memory_Cached_bytes

# Ignore certain labels when matching
method_code:http_errors:rate5m{code="500"} / ignoring(code) method:http_requests:rate5m
```

**Error ratio pattern** — canonical one-to-one match where one vector has an extra label:

```promql
# Errors carry a `code` label; total requests do not. Ignore `code` to match.
method_code:http_errors:rate5m{code="500"} / ignoring(code) method:http_requests:rate5m
```

If both sides already have the same label set (e.g., both only `method`), the default matcher works without `on` or
`ignoring`.

## Many-to-One and One-to-Many

When one side matches multiple on the other — e.g., dividing every error series (one per status code) by total requests
(one per method).

```promql
method_code:http_errors:rate5m / ignoring(code) group_left method:http_requests:rate5m
```

Produces error ratios for each `(method, code)`, reusing the same `method:http_requests:rate5m` across `code` values.

**Copying labels from the "one" side into the result:**

```promql
node_filesystem_avail_bytes * on(instance, job) group_left(version) node_exporter_build_info
```

Joins filesystem metrics with `node_exporter_build_info` (info-style metric carrying `version`), bringing `version` into
the result. Canonical "join an info metric" pattern.

**`info()` function (experimental)** offers simpler syntax for this. See [`functions.md`](functions.md).

## Fill Modifiers

Experimental — must be enabled with `--enable-feature=promql-binop-fill-modifiers`.

By default, unmatched series are dropped. Fill modifiers substitute a value when one side has no match.

- `fill(<value>)` — fill missing on either side
- `fill_left(<value>)` — fill missing on left
- `fill_right(<value>)` — fill missing on right

```promql
method_code:http_errors:rate5m{status="500"} / ignoring(code) fill(0) method:http_requests:rate5m
```

Cannot fill series missing on **both** sides. Cannot be used with set operators.

## Aggregation Operators

Instant vector → instant vector with fewer elements. Aggregate over all dimensions, or preserve specific ones with `by`
/ `without`.

Syntax (either order is valid):

```promql
<aggr>[by|without (labels)](<vector>)
<aggr>(<vector>)[by|without (labels)]
```

### Catalog

- **`sum(v)`** — sum across dimensions
- **`avg(v)`** — arithmetic mean
- **`min(v)`** / **`max(v)`** — extremes
- **`count(v)`** — count of series
- **`count_values(label, v)`** — for each unique sample value, output one series labeled with that value; sample value
  is the count of how many input series had that value. Useful for distribution of build versions, status codes, etc.
- **`group(v)`** — returns `1` for each group; existence-only aggregation
- **`stddev(v)`** / **`stdvar(v)`** — population standard deviation / variance
- **`quantile(φ, v)`** — φ-quantile across the input series (not over time — for time use `quantile_over_time`)
- **`topk(k, v)`** — k series with the largest values (preserves labels)
- **`bottomk(k, v)`** — k series with the smallest values
- **`limitk(k, v)`** — pseudo-random sample of k series (experimental)
- **`limit_ratio(r, v)`** — pseudo-random sample of fraction `r` of series; negative `r` selects complement
  (experimental)

### `topk` / `bottomk` Gotchas

Unlike other aggregators — return a subset of input series with original labels and values. Sort by value, do not
aggregate values.

- Instant queries: results sorted by value (desc for topk, asc for bottomk).
- Range queries: **no sorting** — series in fixed order. Use `topk` in instant queries or alerts, not to order a Grafana
  graph.
- `by` and `without` bucket the input — top-k is computed within each bucket.

### `count_values` Pattern

For a histogram-like distribution of an integer/categorical sample value:

```promql
count_values("version", build_version)
# => {version="1.2.0"} 14
#    {version="1.2.1"} 7
#    {version="1.3.0"} 3
```

## `by` vs `without`

Both reduce dimensions, opposite semantics:

- `by (labels)` keeps **only** the listed labels
- `without (labels)` keeps **everything except** the listed labels

**Prefer `without`** for most aggregations — preserves labels like `job` and `instance` automatically, avoiding the trap
of stripping useful labels when you meant to remove one dimension.

```promql
sum without (instance) (rate(http_requests_total[5m]))    # preserves job, method, status, etc.
sum by (job, method) (rate(http_requests_total[5m]))      # strips everything except job, method
```

`by` is correct when you want to collapse to a known dimension set (e.g., recording rule defining output identity).
`without` is correct when removing a noise dimension and keeping the rest.

**Special case:** classic histogram quantile aggregation always needs `le` preserved.

```promql
histogram_quantile(0.9, sum by (job, le) (rate(http_request_duration_seconds_bucket[5m])))
histogram_quantile(0.9, sum without (instance, pod) (rate(http_request_duration_seconds_bucket[5m])))
```

`without` is safer — drop the labels you don't want, automatically keep `le` and everything else.

## Operator Precedence

Highest to lowest:

1. `^`
2. `*`, `/`, `%`, `atan2`
3. `+`, `-`
4. `==`, `!=`, `<=`, `<`, `>=`, `>`
5. `and`, `unless`
6. `or`

Same-precedence operators are **left-associative**, except `^` (right-associative): `2 ^ 3 ^ 2 = 2 ^ (3 ^ 2) = 512`, not
`(2 ^ 3) ^ 2 = 64`.

**Common pitfall:**

```promql
# Looks like: "errors > 0 AND uptime exists"
errors_total > 0 and up
# Parses as: (errors_total > 0) and up — comparison binds tighter than `and`.
```

Use parentheses liberally when mixing comparison and logical operators.
