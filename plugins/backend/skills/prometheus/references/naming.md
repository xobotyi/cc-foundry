# Naming Conventions

Naming is the contract between instrumentation and consumption. A well-named metric is self-documenting — someone
unfamiliar with the system should guess what it measures.

## Metric Name Structure

```
<namespace>_<subsystem>_<name>_<unit>_<suffix>
```

- **namespace** — Application or domain prefix: `http`, `myapp`, `process`
- **subsystem** — Component within the application: `request`, `db`, `cache`
- **name** — What is being measured: `duration`, `size`, `total`
- **unit** — Base unit in plural: `seconds`, `bytes`, `meters`
- **suffix** — Type indicator: `_total` for counters, `_info` for info metrics

Not all parts are required. The minimum is namespace + meaningful name + unit/suffix.

## Rules

### Character Set

- Use `[a-zA-Z_:][a-zA-Z0-9_:]*` for maximum compatibility
- Prefer `snake_case` — lowercase with underscores
- Colons (`:`) are reserved for recording rules — never in direct instrumentation
- Prefixes `__` (double underscore) are reserved for Prometheus internals

### Application Prefix

Every metric MUST have a namespace prefix identifying its origin:

```
prometheus_notifications_total       # Prometheus server metrics
process_cpu_seconds_total            # Standard process metrics
http_request_duration_seconds        # Generic HTTP metrics
myapp_orders_processed_total         # Application-specific metrics
```

### Base Units

Always use base units. Let visualization tools handle conversion.

- `time`: seconds — not milliseconds, microseconds
- `data size`: bytes — not kilobytes, megabytes
- `temperature`: celsius — not fahrenheit
- `length`: meters — not kilometers
- `mass`: grams — not kilograms
- `percent`: ratio (0-1) — not percentage (0-100)
- `energy`: joules — not watts (export joules counter, compute power via `rate()`)

### Unit Suffix

Append the unit to the metric name in plural form:

```
http_request_duration_seconds        # time in seconds
node_memory_usage_bytes              # memory in bytes
disk_usage_ratio                     # ratio 0-1
```

### Type Suffix

- `counter`: `_total` — e.g., `http_requests_total`
- `counter with unit`: `_<unit>_total` — e.g., `process_cpu_seconds_total`
- `info metric`: `_info` — e.g., `myapp_build_info`
- `timestamp`: `_timestamp_seconds` — e.g., `job_last_success_timestamp_seconds`
- `boolean-like`: use gauge, 0 or 1 — e.g., `myapp_healthy`

### Name Ordering for Sorting

Order components so related metrics sort together lexicographically:

```
# Good — common prefix groups related metrics
prometheus_tsdb_head_truncations_closed_total
prometheus_tsdb_head_truncations_established_total
prometheus_tsdb_head_truncations_failed_total
prometheus_tsdb_head_truncations_total
```

### Semantic Consistency

A metric MUST represent the same logical thing across all its label dimensions. Test: `sum()` or `avg()` across all
dimensions should be meaningful.

```
# Good — all dimensions measure the same thing (request duration)
http_request_duration_seconds{method="GET"}
http_request_duration_seconds{method="POST"}

# Bad — mixing different things under one name
resource_usage{type="cpu"}      # percentage
resource_usage{type="memory"}   # bytes
```

If `sum()` across dimensions is nonsensical, split into separate metrics.

## Label Rules

### When to Use Labels

Use labels to differentiate characteristics of the thing being measured:

```
api_http_requests_total{operation="create"}
api_http_requests_total{operation="update"}
api_http_requests_total{operation="delete"}
```

### When NOT to Use Labels

- **Unbounded values** — user IDs, email addresses, full URLs, query strings
- **High cardinality** — anything above ~100 unique values per metric
- **Label names in metric names** — `http_requests_by_method_total` is redundant if there's a `method` label

### Cardinality Guidelines

- `< 10`: Safe for most metrics
- `10-100`: Acceptable, monitor growth
- `100-1000`: Investigate alternatives
- `> 1000`: Move analysis out of Prometheus

**Cardinality math:** Total time series = metric cardinality x number of targets. A metric with 100 label combinations
across 1000 targets = 100,000 time series.

### Reserved Labels

- `__*` (double underscore prefix) — Prometheus internal use
- `le` — Histogram bucket boundary
- `quantile` — Summary quantile value
- `job`, `instance` — Set by Prometheus scrape configuration

### Label Best Practices

1. **Minimal labels.** Every label is a dimension users must consider in PromQL.
2. **Stable label values.** Avoid labels that change frequently.
3. **Initialize all combinations.** Export 0 for known label sets to prevent missing metrics.
4. **Separate read/write.** Use separate metrics rather than a `direction` label — users typically care about one at a
   time.
5. **No "total" label value.** Don't include a `total` or empty aggregation label — rely on Prometheus `sum()` instead.
