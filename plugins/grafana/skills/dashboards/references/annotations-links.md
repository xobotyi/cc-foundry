# Annotations and Links

Annotations mark events on graph panels. Three link types (dashboard, panel, data) connect dashboards to each other and
to external systems. This reference covers all four mechanisms and their interpolation variables.

## Contents

- [Annotations](#annotations)
- [Dashboard links](#dashboard-links)
- [Panel links](#panel-links)
- [Data links and actions](#data-links-and-actions)
- [Data link variables](#data-link-variables)
- [Cross-dashboard navigation patterns](#cross-dashboard-navigation-patterns)

---

## Annotations

Annotations render as vertical lines, icons, or shaded regions on graph panels. Each annotation carries a description
and optional tags; hover reveals them.

Annotation-capable visualizations: **Time series**, **State timeline**, **Candlestick**.

### Three ways to create annotations

- **Directly in a panel** — click a data point → `Add annotation`, or `Ctrl/Cmd-click` an empty area. For a region,
  `Ctrl/Cmd-click and drag`. Requires the dashboard saved and the built-in annotation query enabled.
- **HTTP API** — `POST /api/annotations` with `text`, `tags`, `time`, optional `dashboardId`/`panelId`/`timeEnd` for
  region annotations. Returns the annotation ID for later updates.
- **Annotation queries** — fetch existing events from any data source (Prometheus alerts, deploy logs, Loki entries).

Manual annotations are stored in Grafana's database; query-fetched annotations live in the source system.

### Annotation queries

Settings → **Annotations** tab → `Add annotation query`.

Per-query options:

- **Name** — toggle label above the dashboard.
- **Data source** — any data source plugin, or `-- Grafana --` for in-Grafana storage.
- **Enabled** — uncheck to hide without deleting.
- **Hidden** — hide the toggle entirely.
- **Color** — event marker color.
- **Show annotation controls in**:
  - `Above dashboard` (default)
  - `Controls menu` (in the toolbar button)
  - `Hidden`
- **Show in**:
  - `All panels`
  - `Selected panels` — pick from a list.
  - `All panels except` — inverse selection.
- **Query** — data-source-specific. Prometheus: `ALERTS{alertname="..."} > 0`; Loki: `{job="deploys"}`. **Test
  annotation query** validates without saving.

### Built-in `-- Grafana --` annotation query

Always present (named `Annotations & Alerts`). Returns:

- Manually-added annotations on this dashboard.
- Alert state-history events.

Filter modes:

- **Filter by dashboard** (default) — annotations whose `dashboardId` matches.
- **Filter by tags** — annotations matching all supplied tags. `Match any` toggles to OR.

When a dashboard is duplicated via **Save As**, manual annotations on the original do **not** appear on the copy
(`dashboardId` differs). To carry annotations across, tag them and use a tag-filtered query.

> Warning: a tag-filtered annotation query on an **externally shared** dashboard returns annotations from **all
> dashboards** in the organization. Audit before enabling external sharing on a dashboard with tag filtering.

### Time regions

Pseudo-annotation type that shades recurring time windows (business hours, maintenance, weekends).

- **Query type** → `Time regions`.
- **From / To** — days of week and times.
- **Timezone** — defaults to dashboard timezone.
- **Advanced** — Cron syntax for finer control (e.g., `0 9 * * 1-5` for 9am weekdays).

### Annotation JSON shape

```json
{
  "name": "Deployments",
  "datasource": { "type": "prometheus", "uid": "prom-uid" },
  "enable": true,
  "hide": false,
  "iconColor": "rgba(255, 96, 96, 1)",
  "type": "tags",
  "tags": ["deploy"],
  "matchAny": false,
  "filter": { "exclude": false, "ids": [3, 8] }
}
```

`filter.ids` are panel IDs. `exclude: true` flips between `Selected panels` and `All panels except`.

## Dashboard links

Render at top of dashboard (or in controls menu).

- **Dashboards** type — links discovered by tag.
- **Link** type — single fixed URL.

Settings → **Links** tab → `Add dashboard link`.

### Dashboards-type link

- **With tags** — limits the linked set. Empty = every dashboard.
- **Show as dropdown** — collapses into a dropdown (recommended past 3–4 destinations); add a dropdown **Title** for
  clarity.
- **Include current time range** — appends `?from=...&to=...` to each link.
- **Include current template variable values** — appends `var-<name>=...`. Matches variable name to variable name; if
  the target's variable has a different name, the value won't transfer.
- **Open link in new tab** — `target="_blank"`.
- **Show in controls menu** — moves the link from top-of-dashboard bar to toolbar control menu.

### Link-type link

- **URL** — any URL; supports variable interpolation (`https://grafana.com/.../$service`).
- **Tooltip** — hover text.
- **Icon** — built-in set (`external link`, `dashboard`, `question`, `info`, `bolt`, `doc`, `cloud`).
- Same `Include current time range` / `Include current template variable values` / `Open in new tab` /
  `Show in controls menu` options.

For external-system URLs, build query strings manually — Grafana does not URL-encode user-supplied URLs beyond standard
variable formatting (`:percentencode` or `:queryparam` for safe params).

## Panel links

Per-panel; rendered as an icon next to the panel title.

Configured in panel sidebar → **Panel options → Panel links** → `Add link`.

- **Title** — link label.
- **URL** — any URL. Supports template variables (Ctrl/Cmd+Space for autocomplete) and time variables (`from`, `to`,
  `time`, `time.window`).
- **Open in new tab** — `target="_blank"`.

Panel links cannot use field- or value-level variables — those are reserved for data links.

## Data links and actions

Per-field click targets that include the **value under the cursor**, **series name**, **field labels** in the URL or API
call.

Configured in panel sidebar → **Data links and actions** → `+ Add link` or `+ Add action`.

Supported visualizations: Bar chart, Bar gauge, Candlestick, Canvas, Gauge, Geomap, Heatmap, Histogram, Pie chart, Stat,
State timeline, Status history, Table, Time series, Trend, XY chart.

### Data link configuration

- **Title** — context-menu label (required).
- **URL** — destination. Type `$` (or Ctrl/Cmd+Space) to insert a data link variable.
- **Open in new tab** — `target="_blank"`.
- **One click** — clicking anywhere opens the link directly (skips context menu). Only one data link per panel can have
  **One click** on. Supported on a subset of visualizations.

### Action configuration

Actions trigger unauthenticated API calls (POST/PUT/GET) directly from the panel.

Supported visualizations: Bar chart, Candlestick, State timeline, Status history, Table, Time series, Trend, XY chart.

- **Title** — UI label.
- **Confirmation message** — prompt before firing.
- **Method** — `POST`, `PUT`, or `GET`.
- **URL** — request URL with variable interpolation.
- **Variables** — `(Key, Name, Type)` triples; reference in URL/body as `$key`. User supplies values when invoking.
- **Query parameters** — `(Key, Value)` pairs.
- **Headers** — `(Key, Value)` plus **Content-Type** (`application/json`, `text/plain`, `application/XML`,
  `application/x-www-form-urlencoded`).
- **Body** — request body.

Actions run from the browser without authentication — gate the target API with its own auth/CSRF or use a proxy with
short-lived tokens. Treat URL and body as user-visible.

Multiple data links/actions are ordered by drag in the configuration list and render in that order in the context menu.

## Data link variables

Insert via the autocomplete (`$`) in any data link or action URL/body.

### Time range

- **`__url_time_range`** — current time range as query parameters (`?from=now-6h&to=now`). When using in a URL, add `?`
  or `&` yourself; the variable does **not** auto-insert separators.
- **`__from`** / **`__to`** — same as global `${__from}` / `${__to}`; see `variables.md` § Global built-in variables.

### Series and field

- **`__series.name`** — series name.
- **`__field.name`** — raw field name.
- **`__field.displayName`** — display name (after any rename overrides). Use this when fields have been renamed.
- **`__field.labels.<LABEL>`** — single label value. For labels with dots: `__field.labels["my.label"]`.

### Value

- **`__value.time`** — value timestamp in ms epoch.
- **`__value.raw`** — raw value as returned.
- **`__value.numeric`** — numeric representation.
- **`__value.text`** — text representation.
- **`__value.calc`** — calculation name when the value came from a reducer (`mean`, `last`, ...).

Value variables render differently based on the panel's tooltip mode (single vs shared) — verify in the UI.

### Cross-row data

- **`__data.fields[i]`** — value of field `i` (0-based) on the same row.
- **`__data.fields["NameOfField"]`** — value of the named field on the same row.
- **`__data.fields[1].labels.cluster`** — labels on another field.

### Template variables

- **`${var-myvar:queryparam}`** — render variable `myvar` as URL query parameters in the destination URL.
- **`${__all_variables}`** — every current template variable as `var-<name>=<value>` pairs.

Selection state mapping with `:queryparam`:

| Selection       | Result                              |
| --------------- | ----------------------------------- |
| One value       | `var-myvar=value1`                  |
| Multiple values | `var-myvar=value1&var-myvar=value2` |
| `All` selected  | `var-myvar=All`                     |

When linking to another dashboard:

- The target must have a variable with the **same name** (not the same label).
- Labels are display-only; URL parameters use variable names.
- If the destination uses a different name, map explicitly: `&var-host=${server}`.

## Cross-dashboard navigation patterns

- **Drill-down link with full context** — data link URL:
  `/d/<target-uid>/<slug>?${__all_variables}&${__url_time_range}&var-host=${__field.labels.host}`. Variables propagate;
  the clicked value becomes a specific filter on the target.
- **Same-dashboard refilter via link** — point a data link at the current dashboard's URL with new `var-` parameters.
  Clicking sets the filter without leaving; the dashboard reloads with new values.
- **Table → bar chart panel-to-panel filter** — table value's filter icon adds a `key = value` ad-hoc filter; other
  panels using the same data source reflect the filter.
- **Annotation drilldown** — render a deployment annotation with a description containing a Markdown link to the
  deploy's PR or release notes; users click through from the annotation tooltip.
- **External system link** — dashboard link to a GitHub issue creator with the dashboard name as the title:
  `https://github.com/.../issues/new?title=${__dashboard}%20alert`. Combine with `:percentencode` for safe URL escaping.

Time-range encoding cheat sheet:

| Need                             | URL parameter form                                    |
| -------------------------------- | ----------------------------------------------------- |
| Absolute range                   | `from=<ms-epoch>&to=<ms-epoch>`                       |
| Relative range                   | `from=now-6h&to=now`                                  |
| Window around an event           | `time=<ms-epoch>&time.window=<ms>` (10s window etc.)  |
| Source dashboard's current range | `${__url_time_range}` (expands to `?from=...&to=...`) |
