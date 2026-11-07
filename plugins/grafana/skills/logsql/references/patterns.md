# LogsQL Patterns and Recipes

Query recipes, field extraction, performance tips, troubleshooting workflows.

## Contents

- [Selection Recipes](#selection-recipes)
- [Counting Recipes](#counting-recipes)
- [Distribution and Percentile Recipes](#distribution-and-percentile-recipes)
- [Field Extraction Recipes](#field-extraction-recipes)
- [Time-Series Recipes](#time-series-recipes)
- [Cross-Stream Recipes](#cross-stream-recipes)
- [Anti-Patterns](#anti-patterns)
- [Performance Tips](#performance-tips)
- [Troubleshooting Workflow](#troubleshooting-workflow)

---

## Selection Recipes

### Recent Errors from One Service

```text
{app="api"} error _time:5m | sort by (_time) desc | limit 100
```

### Errors Excluding Known Noise

```text
{app="api"} _time:5m error -(known_noise1 OR known_noise2)
```

### Logs in a Specific Time Window

```text
{app="api"} _time:[2024-03-15T10:00:00Z, 2024-03-15T11:00:00Z] error
```

### Logs from Multiple Apps

```text
{app in ("api", "worker", "scheduler")} _time:5m error
```

### High-Latency Requests

```text
{app="api"} _time:5m
  | unpack_json from _msg
  | filter duration_ms:>1000
  | sort by (duration_ms desc)
  | limit 100
```

### Surrounding Context for Each Error

```text
{app="api"} _time:5m error
  | stream_context before 5 after 10
```

Each error plus 5 before and 10 after from the same stream.

---

## Counting Recipes

### Total Logs Matching a Query

```text
_time:5m error | count()
```

### Errors per Stream

```text
_time:5m error | stats by (_stream) count() as errors | sort by (errors desc)
```

### Errors per Service (Multi-Aggregate)

```text
{app=~".+"} _time:5m
  | stats by (app)
      count() as total,
      count() if (level:error) as errors,
      count() if (level:warn) as warns
  | math (errors / total) * 100 as error_pct
  | sort by (error_pct desc)
```

### Top 10 Noisiest Streams

```text
_time:5m | top 10 (_stream)
```

Equivalent to: `_time:5m | stats by (_stream) count() as logs | sort by (logs desc) | limit 10`

### Unique Client Count (Memory-Safe)

```text
{app="api"} _time:1d | count_uniq_hash(client_ip)
```

`_hash` for high-cardinality safety; ±1%.

### Counting Distinct Values per Group

```text
{app="api"} _time:1h
  | unpack_json from _msg
  | stats by (endpoint) count_uniq(client_ip) as unique_clients
  | sort by (unique_clients desc)
  | limit 20
```

---

## Distribution and Percentile Recipes

### Latency Percentiles per Endpoint

```text
{app="api"} _time:1h
  | unpack_json from _msg fields (endpoint, duration_ms)
  | stats by (endpoint)
      count() as samples,
      quantile(0.5, duration_ms) as p50,
      quantile(0.95, duration_ms) as p95,
      quantile(0.99, duration_ms) as p99
  | filter samples:>=100
  | sort by (p99 desc)
```

`filter samples:>=100` is critical — quantiles under ~100 samples are unreliable.

### Histogram of Response Sizes

```text
{app="api"} _time:1h
  | unpack_json from _msg fields (response_bytes)
  | stats by (response_bytes:1Ki) count() as bucket_count
  | sort by (response_bytes)
```

### Per-Subnet Request Counts

```text
{app="api"} _time:1h
  | unpack_json from _msg fields (client_ip)
  | stats by (client_ip:/24) count() as requests
  | sort by (requests desc)
  | limit 20
```

### Status Code Distribution

```text
{app="api"} _time:1h
  | unpack_json from _msg fields (status)
  | stats by (status) count() as count
  | sort by (count desc)
```

---

## Field Extraction Recipes

### JSON Structured Logs

```text
{app="api"} _time:5m
  | unpack_json from _msg
  | filter level:error
  | stats by (component) count() as errors
```

### JSON with Selective Fields

```text
{app="api"} _time:5m
  | unpack_json from _msg fields (level, component, duration_ms)
  | filter level:error
  | stats by (component) avg(duration_ms) as avg_dur
```

Faster than full unpack for few fields.

### Logfmt Logs

```text
{app="caddy"} _time:5m
  | unpack_logfmt from _msg
  | filter status:>=500
  | stats by (host) count()
```

### Syslog

```text
{app="systemd"} _time:5m
  | unpack_syslog from _msg
  | filter severity:<=3            # warning or worse
  | stats by (app_name, severity) count()
```

### Regex Extraction from Free-Form Logs

```text
{app="nginx"} _time:5m
  | extract_regexp '(?P<client_ip>[0-9.]+) - .+ "(?P<method>\\w+) (?P<path>[^ ]+) HTTP/[0-9.]+" (?P<status>\\d+) (?P<bytes>\\d+)'
  | stats by (status, method) count(), avg(bytes) as avg_bytes
```

### Pattern Extraction

```text
{app="web"} _time:5m
  | extract '<ts> [<level>] <component>: <message>' from _msg
  | filter level:ERROR
  | stats by (component) count()
```

### Field Fingerprinting (Collapse IDs)

```text
{app="api"} _time:5m
  | collapse_nums at _msg
  | stats by (_msg) count() as occurrences
  | sort by (occurrences desc)
  | limit 20
```

Top 20 log templates with IDs/numbers normalized to `<N>`.

---

## Time-Series Recipes

### Per-Minute Error Rate

```text
{app="api"} _time:1h error
  | stats by (_time:1m) count() as errors_per_min
  | sort by (_time)
```

### Per-Minute Error Percentage

```text
{app="api"} _time:1h
  | stats by (_time:1m)
      count() as total,
      count() if (level:error) as errors
  | math (errors / total) * 100 as error_pct
  | sort by (_time)
```

### Cumulative Errors Over Time

```text
{app="api"} _time:1h error
  | stats by (_time:1m) count() as hits
  | running_stats sum(hits) as cumulative
  | sort by (_time)
```

### Daily Breakdown in Local Timezone

```text
{app="api"} _time:7d error
  | stats by (_time:1d offset 'America/New_York') count() as daily_errors
  | sort by (_time)
```

### Rate of Distinct Users Over Time

```text
{app="api"} _time:1h
  | unpack_json from _msg fields (user_id)
  | stats by (_time:5m) count_uniq_hash(user_id) as unique_users_per_5m
  | sort by (_time)
```

---

## Cross-Stream Recipes

### Logs from Clients Who Hit an Error

Find clients with any error in last hour; show all their logs:

```text
_time:1h
  | filter client_ip:in(
      {app="api"} _time:1h error | uniq by (client_ip) | fields client_ip
    )
```

### Correlate Error in API with Slow Query in DB

```text
{app="api"} _time:5m error
  | unpack_json from _msg fields (request_id)
  | join by (request_id) (
      {app="db"} _time:5m | unpack_json from _msg fields (request_id, query_duration_ms)
    )
  | filter query_duration_ms:>1000
```

### Union of Multiple Service Queries

```text
{app="api"} _time:5m error
  | union (
      {app="worker"} _time:5m error
    )
  | union (
      {app="scheduler"} _time:5m error
    )
  | stats by (_stream) count()
```

---

## Anti-Patterns

### Free-Text Search Without `_time`

```text
error                                        # BAD: scans all time
error _time:5m                               # GOOD
```

### Free-Text Search Without Stream Filter

```text
error _time:5m                               # OK
error _time:5m {app="api"}                   # MUCH FASTER
```

### Regex When Exact Match Suffices

```text
log.level:~"error"                           # SLOW
log.level:="error"                           # FAST (exact)
log.level:in("error", "fatal", "panic")      # FAST (multi-exact)
```

### Sort Before Limit

```text
_time:5m | sort by (_time) | limit 10        # OK but materializes full sort
_time:5m | first 10 by (_time)               # FASTER
```

### `count_uniq` on High-Cardinality

```text
_time:1d | count_uniq(request_id)            # MAY OOM
_time:1d | count_uniq_hash(request_id)       # SAFE, ±1%
```

### Multiple Pass Aggregations

```text
# BAD: three full scans
_time:5m | count()
_time:5m error | count()
_time:5m warn | count()

# GOOD: one scan
_time:5m | stats
    count() as total,
    count() if (level:error) as errors,
    count() if (level:warn) as warns
```

### Unparenthesized OR Inside NOT

```text
error -buggy_app OR foobar                   # parses as (error AND NOT buggy_app) OR foobar
error -(buggy_app OR foobar)                 # parses as error AND NOT (buggy_app OR foobar)
```

Second form is almost always intended. Always parenthesize OR inside NOT.

---

## Performance Tips

- **Time filter first.** `_time:<duration>` or `_time:[start, end)` on every production query.
- **Stream filter second.** `{app="..."}` at top prunes blocks.
- **Exact > word > regex.** `field:="value"` > `field:value` > `field:~"regex"`.
- **Push filters left.** Filter, then parse, then aggregate, then sort.
- **`fields` early.** Drop unused fields after parsing.
- **`first`/`last` over `sort | limit`** for top-N.
- **`count_uniq_hash` over `count_uniq`** for high cardinality.
- **Multi-aggregate over multi-query.** One `| stats` with `if (...)` beats N queries.
- **Avoid `*` wildcards.** `kubernetes.*:nginx` is much slower than `kubernetes.namespace:nginx`.
- **Avoid sorting > 10M rows.** Bound with `limit` or `first`.

---

## Troubleshooting Workflow

### Query Returns No Results

1. **Drop pipes, check filter alone.**

   ```text
   {app="api"} _time:5m error | limit 5
   ```

   Rows = pipe issue; no rows = filter too restrictive.

2. **Loosen `_time`.**

   ```text
   {app="api"} _time:1d error | limit 5
   ```

3. **Drop stream filter.**

   ```text
   _time:5m error | limit 5
   ```

   Rows here but not with stream filter = stream filter wrong. Verify with `| stats by (_stream) count()`.

4. **Check field presence.**

   ```text
   _time:5m {app="api"} | field_names | limit 100
   ```

   Reveals which fields exist in matching rows.

### Query Returns Too Many Results

1. Add stream filter if missing.
2. Tighten time filter.
3. Add `| limit` safety cap.

### Query is Slow

1. **`| query_stats`** at the end:

   ```text
   _time:5m error | stats by (_stream) count() | query_stats
   ```

   Per-pipe times. Early-pipe times → filter inefficiency; late-pipe times → excessive intermediate data.

2. **`| blocks_count`:**

   ```text
   _time:5m error | blocks_count
   ```

   Large counts → time and stream filters under-pruning.

3. **Profile pipes incrementally:**

   ```text
   _time:5m error | limit 100                       # filter only
   _time:5m error | unpack_json from _msg | limit 100   # add parse
   _time:5m error | unpack_json from _msg | stats by (level) count()    # add aggregate
   ```

   Observe which step's runtime jumps.

### Unexpected Stats Results

1. **`| limit 10` before `stats`** to inspect input:

   ```text
   _time:5m error | unpack_json from _msg | limit 10
   ```

2. **`field_values`** for distinct values:

   ```text
   _time:5m | unpack_json from _msg | field_values level
   ```

3. **Verify unpack/extract worked:**

   ```text
   _time:5m | unpack_json from _msg | fields _time, level, _msg | limit 5
   ```

   Empty `level` = no `level` key in JSON, or different structure.

### Quantiles Look Wrong

- **Sample count per group:**

  ```text
  | stats by (group) count() as samples, quantile(0.95, x) as p95
  | filter samples:>=100
  ```

- **Distribution via `histogram`:**

  ```text
  | stats by (group) histogram(x) as dist
  ```

- **Compare percentiles:**

  ```text
  | stats by (group)
      quantile(0.5, x) p50,
      quantile(0.95, x) p95,
      quantile(0.99, x) p99,
      max(x) as worst
  ```

  p99 ≪ max = long tail outliers; p50 ≈ p99 = tight distribution.
