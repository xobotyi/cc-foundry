---
name: dashboards
description: >-
  Grafana dashboard authoring: JSON model (Classic and V2), panel types and selection, standard options, thresholds,
  value mappings, field overrides, transformations, variables (query/custom/interval/filter), repeating panels and rows,
  annotations, dashboard/panel/data links, and library panels. Invoke whenever task involves any interaction with
  Grafana dashboards — creating, editing, reviewing, debugging, or understanding dashboard configuration.
---

# Grafana Dashboards

Dashboards are JSON: panels on a 24-column grid, fed by data-source queries, shaped by client-side transformations,
styled by standard options and overrides, parameterized by template variables, connected through annotations and links.
Data shape drives the visualization; variables make dashboards reusable; links carry context across navigation.

## Scope

- **In scope:** dashboard JSON (Classic and V2 schemas), panel selection and configuration, standard options,
  thresholds, value mappings, field overrides, transformations, all variable types, repeating panels/rows/tabs,
  annotations, dashboard/panel/data links, library panels, version history, panel editor and inspector.
- **Out of scope:**
  - **Data source query languages** — `promql`, `logsql`, `metricsql` are sibling skills. This skill governs how queries
    wire into panels, not query syntax.
  - **Grafana Alerting** — alert rules, contact points, notification policies belong to the `alerting` sibling skill.
    Panel-attached alert rules and the panel editor's **Alert** tab are integration points only.
  - **Provisioning, file-based dashboards, dashboards-as-code tooling** — Terraform, Grizzly, Foundation SDK, Helm
    charts, `provisioning/dashboards/*.yaml` belong to the `provisioning` sibling skill. This skill covers the JSON
    those tools emit.

## References

- **Dashboard JSON model (Classic + V2)** — [`${CLAUDE_SKILL_DIR}/references/json-model.md`] Top-level fields, panel
  object structure, `gridPos`, `timepicker`/`templating`/`annotations` blocks, library panel JSON shape, V2 Resource
  kinds, schema versioning, direct JSON edit mechanics.
- **Panels and visualizations** — [`${CLAUDE_SKILL_DIR}/references/panels.md`] Visualization-selection rules, panel-type
  catalog with `type` IDs, panel editor and inspector structure, library panel lifecycle, panel styles.
- **Panel deep dives (time series, stat, table)** — [`${CLAUDE_SKILL_DIR}/references/panel-deep-dives.md`] Per-panel
  configuration: time-series graph styles (line width, fill opacity, gradient mode, interpolation), axis placement,
  legend, tooltip, special overrides (Transform, Fill below to); stat value options, text modes, color and graph modes;
  table cell types, column filtering, sorting, tooltip-from-field, footer calculations.
- **Panel options** — [`${CLAUDE_SKILL_DIR}/references/panel-options.md`] Standard options (unit, min/max, decimals,
  color scheme, display name), thresholds, value mappings, field overrides, override precedence, display-name
  expressions.
- **Variables** — [`${CLAUDE_SKILL_DIR}/references/variables.md`] All variable types, syntax, format options, selection
  options, multi-value interpolation, multi-property variables, chained variables, regex filtering, global built-ins,
  URL sync, repeating panels/rows/tabs.
- **Transformations** — [`${CLAUDE_SKILL_DIR}/references/transformations.md`] Full catalog grouped by purpose (adding
  fields, filtering, reshaping, grouping, histograms, time-series modeling), common patterns, debugging mechanics.
- **Annotations and links** — [`${CLAUDE_SKILL_DIR}/references/annotations-links.md`] Native annotations, annotation
  queries, time regions, dashboard/panel/data links, data link variables, cross-dashboard navigation patterns.

## Dashboard structure

Six top-level concerns:

- **Identity** — `uid` (stable; externalize references via this), `title`, `tags`, `version`, `schemaVersion`. Never
  hand-edit `schemaVersion` or `version`.
- **Time** — `time.from`/`time.to`, `timezone`, `refresh`, `timepicker` (refresh intervals + quick ranges).
- **`templating.list`** — template variables. Array order = render order left-to-right.
- **`annotations.list`** — annotation queries. Built-in `-- Grafana --` query is always present.
- **`panels`** — panel objects. Layout via `gridPos` (24 columns × 30px per row unit).
- **`links`** — dashboard-level links (top of dashboard or controls menu).

Two schemas. **Classic** is the historical default and what grafana.com dashboards use. **V2 Resource**
(Kubernetes-style `apiVersion: dashboard.grafana.app/v2beta1`) supports advanced layouts and conditional rendering and
is the preferred format for new dashboards-as-code. See `json-model.md` for both schemas and the full panel object spec.

## Panel selection

Match data shape to visualization. Grafana's auto-suggestion reads shape, not intent — don't accept it blindly.

- Time-stamped numeric series → **Time series**
- Categorical numeric (one value per category) → **Bar chart**
- Distribution of values → **Histogram** (point-in-time) or **Heatmap** (over time)
- Discrete state changes over time → **State timeline**
- Periodic state snapshots → **Status history**
- Headline number with optional sparkline → **Stat**
- One value vs. min/max (radial) → **Gauge**
- Multiple values vs. min/max → **Bar gauge** (gauges scale poorly past 2–3 metrics)
- Proportional parts of a whole, segment count ≤ 7 → **Pie chart**; for ranking use **Bar chart**
- Tabular rows → **Table**; use the `sparkline` cell type with the **Time series to table** transformation for per-row
  trends
- Sequential numeric x that is not time → **Trend**
- Arbitrary x/y scatter → **XY chart**
- Logs/traces/profiles/geospatial/graph → **Logs** / **Traces** / **Flame graph** / **Geomap** / **Node graph**
- Markdown, HTML, or RSS → **Text** / **News**

Panel `type` IDs in JSON: `timeseries`, `stat`, `gauge`, `bargauge`, `barchart`, `histogram`, `heatmap`, `piechart`,
`table`, `logs`, `nodeGraph`, `traces`, `flamegraph`, `canvas`, `geomap`, `text`, `news`, `dashlist`, `alertlist`,
`annolist`, `state-timeline`, `status-history`, `candlestick`, `trend`, `xychart`.

## Panel configuration

Display pipeline order:

1. **Queries** return data frames.
2. **Transformations** reshape frames (client-side, ordered).
3. **Standard options** apply per-field (unit, min/max, decimals, color scheme, display name).
4. **Value mappings** translate values to display text and color.
5. **Thresholds** drive conditional colors (and lines/regions on supporting panels).
6. **Field overrides** apply per-field property changes. Last write wins.
7. Visualization renders.

### Standard options rules

- **Always set base units.** Pick from the catalog (`Time → seconds`, `Data → bytes`, `Throughput → reqps`). Don't
  pre-scale in queries — let Grafana scale for display.
- **For seconds-since-epoch timestamps**, multiply by 1000 with `Add field from calculation` → `Binary operation` before
  applying a `Date & time` unit. Grafana's date/time formats expect milliseconds.
- **`String` unit displays all decimals** when you need exact values without rounding.
- **Color scheme by intent:**
  - Categorical / series-name-stable → `Classic palette`
  - Series names change run-to-run → `Classic palette (by series name)`
  - Value-driven → `From thresholds (by value)` or `Single/Multiple continuous colors (by value)`
- **`No value`** — set a placeholder (`-`, `N/A`, `0`) so blank panels are unambiguous.

### Thresholds rules

- **Defaults**: `Base = green`, `80 = red`, `Mode = Absolute`. Override per panel — don't ship the default unchanged.
- **`Absolute`** when threshold values are real-domain numbers. **`Percentage`** only when comparing to dynamic
  `min`/`max`.
- **On time-series-like panels**, set `Show thresholds` explicitly (`As lines`, `As filled regions`) — default is `Off`.
- Table panels apply threshold colors only when cell display mode is `Color text` or `Color background`.

### Value mappings rules

- **Mappings bypass unit formatting** for matched values. Don't combine a mapped value with a unit suffix and expect
  both.
- **Order matters.** Grafana checks mappings top-to-bottom; first match wins.
- **`Special → Null` → "N/A"** to make missing data unambiguous in Stat/Table.

### Field overrides rules

- Match by **name** (exact), **regex**, **type**, **query refId**, or **values** (reducer condition).
- **Don't rename via override.** `Display name` changes the rendered label only; for actual field renaming use **Rename
  by regex**.
- **Precedence**: `defaults → standard options → value mappings → thresholds → overrides`. Reorder in the **Overrides**
  tab when later rules need to win.

## Transformations

Run in listed order; each step sees the previous output. Text fields accept dashboard variables (interpolated before
execution).

- **Default order** for "shape and aggregate":
  1. `Filter data by values` / `Filter fields by name` — drop unneeded data first.
  2. `Convert field type` / `Extract fields` — coerce types.
  3. `Add field from calculation` — derive fields.
  4. `Group by` / `Reduce` — aggregate.
  5. `Organize fields by name` — final naming/ordering.
- **Always wrap counters in `rate()` or `increase()` at the query level** before transformations — `Reduce` on raw
  counters is meaningless. (Query-language concern; see `promql`.)
- **`Join by field` on `Time` (Outer join, time series)** aligns multiple queries before visualizing as Table or
  computing cross-query expressions.
- **`Partition by values`** instead of N queries with different `WHERE` clauses.
- **`Time series to table transform`** for "row per entity, sparkline in the last column" tables.
- **Debug** with the bug icon (input vs. output frames) or eye icon (disable to bisect). Toggle **Table view** in the
  panel preview to see raw post-transformation frames.
- **Remove unused transformations.** Disabled-but-present steps still cost CPU.

## Variables

Variables interpolate **before** queries reach the data source, with data-source-specific escaping (regex for
Prometheus/InfluxDB, Lucene for Elasticsearch, glob for Graphite). Use `${var:raw}` to bypass.

### Variable type selection

- **Query** — options from a data-source query. Default for label/tag/host enumeration.
- **Custom** — static list (CSV or JSON). Faster than a query for values that never change.
- **Text box** — free input. For high-cardinality fields you can't enumerate.
- **Constant** — hidden, fixed value. For path prefixes that change on export/import.
- **Data source** — switch a dashboard's data source instance (multi-environment dashboards).
- **Interval** — `1m`, `1h`, `1d` time spans. Reference as `$myinterval` in group-by/summarize.
- **Filters** (formerly ad-hoc) — auto-applied key/value filters. Prometheus, Loki, InfluxDB, Elasticsearch, OpenSearch,
  and the special Dashboard data source.
- **Switch** — two-state toggle for conditional query logic.

### Variable rules

- **`$varname` for standalone references; `${varname}` to interpolate inside a larger expression.** Never use deprecated
  `[[varname]]`.
- **`Refresh: On time range change`** only when the variable query depends on time. Otherwise `On dashboard load` —
  saves a refetch per range change.
- **Order variables by dependency**: parents before children. Grafana renders dropdowns left-to-right in list order.
- **`Custom all value`** is not escaped — match the data source's syntax: `.+` or `.*` for Prometheus/Loki regex; `*`
  for Graphite glob; `(.*)` for an explicit regex group.
- **Use `$__rate_interval` for Prometheus `rate()`** — handles the 4× scrape-interval rule automatically.
- **For ms-epoch URLs, use `${__from}` / `${__to}`**. For ISO, use `${__from:date:iso}`. For UTC, use `:date` or
  `:date:iso` (other formats use browser time).
- **Multi-property variables** (custom JSON, some query types) — define once, reference properties as `${var.aws}`,
  `${var.azure}`. Prefer over parallel variables for the same concept.
- **`skipUrlSync: true`** when the variable shouldn't be URL-overridable (sensitive values, shared dashboards).
  Constants default to this.
- **Repeating panels** — set `Repeat by variable` to a multi-value variable. `Horizontal` panels can't share a row with
  non-repeating panels; `Vertical` matches the source panel's width. Put the variable in the panel title (`CPU — $host`)
  for clarity.

## Annotations

- **Native annotations** added via click in time series, state timeline, candlestick panels (Ctrl/Cmd-click for a point;
  Ctrl/Cmd-click-drag for a region). Stored in Grafana's database.
- **Annotation queries** fetch events from any data source. Configured in `Settings → Annotations`. Each query has its
  own toggle, color, and `Show in: All panels / Selected panels / All panels except` scope.
- **Built-in `-- Grafana --` query** is always present. By default filters by `dashboardId` — Save As **does not** carry
  over manual annotations. To survive duplication, tag annotations and use a tag-filtered query.
- **Tag-filtered annotation queries on externally-shared dashboards leak annotations from all dashboards in the
  organization.** Audit before enabling external sharing on a dashboard with tag filtering.
- **Time regions** shade recurring windows (business hours, weekends). Configure via `Query type: Time regions`;
  supports Cron syntax in the Advanced toggle.

## Links

Three link types, three scopes.

- **Dashboard links** (Settings → Links) — top of dashboard or controls menu. For navigation between dashboards that
  share variables, or "Dashboards with tag X" dropdowns.
- **Panel links** (Panel options → Panel links) — header-icon URLs per panel. For "open the upstream runbook" or "open
  source system." Cannot reference field/value variables.
- **Data links** (Data links and actions) — per-field click targets including value, series, and labels under the
  cursor. For drilldowns and panel-to-panel filtering.

### Data link rules

- **`__url_time_range`** does not auto-insert `?` or `&` — build the query string yourself.
- **`${__all_variables}`** appends every current template variable. Place **before** any explicit `var-<name>=...` so
  explicit values override the wildcard.
- **Linking to another dashboard** — target must have a variable with the **same name** (not label). Otherwise map
  explicitly: `&var-host=${server}`.
- **`__field.displayName`** when fields have been renamed; `__field.name` for the raw name.
- **Actions** trigger unauthenticated browser-originated API calls. Treat URL and body as user-visible. Gate the target
  API with its own auth or proxy through short-lived tokens.
- **`One click`** skips the context menu; only one data link per panel can have it enabled.

## Library panels

Reusable panel definitions referenced by `libraryPanel: { uid, name }` instead of inline config.

- **Create** from a panel → `More → New library panel`. Source panel becomes a library-panel reference; save the
  dashboard to persist.
- **Edits propagate to every instance** on next load.
- **Unlink** breaks the binding for one instance (restores inline config).
- **Replace** swaps one library panel for another at a specific instance.
- **Permissions** follow the parent folder (and explicit RBAC overrides where enabled).
- **Delete** only when no dashboards reference the panel.
- Use library panels for the 2–3 panels you want identical everywhere (single uptime stat, standard request-rate graph).
  Don't libraryize panels you'll specialize per dashboard.

## Version history

- Grafana keeps the **last 20 versions** by default. Override with `[dashboards] versions_to_keep`.
- `Settings → Versions` — pick two and `Compare versions` for text + JSON diff.
- `Restore` creates a **new version** with old content — old versions remain in history.
- **JSON Model** tab in Settings edits raw JSON. Saving runs schema migration if needed.

## Application

When **writing** dashboards:

- Pick panel type from data shape, not Grafana's auto-suggestion.
- Always set units; let Grafana handle scaling.
- Add at least one threshold on health-signaling panels; ship `Show thresholds: As lines` or `As filled regions` on
  time-series-like panels instead of the default `Off`.
- Use variables for environments, namespaces, services — anything you'd otherwise duplicate. Order so dependencies
  render left to right.
- Use `$__rate_interval` (Prometheus) and time-aware globals (`$__interval`, `$__from`, `$__to`) instead of hard-coded
  windows.
- Use transformations sparingly — push aggregation into the query when the data source supports it; transformations
  shape after the fact.
- Apply conventions silently. If an existing dashboard contradicts a convention, follow the dashboard and flag the
  divergence once.

When **reviewing** dashboards:

- Cite the specific JSON path or panel/variable name and show the fix inline.
- State what's wrong and how to fix it.

## Integration

- **Data source query languages** (`promql`, `metricsql`, `logsql`) govern `targets[].expr` contents. This skill governs
  the rest of the panel.
- **`alerting`** governs alert rules and notification routing; panel-attached alert configuration via the panel editor's
  **Alert** tab is the only crossover.
- **`provisioning`** governs file-based dashboard delivery (Terraform, Grizzly, Foundation SDK,
  `provisioning/dashboards/*.yaml`); this skill governs the JSON those tools emit and consume.

## Critical rules

- **`uid` is the durable handle.** Externalize all cross-system references (provisioning, links, scripts) via `uid`,
  never `id` or `title`.
- **Never hand-edit `schemaVersion` or `version`.** Grafana manages both.
- **Set units explicitly on every numeric field that displays values.** No units = no scaling = misleading axes.
- **Wrap counters in `rate()` / `increase()` at the query level** before transformations. Raw counters through `Reduce`
  are meaningless.
- **Order variables so parents render before children.** Visual order = dependency order; no UI indication of
  dependency.
- **Place `${__all_variables}` before any explicit `var-<name>=...`** in data link URLs so explicit values override.
- **Audit tag-filtered annotation queries before externally sharing a dashboard** — they leak across the organization.
- **Treat actions as user-visible, unauthenticated** — never embed credentials or assume the target API is private.
