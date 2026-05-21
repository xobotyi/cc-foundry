# LogsQL Filters

Filters return matching logs; downstream pipes work on matched rows only.

## Contents

- [Filter Application Rules](#filter-application-rules)
- [Time Filter](#time-filter)
- [Stream Filter](#stream-filter)
- [`_stream_id` Filter](#_stream_id-filter)
- [Day Range and Week Range](#day-range-and-week-range)
- [Word, Phrase, Prefix, Substring](#word-phrase-prefix-substring)
- [Exact and Multi-Exact](#exact-and-multi-exact)
- [Regexp Filter](#regexp-filter)
- [Range Filters](#range-filters)
- [Length Range](#length-range)
- [IPv4 / IPv6 / String Range](#ipv4--ipv6--string-range)
- [Sequence Filter](#sequence-filter)
- [Pattern Match](#pattern-match)
- [`contains_all` / `contains_any`](#contains_all--contains_any)
- [Case-Insensitive Filters](#case-insensitive-filters)
- [Empty and Any Value](#empty-and-any-value)
- [Value Type Filter](#value-type-filter)
- [Field Comparison Filters](#field-comparison-filters)
- [Subquery Filter](#subquery-filter)
- [Logical Composition](#logical-composition)

---

## Filter Application Rules

- Filters apply to `_msg` by default. Prefix `field:` for other fields.
- Word filters are case-sensitive. Wrap in `i(...)` for case-insensitive.
- `*` wildcard for multi-field prefix search: `kubernetes.*:nginx`.
- Field names and args can be wrapped in `"..."`, `'...'`, or `` `...` `` for special chars.

```
"some 'field':123":i('some("value")') AND `other"value'`
```

---

## Time Filter

Most important filter. Without it, the query scans all stored logs.

### Duration Forms

- `_time:5m` — last 5 minutes (`[now-5m, now)`)
- `_time:1h` — last hour
- `_time:1d` — last day
- `_time:2.5d15m42.345s` — composite (days, hours, minutes, seconds)
- `_time:1y` — last year

### Comparison Forms

- `_time:>duration` — older than `now - duration`, exclusive
- `_time:>=duration` — older than `now - duration`, inclusive
- `_time:<duration` — within `[now - duration, now)`
- `_time:<=duration` — within `[now - duration, now]`

### Absolute Forms

- `_time:2024-01-15` — exactly that day
- `_time:2024-01-15T10:00:00Z` — exact RFC3339 timestamp (UTC)
- `_time:2024-01-15T10:00:00+02:00` — with timezone offset
- `_time:[2024-01-01, 2024-02-01)` — closed-open interval
- `_time:(2024-01-01, 2024-02-01]` — open-closed
- `_time:[2024-01-01, 2024-02-01]` — closed-closed

### Partial Forms

- `_time:2024` — entire year
- `_time:2024-01` — entire January
- `_time:2024-01-15T10` — that hour

### Performance

Logs stored in time-partitioned blocks. `_time` filter restricts which blocks must be read.

---

## Stream Filter

Logs belong to **streams** — sets sharing immutable label values (Prometheus-style). Use braces with PromQL selector
syntax:

```
{app="nginx"}
{app="nginx", instance=~"web-.*"}
{app="nginx", level!="debug"}
```

### Operators

- `=` exact match.
- `!=` not equal.
- `=~` regex match.
- `!~` regex not match.
- `in (v1, ..., vN)` — equivalent to `=~"v1|...|vN"` with escaping.
- `not_in (v1, ...)` — equivalent to `!~"v1|...|vN"`.

### Optional Prefix

`_stream:{app="nginx"}` ≡ `{app="nginx"}`. Use prefix for clarity in many-filter queries.

### Performance

Highest-leverage filter — prunes which on-disk data needs reading.

- Exactly one `{...}` at the top of the query.
- Favor multiple label matchers over `=~` regex.
- Avoid duplicate stream filters at different positions.

---

## `_stream_id` Filter

Every stream has a unique hex `_stream_id`. Filter by ID:

```
_stream_id:0000007b000001c850d9950ea6196b1a4812081265faa1c7
_stream_id:in(id1, id2, id3)
_stream_id:in(_time:5m error | fields _stream_id)
```

Last form is a subquery — must end with `fields _stream_id` or `uniq by (_stream_id)`.

Use when the ID comes from UI links, alert payloads, or trace correlation; `{...}` selectors for human-driven queries.

---

## Day Range and Week Range

Filter by time-of-day or day-of-week regardless of date:

```
_time:day_range[09:00, 17:00]            # business hours
_time:day_range(00:00, 06:00]            # nighttime
_time:day_range[09:00, 17:00] offset 2h  # specific timezone
```

```
_time:week_range[Mon, Fri]               # weekdays
_time:week_range[Sat, Sun]               # weekends
```

Combine with `_time` for date+within-day:

```
_time:7d AND _time:day_range[09:00, 17:00]
```

---

## Word, Phrase, Prefix, Substring

### Word Filter

```
error
log.level:error
```

Matches when the field contains `error` delimited by non-word chars. Matches `error`, `an error happened`,
`error: cannot open file`. Does NOT match `ERROR` (case-sensitive; use `i(error)`) or `multiple errors occurred` (use
prefix `error*`).

### Phrase Filter

```
"error: cannot open file"
"event.original":"cannot open file"
```

Quote multi-word phrases. Matches literally with whitespace and punctuation. Use single quotes when phrase contains
double quotes: `'"foo":"bar"'`.

### Prefix Filter

```
error*
log.level:error*
"warn"*
```

Matches anything starting with the prefix. `error*` matches `error`, `errors`, `errored`, `error:`.

### Exact Prefix Filter

```
log.level:="warn"*
```

Field value must START with `warn`, not just contain a word starting with `warn`. Useful for short anchored fields.

### Substring Filter

```
log.level:~"err"
```

No dedicated substring operator — use word filter (`err*`) or regex.

---

## Exact and Multi-Exact

### Exact

```
log.level:="error"
"event.original":="GET /api"
```

Whole-field equality. Faster than word matching. Negate with `!=`.

### Multi-Exact

```
log.level:in("error", "fatal", "panic")
log.level:!in("debug", "trace")
```

OR-of-exacts via hash lookup. Much faster than `log.level:~"error|fatal|panic"`.

---

## Regexp Filter

```
~"(?i)error|warn"
log.level:~"^err"
log.level:!~"^debug"
"event.message":~"(?P<id>[0-9a-f]{8})"
```

RE2 syntax; `!~` negates. Regex scans byte-by-byte; word/exact use inverted indexes.

Optimization: pre-filter with word/exact to reduce candidates:

```
log.level:error AND log.level:~"error.*timeout"
```

---

## Range Filters

```
duration_ms:>1000
duration_ms:>=500
duration_ms:<100
duration_ms:<=10
```

Intervals:

```
duration_ms:[100, 1000]      # closed-closed
duration_ms:(100, 1000)      # open-open
duration_ms:[100, 1000)      # closed-open
```

Numeric suffixes: `1K`, `1Mi`, `1.5G`, `1ns`, `1m`, `1h`. Time-like values parsed as nanoseconds.

---

## Length Range

```
_msg:len_range(100, 1000)
session_id:len_range(36, 36)
```

For suspicious short/long logs or fixed-length identifier validation.

---

## IPv4 / IPv6 / String Range

### IPv4 Range

```
client_ip:ipv4_range("10.0.0.0", "10.255.255.255")
client_ip:ipv4_range("192.168.0.0/16")
client_ip:ipv4_range("172.16.0.0/12")
```

CIDR or low/high. Faster than regex for IP ranges.

### IPv6 Range

```
client_ip:ipv6_range("2001:db8::/32")
```

### String Range

```
session_id:string_range("a", "f")
```

Alphabetical, `a` (inclusive) to `f` (exclusive).

---

## Sequence Filter

In-order word/phrase sequence, anything between:

```
seq("ssh", "login", "fail")
_msg:seq("ssh", "login", "fail")
```

Matches `ssh: login fail`, `ssh user login failed`, `ssh-related login attempt failed`.

---

## Pattern Match

```
| filter _msg:pattern("user: <user_id> from <ip>")
```

`<field_name>` placeholders. Less powerful than `extract`; useful as a filter.

---

## `contains_all` / `contains_any`

```
_msg:contains_all("error", "timeout", "retry")
_msg:contains_any("error", "warn", "critical")
```

AND/OR equivalents, concise for large lists.

`json_array_contains_any` matches JSON-array field containing any value:

```
labels:json_array_contains_any("error", "fatal")
```

---

## Case-Insensitive Filters

```
i(error)
log.level:i(error)
log.level:i("error")*
i("error: cannot open")
```

Wrap word/phrase/prefix in `i(...)`. Slower than case-sensitive.

Related: `equals_common_case(...)` and `contains_common_case(...)` match patterns with given case patterns per
character.

---

## Empty and Any Value

```
log.level:""           # field missing or empty
log.level:!""          # field non-empty
log.level:*            # any non-empty value
```

---

## Value Type Filter

Filter by storage type:

```
duration_ms:value_type(int64)
duration_ms:value_type(uint64)
client_ip:value_type(ipv4)
```

Types: `string`, `int64`, `uint64`, `float64`, `ipv4`, `ipv6`, `timestamp`, `dict`. For data-quality issues (integer
field sometimes stored as string).

---

## Field Comparison Filters

Compare two fields in same row:

```
eq_field(field1, field2)         # field1 == field2
lt_field(field1, field2)         # field1 <  field2
le_field(field1, field2)         # field1 <= field2
```

For `actual_size > declared_size` checks, mismatched timestamps.

---

## Subquery Filter

```
client_ip:in(_time:1h error | fields client_ip)
```

Outer filters by IPs from inner query's error logs. Subquery must end with `fields <field>` or `uniq by (<field>)`.

For cross-stream correlation: "all logs from clients who saw any error."

---

## Logical Composition

### Operators

- `AND` (or whitespace).
- `OR`.
- `NOT` (or `-` or `!`).

```
error AND _time:5m AND {app="nginx"}
error _time:5m {app="nginx"}                    # AND implicit
error AND NOT buggy_app
error -buggy_app                                # - is shorthand for NOT
(error OR warn) AND _time:1h
error -(buggy_app OR foobar)
```

### Precedence

NOT > AND > OR.

`error -buggy_app OR foobar` parses as `(error AND NOT buggy_app) OR foobar`. The right disjunct returns any log with
`foobar`. Almost never what you want.

**Always parenthesize OR inside NOT or AND.** One keystroke vs hours of bugs.

### Field-Scoped Composition

```
log.level:(error OR warn) -app:buggy_app
client_ip:(192.168.1.0/16 OR 10.0.0.0/8)
```

Cleaner than `(log.level:error OR log.level:warn)`.

### Multi-Field Search

```
*:error                       # any field
"kubernetes.*":nginx          # any field starting with "kubernetes."
```

Slower — scans every field with the prefix.
