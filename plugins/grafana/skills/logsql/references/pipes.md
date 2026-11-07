# LogsQL Pipes

Each pipe reads rows from upstream, emits rows downstream. Chain with `|`.

## Contents

- [Field Manipulation](#field-manipulation)
- [Sorting and Limiting](#sorting-and-limiting)
- [Structured Parsing](#structured-parsing)
- [Text Transformation](#text-transformation)
- [Math and Numeric](#math-and-numeric)
- [Stats and Aggregation](#stats-and-aggregation)
- [Joining and Combining](#joining-and-combining)
- [Exploration](#exploration)
- [Stream Context](#stream-context)
- [Filter Pipe](#filter-pipe)
- [Sampling and Generation](#sampling-and-generation)

---

## Field Manipulation

### `fields` (alias: `keep`)

```text
| fields _time, _stream, _msg, level
```

Keep only listed fields. Reduces payload and speeds downstream pipes.

### `delete` (aliases: `del`, `drop`, `rm`)

```text
| delete debug_info, internal_state
```

Drop listed fields, keep the rest.

### `copy` (alias: `cp`)

```text
| copy _msg as original_msg
| copy field1 as f1, field2 as f2
```

Copy values to new fields; originals stay.

### `rename` (alias: `mv`)

```text
| rename old_name as new_name
| rename _msg as message, level as severity
```

Rename fields; old names removed.

### `drop_empty_fields`

```text
| drop_empty_fields
```

Drop empty fields per row. Useful after unpacking sparse data.

### `coalesce`

```text
| coalesce field1, field2, "default" as result
```

First non-empty value among fields, fallback to default. Cleaner than nested conditionals.

---

## Sorting and Limiting

### `sort` (alias: `order`)

```text
| sort by (_time)
| sort by (_time desc)
| sort by (priority desc, _time)
```

Multi-key, per-key direction. Expensive — only sort small sets (< few million).

### `limit` (alias: `head`)

```text
| limit 100
```

Keep first N. Without preceding `sort`, "first" is implementation-defined — fine as safety cap.

### `offset` (alias: `skip`)

```text
| sort by (_time) | offset 100 | limit 50
```

Skip N after sorting. Only after sort — skipping unordered rows is meaningless.

### `first` / `last`

```text
| first 10 by (_time desc)
| last 10 by (_time)
```

Combined sort+limit; doesn't materialize full sorted set. Faster than separate `sort | limit`.

### `top`

```text
| top 10 (_stream)
| top 10 (host, path)
```

Top N groups by row count. Shorthand for `stats by (group) count() | sort desc | limit N`.

### `sample`

```text
| sample 0.01
| sample 1000
```

Probabilistic (`0.01` = 1% per row) or absolute (`1000` rows). For exploring large sets without full scan.

### `uniq`

```text
| uniq by (host, path)
```

Distinct rows by named fields. Other fields dropped.

---

## Structured Parsing

### `unpack_json`

```text
| unpack_json from _msg
| unpack_json from raw_log
| unpack_json from _msg fields (level, user_id, request_id)
```

Parses JSON, flattens key-values into top-level fields. Optional `fields (...)` extracts only named keys (cheaper for
known schemas).

Nested → dot notation: `{"user": {"id": 123}}` → `user.id=123`.

### `unpack_logfmt`

```text
| unpack_logfmt from _msg
```

logfmt parser (`key=value key2="value with spaces"`).

### `unpack_syslog`

```text
| unpack_syslog from _msg
```

RFC 5424 / RFC 3164 → `priority`, `facility`, `severity`, `hostname`, `app_name`, etc.

### `unpack_words`

```text
| unpack_words from _msg as words
```

Splits into words (same tokenization as word filters). Result is JSON array — combine with `unroll` for per-word rows.

### `pack_json`

```text
| pack_json as combined
| pack_json fields (a, b, c) as combined
```

Inverse of `unpack_json`: serializes fields as JSON in the named field.

### `pack_logfmt`

```text
| pack_logfmt as combined
```

Same for logfmt.

---

## Text Transformation

### `extract`

```text
| extract "GET <path> HTTP" from _msg
| extract "<ts> [<level>] <message>"
```

`<field_name>` placeholders. Simpler and faster than regex.

### `extract_regexp`

```text
| extract_regexp "client (?P<client_ip>[0-9.]+)" from _msg
| extract_regexp "level=(?P<level>\\w+)" from _msg
```

RE2 named groups; each becomes a field.

### `format`

```text
| format "<host>:<port>" as endpoint
| format '<level> <_msg>' as formatted_msg
```

Template formatting. Inverse of `extract`.

### `replace`

```text
| replace "old" with "new" in _msg
| replace "secret" with "REDACTED" in _msg, log
```

Literal replacement. Multiple fields for parallel replacement.

### `replace_regexp`

```text
| replace_regexp "[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{4}" with "XXXX-XXXX-XXXX-XXXX" in _msg
```

RE2 replacement.

### `collapse_nums`

```text
| collapse_nums at _msg
```

Replaces decimal/hex numbers with `<N>`. Groups similar logs differing in IDs/counts.

### `decolorize`

```text
| decolorize at _msg
```

Strip ANSI color codes. Often needed before extraction on terminal logs.

### `hash`

```text
| hash _msg as msg_hash
```

Hash field value. Pair with `count_uniq_hash` for grouping duplicates.

### `len`

```text
| len _msg as msg_len
```

Byte length of field value.

### `split`

```text
| split _msg by "," as parts
```

Splits field into JSON array by separator. Pair with `unroll` for per-element rows.

### `unroll`

```text
| unroll labels
```

Expands JSON-array field into multiple rows. Other fields duplicated.

### `time_add`

```text
| time_add 1h as next_hour
| time_add -30m at _time as adjusted_time
```

Add/subtract duration from RFC3339 time field.

---

## Math and Numeric

### `math` (alias: `eval`)

```text
| math duration_ms / 1000 as duration_sec
| eval (errors / total) * 100 as error_pct
| math round(duration_ms / 1000, 0.1) as duration_sec
```

Format: `math <expr> as <result>, ...`.

Operators: `+`, `-`, `*`, `/`, `%`, `^`, `&` (bitwise and), `or` (bitwise or), `xor`, `default` (NaN fallback).

Functions: `abs`, `ceil`, `floor`, `round(x, nearest?)`, `exp`, `ln`, `max(...)`, `min(...)`, `now()`, `rand()`.

Operands:

- Field names (parsed as numbers, RFC3339 → ns, IPv4 → uint32).
- Numeric literals with suffix: `1Mi`, `1.5K`.
- Quoted RFC3339 or IPv4 literals.
- Parenthesized subexpressions.

Later expressions reference earlier results:

```text
| math
    x = duration_ms / 1000,
    y = x * 2,
    z = x + y as total
```

### `json_array_len`

```text
| json_array_len labels as label_count
```

Length of JSON array in field.

---

## Stats and Aggregation

### `stats`

Full coverage in `stats.md`. Summary:

```text
| stats count() as total
| stats by (field) count() as per_group
| stats by (_time:1m) count() as per_minute
| stats
    count() as total,
    count() if (level:error) as errors,
    quantile(0.95, duration_ms) as p95
```

### `running_stats`

```text
| stats by (_time:1m) count() as hits
| running_stats sum(hits) as cumulative
```

Running aggregates over time-bucketed data. Supports `count`, `sum`, `min`, `max`, `last`.

### `total_stats`

```text
| stats by (_time:1m) count() as hits
| total_stats sum(hits) as grand_total
| math hits / grand_total * 100 as percent
```

Global aggregate broadcast to every row. For percentage-of-total.

---

## Joining and Combining

### `join`

```text
| join by (request_id) (
    {app="db"} _time:5m | fields request_id, query_duration_ms
  )
```

Joins by named field(s). Left-join: unmatched left rows kept with empty right fields.

### `union`

```text
| union (
    {app="api"} error
  )
```

Concatenates two queries. For cross-stream analysis.

---

## Exploration

### `filter` (alias: `where`)

```text
| filter level:error
| filter duration_ms:>1000 AND host:web-1
```

Mid-pipeline filtering. Needed after `unpack_json` extracts fields to filter on.

### `field_names`

```text
| field_names
| field_names | sort by (value)
```

Table of all field names. For schema discovery.

### `field_values`

```text
| field_values level
| field_values host | limit 100
```

Distinct values with frequency counts.

### `facets`

```text
| facets
| facets max_values_per_field=20
```

Most frequent fields and top values. Quick query summary.

### `blocks_count`

```text
| blocks_count
```

On-disk blocks scanned. For perf debugging.

### `query_stats`

```text
| query_stats
```

Per-pipe rows processed and time.

### `block_stats`

```text
| block_stats
```

Per-field block stats — storage type, dict size, bloom filter bytes.

---

## Stream Context

```text
| stream_context before 5 after 10
| stream_context before 0 after 20
| stream_context before 10 after 10 time_window 5m
```

Returns surrounding same-stream logs — N before, M after. For log forensics. `time_window` caps temporal extent.

---

## Filter Pipe

Catch-all for mid-pipeline filtering. Use after parsing to filter by extracted fields:

```text
{app="api"} _time:5m
  | unpack_json from _msg
  | filter level:error
  | filter duration_ms:>500
  | stats by (component) count()
```

Accepts full filter language — word, phrase, exact, range, regex, AND/OR/NOT.

---

## Sampling and Generation

### `sample`

```text
| sample 0.01     # 1% probabilistic
| sample 1000     # absolute count
```

### `generate_sequence`

```text
generate_sequence start=0 end=100 step=1 as i
```

Synthetic logs with numeric `i` field. For testing and demos.

---

## Set Stream Fields

```text
| set_stream_fields app, host
```

Marks fields as `_stream` for downstream queries. Used in alerting rules where output should be stream-addressable.

---

## Decolorize, Hash, Len Quick Reference

- `decolorize` strips ANSI escape codes.
- `hash` produces stable hash.
- `len` returns byte length.
- `json_array_len` returns array length.

Log fingerprinting: `| collapse_nums at _msg | hash _msg as fp | stats by (fp) count()`.
