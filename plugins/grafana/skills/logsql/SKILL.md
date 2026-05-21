---
name: logsql
description: >-
  VictoriaLogs LogsQL query language: filters (word, phrase, prefix, regexp, range, IPv4 range,
  exact, stream, time), pipe operators (stats, sort, fields, format, extract, unpack_json,
  unpack_logfmt, math, limit, top, uniq), stats functions, log stream filtering with
  Prometheus-style label selectors, field extraction, and performance patterns. Invoke whenever
  task involves any interaction with LogsQL — writing, debugging, optimizing, or reviewing
  VictoriaLogs queries.
---

# LogsQL

VictoriaLogs query language. Three stages: **filters** select logs, **pipes** transform, **stats** aggregate. Master the
shape; rest is detail.

## References

- **Filters** — [`${CLAUDE_SKILL_DIR}/references/filters.md`] All filter types (word, phrase, prefix, substring, regexp,
  range, IPv4/IPv6/string range, length range, exact, multi-exact, contains_all/any, subquery, case-insensitive,
  sequence, value_type, field comparison); `_time`, `_stream`, `_stream_id`; AND/OR/NOT precedence.
- **Pipes** — [`${CLAUDE_SKILL_DIR}/references/pipes.md`] All pipe operators: field manipulation, sorting/limiting,
  transformation, structured parsing, exploration, stream context, joining.
- **Stats** — [`${CLAUDE_SKILL_DIR}/references/stats.md`] Stats pipe shape, grouping (fields, time buckets,
  timezone-aware, field buckets, IPv4 buckets, additional filters); all stats functions; `running_stats`/`total_stats`;
  math pipe.
- **Patterns** — [`${CLAUDE_SKILL_DIR}/references/patterns.md`] Recipes (top-N, error counting, latency percentiles,
  field extraction, rate over time), performance tips, troubleshooting workflows.

Read the relevant reference before proceeding.

## The Three-Stage Shape

```
<filters> | <pipe1> | <pipe2> | ... | <pipeN>
```

- **Filters select logs.** At least one required. Run first; downstream sees only matched logs.
- **Pipes transform.** Each reads previous-stage output, emits new rows. Reshape (`fields`, `rename`), parse
  (`unpack_json`, `extract`), aggregate (`stats`), limit (`limit`, `sort`).
- **No final stage marker.** Last pipe's output is the response.

Simplest valid query — one word, searched in `_msg`:

```
error
```

Returns every log containing `error`, in arbitrary order, across all time.

## The `_time` Filter — Almost Always Required

Without `_time`, the query scans all stored logs.

Common forms:

- `_time:5m` — last 5 minutes.
- `_time:1h` — last hour.
- `_time:1d` — last day.
- `_time:2.5d15m42.345s` — composite duration.
- `_time:>=2024-01-01` — since.
- `_time:<=2024-01-01` — before.
- `_time:[2024-01-01, 2024-01-02)` — closed-open range.
- `_time:2024-03-15T10:00:00+02:00` — exact RFC3339 with timezone.

Grafana plugin and web UI inject the dashboard time range. **Don't** add `_time:` in dashboard queries — disables time
picker. **Do** add it for ad-hoc API queries.

## Stream Filter — The Performance Lever

Logs belong to **streams** — Prometheus-style label sets identifying the source. Use `{...}` braces with PromQL selector
syntax:

```
{app="nginx"}
{app="nginx", instance=~"web-.*"}
{app in ("nginx", "envoy")}
{app not_in ("buggy", "deprecated")}
```

Optional `_stream:` prefix: `_stream:{app="nginx"}`.

**Performance:** most aggressive pruning available. Restricts which on-disk blocks need reading. A precise stream filter

- `_time` range may read 0.1% of what free-text alone would.

Combine `_time` + `{stream}` at the top of every production query.

## Filter Types

Full catalog: [`${CLAUDE_SKILL_DIR}/references/filters.md`].

### Word Filter

```
error
log.level:error
```

Bare word matches `_msg`. `field:word` matches named field. Case-sensitive by default; `log.level:i(error)` for
case-insensitive.

### Phrase Filter

```
"error: cannot open file"
"event.original":"cannot open file"
```

Quoted phrases match literally, whitespace and punctuation included.

### Prefix Filter

```
error*
log.level:error*
"warn"*
```

`*` matches anything starting with the prefix.

### Exact / Multi-Exact

```
log.level:="error"
log.level:in("error", "fatal", "panic")
```

`=` requires whole-field equality. `in(...)` matches any of multiple exact values — much faster than regex.

### Regexp

```
~"(?i)error|warn"
log.level:~"^err"
log.level:!~"^debug"
```

RE2 syntax. `!~` negates. Slower than word/exact — use sparingly.

### Range Filter

```
duration_ms:>1000
duration_ms:[100, 1000]
duration_ms:>=500
```

Numeric. Supports `>`, `>=`, `<`, `<=`, and `[low, high]` / `(low, high)` intervals.

### IPv4 Range

```
client_ip:ipv4_range("10.0.0.0", "10.255.255.255")
client_ip:ipv4_range("192.168.0.0/16")
```

CIDR or low/high. IPv6: `ipv6_range`.

### Length Range

```
_msg:len_range(100, 1000)
```

Byte length of field value. For suspiciously short or long lines.

### Logical Composition

```
error AND _time:5m AND {app="nginx"}
error _time:5m {app="nginx"}              # AND can be omitted
error AND NOT buggy_app
error -buggy_app                          # - is shorthand for NOT
(error OR warn) AND _time:1h
error -(buggy_app OR foobar)
```

Precedence: NOT > AND > OR. Parenthesize when in doubt — `error -buggy_app OR foobar` parses as
`(error AND NOT buggy_app) OR foobar`.

## The `*` Wildcard for Fields

Multi-field search by name prefix:

```
*:error          # any field containing 'error' word
kubernetes.*:nginx   # any field starting with 'kubernetes.' containing 'nginx'
```

Slows queries — scans more field data. Prefer explicit field names.

## Pipe Composition

Pipes chain with `|`.

### `fields` — Select Output Fields

```
error _time:5m | fields _time, _stream, _msg
```

Reduces to named subset — faster transit, easier reading.

### `sort` — Order Results

```
error _time:5m | sort by (_time)
error _time:5m | sort by (_time desc)
```

Unordered by default. Expensive — only sort small sets (< few million).

### `limit` / `first` / `last`

```
error _time:5m | sort by (_time) desc | limit 10
error _time:5m | first 10 by (_time desc)
error _time:5m | last 10 by (_time)
```

`limit` truncates after sort. `first`/`last` combine sort+limit. Aliases: `head` = `limit`, `skip` = `offset`.

### `stats` — Aggregate

```
_time:5m | stats count() as total_errors
_time:5m | stats by (_stream) count() as errors_per_stream
_time:5m | stats by (_time:1m) count() as per_minute_errors
```

`stats` and `as` keywords are optional: `_time:5m | count() total_errors` works.

Most powerful pipe. Grouping by fields, time buckets, field buckets, IPv4 buckets, per-row filters. Full mechanics:
[`${CLAUDE_SKILL_DIR}/references/stats.md`].

### `unpack_json` / `unpack_logfmt` — Parse Structured Logs

```
{app="my-app"} | unpack_json from _msg
{app="my-app"} | unpack_logfmt from _msg
{app="my-app"} | unpack_json from _msg | stats by (level) count()
```

Parses field as JSON/logfmt, flattens into top-level fields. Downstream pipes filter and group by extracted fields.

### `extract` / `extract_regexp` — Pattern-Based Field Extraction

```
_msg:"GET" | extract "GET <path> HTTP" from _msg
_msg:"client" | extract_regexp "client (?P<client_ip>[0-9.]+)" from _msg
```

`extract` uses `<field_name>` placeholders. `extract_regexp` uses RE2 named groups.

### `math` / `eval` — Numeric Calculations

```
| math duration_ms / 1000 as duration_sec
| eval (errors / total) * 100 as error_percent
```

Arithmetic, bitwise, defaults, max/min, abs/ceil/floor/round/exp/ln on numeric field values.

### `top` — N Largest Groups

```
_time:5m | top 10 (_stream)
_time:5m | top 10 (host, path)
```

Shortcut for `stats by (group) count() | sort desc | limit N`.

### `uniq` — Distinct Rows

```
_time:5m | uniq by (host, path)
```

Like SQL `SELECT DISTINCT`. One row per unique field combination.

## Common Query Recipes

```
# Recent error logs from one service
_time:5m {app="api"} error | sort by (_time) desc | limit 100

# Error count per service over last hour
_time:1h error | stats by (_stream) count() as errors | sort by (errors) desc

# Per-minute error rate
_time:1h error | stats by (_time:1m) count() as errors_per_min

# Top 10 noisiest streams
_time:5m | stats by (_stream) count() as logs | sort by (logs) desc | limit 10
# Equivalent:
_time:5m | top 10 (_stream)

# Latency percentiles per endpoint
_time:1h {app="api"} | unpack_json from _msg
  | stats by (path) quantile(0.5, duration_ms) p50, quantile(0.95, duration_ms) p95

# Errors from JSON logs, parsed and filtered
{app="api"} _time:5m | unpack_json from _msg
  | filter level:error
  | stats by (component) count()
```

## Stats Functions — Quick Reference

Most common; full catalog: [`${CLAUDE_SKILL_DIR}/references/stats.md`].

- **`count()`** — row count.
- **`count(field)`** — rows with non-empty `field`.
- **`count_empty(field)`** — rows with empty/missing `field`.
- **`count_uniq(field, ...)`** — distinct combinations. Memory scales with cardinality.
- **`count_uniq_hash(field, ...)`** — cheaper approximate distinct via hashing.
- **`sum`**, **`avg`**, **`min`**, **`max`**, **`median`** of field.
- **`quantile(phi, field)`** — phi in `[0..1]`.
- **`uniq_values(field)`** — distinct values as JSON array.
- **`values(field)`** — all values including duplicates.
- **`field_min(target, sort)`** / **`field_max(target, sort)`** — `target` value for smallest/largest `sort` row.
- **`row_min(sort)`** / **`row_max(sort)`** — full row at min/max.
- **`row_any()`** — arbitrary row per group.
- **`rate()`** — per-second rate of matching rows.
- **`histogram(field)`** — histogram of numeric values.
- **`stddev(field)`**.

## Grouping in Stats

### By Fields

```
| stats by (host, path) count() as logs
```

`by` keyword optional.

### By Time Buckets

```
| stats by (_time:1m) count() as per_minute
| stats by (_time:5m, host) count() as per_5m_per_host
```

Bucket = any duration. Named buckets: `nanosecond`, `microsecond`, `millisecond`, `second`, `minute`, `hour`, `day`,
`week`, `month`, `year` (month/year account for variable lengths).

### Time Buckets with Timezone

```
| stats by (_time:1d offset 'America/New_York') count() as per_day_ny
```

Aligned to the named timezone, not UTC. Needed for daily/weekly stats in non-UTC offices.

### By Field Buckets

```
| stats by (duration_ms:100) count() as histogram
```

Buckets numeric values into ranges. `duration_ms:100` → `[0,100)`, `[100,200)`, etc.

### With Additional Filters

```
| stats
    count() as total,
    count() if (level:error) as errors,
    count() if (level:warn) as warns
```

Per-aggregate filtering. One pass beats N separate queries.

## Performance Tips

- **Always include `_time`.** Otherwise every block is candidate for scan.
- **Use `{...}` stream filters when possible.** Block-level pruning — orders of magnitude faster than field-value.
- **Exact over regex.** `log.level:="error"` is much faster than `log.level:~"^err"`.
- **Filter before aggregating.** Push filters left.
- **Avoid sorting > 10M rows.** Combine with `limit` or use `first N by (...)`.
- **`count_uniq_hash` over `count_uniq`** for high cardinality when ±1% is acceptable.
- **`fields` early** to drop unused columns.
- **Stream filter at top level.** Multiple stream filters work but are less optimized.

## Query Options

```
_time:5m error | options concurrency=4, parallel_readers=8
```

- **`concurrency=N`** — CPU cores.
- **`parallel_readers=N`** — parallel block readers.
- **`ignore_global_time_filter`** — bypass dashboard time (mostly absolute-time alert rules).
- **`allow_partial_response`** — partial results on timeout instead of erroring.
- **`time_offset=duration`** — shift query time perception.
- **`global_filter`** — applies a filter to every subquery.

## Application

When **writing**:

- Start with `_time` + `{stream}` + content filter. Avoid free-text-only in production.
- `unpack_json` once near top; downstream references are cheap.
- Group by `_stream` for per-service rollups.
- Parenthesize OR inside negation: `error -(a OR b)`, not `error -a OR b`.

When **debugging**:

- Drop pipes, run filter alone, sample 10 results.
- Add pipes one at a time with `| limit 10` to keep intermediate small.
- For unexpected stats: `| limit 5` before `stats` to inspect input.
- Use `field_names` and `field_values` to enumerate what's available.

When **reviewing**:

- Flag missing `_time` in production dashboards.
- Flag bare regex without exact pre-filter.
- Flag `sort` without preceding `limit` or stream filter.

## Integration

**metricsql** and **promql** — Prometheus metric queries. Cross-correlate at the stream level: log streams use the same
label selectors.

**observability** — general logging discipline. This skill — LogsQL syntax and performance.
