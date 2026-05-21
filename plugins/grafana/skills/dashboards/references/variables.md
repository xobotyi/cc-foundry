# Variables

Full reference for Grafana template variables: variable types, syntax, multi-value formatting, chaining, global
built-ins, regex filtering, repeating panels/rows/tabs.

## Contents

- [Variable concepts](#variable-concepts)
- [Variable types](#variable-types)
- [Variable syntax](#variable-syntax)
- [Format options](#format-options)
- [Selection options](#selection-options)
- [Multi-value interpolation](#multi-value-interpolation)
- [Multi-property variables](#multi-property-variables)
- [Filter/Group-by (formerly ad-hoc) variables](#filtergroup-by-formerly-ad-hoc-variables)
- [Chained variables](#chained-variables)
- [Regex filtering](#regex-filtering)
- [Global built-in variables](#global-built-in-variables)
- [URL sync and `skipUrlSync`](#url-sync-and-skipurlsync)
- [Repeating panels, rows, and tabs](#repeating-panels-rows-and-tabs)
- [Variable best practices](#variable-best-practices)

---

## Variable concepts

A variable is a placeholder for a value. Variables appear as dropdowns (or text inputs/switches) above the dashboard, in
the dashboard controls menu, or hidden. Referenceable in:

- Data source queries (`up{env="$env"}`)
- Panel and dashboard titles, descriptions
- Panel and dashboard links
- Repeat options (multi-value)
- Transformation text fields
- Annotation queries

Variables interpolate **before** the query reaches the data source. Interpolation applies data-source-specific escaping
(regex for Prometheus/InfluxDB, Lucene for Elasticsearch, glob for Graphite). Use `:raw` to bypass.

## Variable types

| Type            | Description                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| **Query**       | Data-source query returns the option list (metric names, label values, hosts).                       |
| **Custom**      | Manually-defined list — CSV or JSON array.                                                           |
| **Text box**    | Free-text input. Best for high-cardinality dimensions you don't want to enumerate.                   |
| **Constant**    | Hidden constant value; exported as an import option in dashboard exports.                            |
| **Data source** | Switch the dashboard's data source. Filterable by name regex.                                        |
| **Interval**    | Time spans (`1m`, `1h`, `1d`). Dashboard-wide `group by time`. Supports `auto` based on time range.  |
| **Filters**     | Key/value filters auto-applied to all queries against a supported data source. Was "ad-hoc filters". |
| **Switch**      | Two-state toggle (`true/false`, `1/0`, `yes/no`, or custom enabled/disabled values).                 |
| **System**      | Built-in like `$__auto_interval_<name>`, `$__interval`, `$__rate_interval`. Not user-created.        |

### Query variable

- Pick a data source; query syntax is data-source-specific (Prometheus `label_values(metric, label)`, InfluxDB
  `SHOW TAG VALUES`, SQL `SELECT DISTINCT col FROM table`).
- **Regex** filters or rewrites returned options. See [Regex filtering](#regex-filtering).
- **Apply regex to** — `Variable value` (default) or `Display text`.
- **Sort** — `Disabled` (data-source order), `Alphabetical` (asc/desc), `Numerical` (asc/desc),
  `Alphabetical (case-insensitive)` (asc/desc).
- **Refresh** — `On dashboard load` or `On time range change`. Use the latter only when the variable query depends on
  time (else it adds latency for no benefit).
- **Static options** — pin custom options (e.g., `All clusters`) alongside query results.
- **Selection options** — Multi-value, Allow custom values, Include All (with optional **Custom all value**).
- Query results are typically strings; numeric/other types may need data-source-specific conversion (e.g., Azure
  `tostring()`).
- Some data sources support `__text`/`__value` (or `text`/`value`) field naming for display text separate from variable
  value (PostgreSQL, MySQL, MSSQL).

### Custom variable

- **CSV** — flat list. Use `key1 : value1,key2 : value2` for distinct text/value pairs.
- **JSON** — array of objects with any properties. Enables multi-property variables (see below).
- Selection options: Multi-value, Allow custom values (CSV only), Include All.

### Text box variable

- Free input with optional default. Highest flexibility, lowest discoverability.
- For high-cardinality fields (user ID, request ID) or filters meant to update many panels at once.

### Constant variable

- Single hidden value; not UI-updatable without editing settings.
- For metric-path prefixes externalized from queries (e.g., `$prefix.cpu.utilization`).
- On dashboard export, constants become import-time options.
- `skipUrlSync: true` by default.

### Data source variable

- **Type** — data-source plugin type (e.g., `prometheus`). All instances populate the dropdown.
- **Instance name filter** — regex limiting instances (blank = all).
- Multi-value / Include All supported.
- Reference in queries via `datasource: ${var-name}` in panel JSON.

### Interval variable

- **Values** — comma-separated. Units: `s`, `m`, `h`, `d`, `w`, `M`, `y`. Default: `1m,10m,30m,1h,6h,12h,1d,7d,14d,30d`.
- **Auto option** — adds `auto`. Configure:
  - **Step count** — time-range divisor (default 30).
  - **Min interval** — floor for auto-calculated steps.
- Reference as `$myinterval` in `group by`, `summarize()`, date histogram interval, etc.

### Switch variable

- **Value pair type**: `True / False`, `1 / 0`, `Yes / No`, or `Custom` (Enabled/Disabled values).
- Renders as a toggle in the controls bar.
- For conditional query logic (`up{job="x"} and ($debug_mode == "true" or on() vector(0))`).

## Variable syntax

- `$varname` — short form. Cannot be used mid-word.
- `${var_name}` — full form for interpolating inside a larger expression: `apps.${env}.cpu`.
- `${var_name:<format>}` — full form with explicit format override. See [Format options](#format-options).
- `[[varname]]` — deprecated; don't use.
- `${var.property}` — access a property on a multi-property variable.
- `${var.0}` — array indexing (0-based) on a multi-value variable. `${query0.1}` is the second element.

## Format options

Override data-source default escaping with `${var:format}`.

- `csv` — `test1,test2`
- `distributed` — OpenTSDB-style `test1,host=test2`
- `doublequote` — `"test1","test2"`, embedded `"` escaped as `\"`
- `singlequote` — `'test1','test2'`, embedded `'` escaped as `\'`
- `sqlstring` — `'test1','test2'`, embedded `'` escaped as `''`
- `glob` — Graphite glob `{test1,test2}`
- `lucene` — Elasticsearch `("test1" OR "test2")`, values escaped
- `regex` — `(test1\.|test2)`, values regex-escaped
- `pipe` — `test1.|test2`
- `json` — `["test1", "test2"]`
- `join` (default `,`) or `join:<delim>` — joined with custom delimiter (`${servers:join:&}`)
- `percentencode` — URL-encoded
- `queryparam` — `var-servers=test1&var-servers=test2`
- `customqueryparam:<name>:<value-prefix>` — custom parameter name and value prefix
- `text` — display-text representation; multi: `text1 + text2`
- `raw` — no data-source escaping; pass values through as-is

Invalid format falls back to `glob`.

## Selection options

- **Multi-value** — multiple selections from the dropdown. Interpolation joins values per the data source's expected
  format (see [Multi-value interpolation](#multi-value-interpolation)).
- **Allow custom values** — users can type values not in the list.
- **Include All option** — adds an `All` choice selecting every value.
- **Custom all value** — when set, `All` interpolates to this string (e.g., `.*`, `*`, `all`) instead of the
  concatenated list. **Not escaped** — match to the data source's syntax.

## Multi-value interpolation

Default behaviors per data source (no `:format` override):

- **Graphite** — `{host1,host2,host3}` (glob).
- **Prometheus / InfluxDB** — `(host1|host2|host3)` with each value regex-escaped.
- **Elasticsearch** — `("host1" OR "host2" OR "host3")` with each value Lucene-escaped.
- **MySQL** (default) — `'host1','host2'` (single-quoted CSV).

Override with `:format` when context requires (e.g., MySQL `IN` clause without quotes: `${hosts:csv}`).

When **Custom all value** is set, the variable is **never** auto-joined — Grafana uses the custom string as-is. Use a
regex/wildcard the data source understands (`.*` for Prometheus, `*` for Graphite, `(.*)` for an explicit regex group).

## Multi-property variables

Available for **Custom** and some **Query** types (Infinity, PostgreSQL, ...).

Custom JSON example:

```json
[
  { "value": "1", "text": "Development", "aws": "dev", "azure": "development", "google": "googledev" },
  { "value": "2", "text": "Staging",     "aws": "stag", "azure": "staging",     "google": "googlestag" },
  { "value": "3", "text": "Production",  "aws": "prod", "azure": "production",  "google": "googleprod" }
]
```

Reference properties with `${envVar.aws}`, `${envVar.azure}`. Nested properties (`${user.address.city}`) supported.

Use this instead of parallel variables for the same logical concept across data sources.

## Filter/Group-by (formerly ad-hoc) variables

Renamed and extended in Grafana v13; the dashboard schema still calls them `"kind": "AdhocVariable"` (or
`"GroupByVariable"` in V2). Enable the `dashboardUnifiedDrilldownControls` feature toggle.

- Auto-applies key/value filters to all panel queries against the configured data source.
- Supported data sources: **Dashboard** (special — wraps another panel), **Prometheus**, **Loki**, **InfluxDB**,
  **Elasticsearch**, **OpenSearch**.
- **Static key dimensions** (optional) — CSV of dimension keys scoping the dropdown when the data source can't enumerate
  them.
- For unsupported data sources, use the **Dashboard** data source: create a new panel, set source = an existing panel,
  toggle **AdHoc Filters** on. Filtering propagates through this proxy.
- Table and bar-chart visualizations expose **filter icons** on hover — clicking adds `key = value` to the filter
  variable for instant drilldown.
- Group-by (Prometheus, Loki) lets viewers append a dashboard-wide grouping dimension. The Group-by element auto-injects
  `by (<group>)` into compatible queries.

When linking out via data links, **Include current time range** and **Include all variables** preserve filter state in
the destination. List `__all_variables` before any explicit `var-<name>=...` to keep selections intact.

## Chained variables

A query variable can reference another variable in its query, creating a parent → child dependency.

Graphite example:

```text
app:    apps.*
server: apps.$app.*
```

InfluxDB example:

```sql
datacenter: SHOW TAG VALUES WITH KEY = "datacenter"
host:       SHOW TAG VALUES WITH KEY = "hostname" WHERE "datacenter" =~ /^$datacenter$/
```

Grafana detects dependencies and refreshes children when the parent changes. No hard depth limit, but each chain link
adds a round-trip — keep chains under 4 levels in practice.

Best practice for chained variables: duplicate the parent (copy icon), then extend the query. New variables append at
the bottom; drag to position children after parents.

## Regex filtering

Query variables expose a **Regex** field that filters returned options. Three behaviors:

- **Filter** — only matching options kept: `/(01|02)$/` keeps `backend_01` and `backend_02`.
- **Filter and rewrite** — capture group(s) replace the value: `/.*(01|02)/` keeps only `01` and `02`.
- **Prometheus label extraction** — `/.*instance="([^"]*).*/` extracts the `instance` label from raw series.

Named capture groups `text` and `value` separate display text from variable value:

```text
/chip_name="(?<text>[^"]+)|chip="(?<value>[^"]+)/g
```

produces entries where `chip_name` is display text and `chip` is the value. Only `text` and `value` are supported as
named capture group names.

Use `/.../g` for global match when you need multiple captures per line. Wrapping in `/.../ ` is recommended — bare match
strings work but behavior changed in Grafana 9.0+.

## Global built-in variables

Available everywhere variables can be used.

- **`$__dashboard`** — current dashboard title.
- **`$__from`** / **`$__to`** — time range as Unix milliseconds. Format options:
  - `${__from}` — `1594671549254` (ms epoch, default)
  - `${__from:date}` — `2020-07-13T20:19:09.254Z` (ISO 8601)
  - `${__from:date:iso}` — same as above
  - `${__from:date:seconds}` — `1594671549` (seconds epoch)
  - `${__from:date:YYYY-MM}` — any Moment.js format that does not contain `:`. Uses browser time; for UTC use
    `${__from:date}` or `${__from:date:iso}`.
- **`$__interval`** — auto-calculated group-by interval = `(to - from) / resolution`. Use as the bucket size in
  `group by` or `summarize`. **Use this, not the legacy `$interval`.**
- **`$__interval_ms`** — `$__interval` in milliseconds.
- **`$__org`** — `${__org.id}` and `${__org.name}`.
- **`$__user`** — `${__user.id}`, `${__user.login}`, `${__user.email}`.
- **`$__range`** — `to - from`. Only Prometheus/Loki. `$__range_ms` and `$__range_s` for unit variants.
- **`$__rate_interval`** — Prometheus-specific; use in `rate()` to satisfy the 4× scrape-interval rule automatically.
  `$__rate_interval_ms` for ms.
- **`$timeFilter`** / **`$__timeFilter`** — currently-selected time range as a query expression. Auto-applied by
  InfluxDB; manually used in MySQL/PostgreSQL/MSSQL/Azure Log Analytics.
- **`$__timezone`** — current timezone (`utc`, IANA name, or browser-detected).
- **`$__name`** — singlestat-only legacy variable (singlestat removed in Grafana 8).

## URL sync and `skipUrlSync`

Variable values are mirrored to the URL as `var-<name>=<value>`. Multiple selections produce repeated parameters:
`var-server=A&var-server=B`.

Set `skipUrlSync: true` to:

- Keep URLs clean.
- Prevent URL-driven overrides (defensive against shared-link tampering).
- Avoid exposing sensitive values in shared dashboards.

Constants default to `skipUrlSync: true`.

URL-controlled time range:

- `from=<ms-epoch>` / `to=<ms-epoch>` — absolute range.
- `from=now-6h` / `to=now` — relative range.
- `time=<ms>&time.window=<ms>` — derived range = `time-window/2` to `time+window/2`.

## Repeating elements

A multi-value variable can drive auto-creation of panels, rows, or tabs — one instance per selected value.

### Repeat a panel

Panel sidebar → **Repeat options**:

- **Repeat by variable** — pick a multi-value variable.
- **Repeat direction** — `Horizontal` (side-by-side; width auto-adjusts; cannot mix with other panels on the same row)
  or `Vertical` (column; width matches the source panel).
- **Max per row** — when horizontal, cap panels per row (drop-down values; affects layout reflow).

Put the variable name in the panel/row/tab title (e.g., `CPU usage — $host`) so each instance is clearly labeled.

Set **Repeat by variable** to `Disable repeating` to stop.

### Repeat a row

Dashboard editing → row sidebar → **Repeat options**. Each row instance carries the variable's current value; child
panels inherit it through normal interpolation.

### Repeat a tab

Same as rows. Each tab renders per variable value.

### Reflow after changes

Repeat layout updates when the variable selection changes. After editing a repeating panel's structure, reload the
dashboard to propagate changes to all instances.

## Variable best practices

- **Order matters.** Dropdowns render left-to-right per `templating.list` order. Put the most frequently changed at the
  top.
- **Dependencies follow ordering.** Place a chained child immediately after its parent. No visual indication of
  dependency in the UI — author for legibility.
- **Default to empty selection** — the topmost option is preselected by default. To pre-populate "All" with a wildcard,
  enable **Include All option** and set **Custom all value** to `.+` (Prometheus/Loki) or `*` (Graphite).
- **Use constants for path prefixes** to keep queries portable across environments.
- **Custom over query variables** for static lists that never change — saves a round-trip per dashboard load.
- **Indexed multi-value access** (`${var.0}`, `${var.1}`) preserves array structure; useful when referencing specific
  positions.
- **Test with the variable preview** — every variable editor shows a live "Preview of values" panel. Confirm before
  saving.
- **Limit chained depth** to 2–3 levels; deep chains amplify variable refresh latency on every change.
