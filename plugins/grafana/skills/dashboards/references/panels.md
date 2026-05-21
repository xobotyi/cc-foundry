# Panels and Visualizations

Catalog of built-in Grafana panel types with selection guidance, panel editor layout, and library panel mechanics.

## Contents

- [Choosing a visualization](#choosing-a-visualization)
- [Visualization catalog](#visualization-catalog)
- [Panel editor structure](#panel-editor-structure)
- [Library panels](#library-panels)
- [Panel inspector](#panel-inspector)

---

## Choosing a visualization

Match data shape to panel type. Grafana suggests visualizations from query output shape — a starting point, not the
answer.

| If the data is...                                  | Pick                                         |
| -------------------------------------------------- | -------------------------------------------- |
| Time-stamped numeric series                        | **Time series** (default, supports alerts)   |
| Categorical numeric (one value per category)       | **Bar chart**                                |
| Distribution of values                             | **Histogram** or **Heatmap**                 |
| Discrete state changes over time                   | **State timeline**                           |
| Periodic state snapshots                           | **Status history**                           |
| One headline number with optional sparkline        | **Stat**                                     |
| One value vs. min/max (radial)                     | **Gauge**                                    |
| One value vs. min/max (linear)                     | **Bar gauge**                                |
| Proportional parts of a whole                      | **Pie chart**                                |
| Tabular numeric/string rows                        | **Table**                                    |
| Sequential numeric x that is not time              | **Trend**                                    |
| Arbitrary x/y scatter                              | **XY chart**                                 |
| OHLC financial data                                | **Candlestick**                              |
| Logs                                               | **Logs**                                     |
| Traces                                             | **Traces**                                   |
| Profiling stacks                                   | **Flame graph**                              |
| Geospatial points/polygons                         | **Geomap**                                   |
| Directed graph / nodes and edges                   | **Node graph**                               |
| Free-form canvas with placed elements              | **Canvas**                                   |
| Markdown / HTML / RSS / link list / annotation log | **Text**, **News**, **Dashboard list**, etc. |

Heuristics:

- Default to **Time series** for time-stamped data; switch only with a specific reason (categorical x, state changes,
  headline number).
- **Stat** with **sparkline** instead of small time-series for glance-only summaries.
- Prefer **Bar gauge** over **Gauge** when comparing multiple values; gauges scale poorly past 2–3 metrics.
- **Heatmap** for distribution-over-time (latency by bucket per minute); **Histogram** for distribution at a single
  point in time.
- **Table** with **sparkline** cell type for "row per entity, trend in last column" (via **Time series to table**).
- **Pie chart** only when the proportion is the point and segment count is small (≤ 7). For ranking, use **Bar chart**.

## Visualization catalog

Grouped by category. Panel `type` (JSON) in parentheses.

### Graphs and charts

- **Time series** (`timeseries`) — main graph. Supports alerts, standard options, thresholds (as lines/regions), value
  mappings, field overrides, data links, transformations, annotations.
- **State timeline** (`state-timeline`) — discrete value regions per series over time. Thresholds drive colors for
  numeric inputs.
- **Status history** (`status-history`) — periodic state snapshots; like state timeline but for sparse samples.
- **Bar chart** (`barchart`) — categorical data. First field is the x-axis (categories); remaining numeric fields are
  series.
- **Histogram** (`histogram`) — value distribution as a bar chart with configurable bucket size.
- **Heatmap** (`heatmap`) — 2D density for distribution-over-time or correlation grids.
- **Pie chart** (`piechart`) — proportional segments.
- **Candlestick** (`candlestick`) — OHLC financial data; supports annotations.
- **Gauge** (`gauge`) — radial single-value indicator with thresholds and min/max.
- **Trend** (`trend`) — sequential numeric x (not time), e.g. RPM curves.
- **XY chart** (`xychart`) — scatter or line over arbitrary x/y pairs.

### Stats and numbers

- **Stat** (`stat`) — large single number with optional sparkline. Color background or value text from thresholds.
- **Bar gauge** (`bargauge`) — horizontal/vertical bars; modes: Basic, Gradient, Retro LCD.

### Misc

- **Table** (`table`) — main table. Cell display modes: color text/background, gauge, sparkline, JSON view, image, data
  links cell type.
- **Logs** (`logs`) — log line stream with level highlighting, deduping, wrap.
- **Node graph** (`nodeGraph`) — directed graphs / service maps.
- **Traces** (`traces`) — distributed traces (Tempo/Jaeger/Zipkin).
- **Flame graph** (`flamegraph`) — profiling visualization (Pyroscope).
- **Canvas** (`canvas`) — drag-place elements (icons, text, metric values) on a static or dynamic background.
- **Geomap** (`geomap`) — map with layered points/polygons/heat layers.

### Widgets

- **Dashboard list** (`dashlist`) — discover-by-tag dashboard links.
- **Alert list** (`alertlist`) — alert state board.
- **Annotations list** (`annolist`) — searchable annotation log.
- **Text** (`text`) — markdown or sanitized HTML.
- **News** (`news`) — RSS feed reader.

Additional panel types ship via grafana.com plugins.

## Panel editor structure

Click **Edit** on a panel or press `e` while hovering. Three regions:

- **Visualization preview** (top) — live render; **Table view** toggle exposes raw post-transformation data for
  troubleshooting. Time range and refresh controls live here.
- **Data section** (left) — tabs:
  - **Queries** — data source, `Add query` (`A`, `B`, ...), saved queries, expressions (server-side math/reduce/resample
    on query results).
  - **Transformations** — ordered pipeline after queries. Each can be disabled (eye), debugged (bug — shows input/output
    frames), filtered to a specific query (filter), or deleted (trash).
  - **Alert** — alert rules attached to this panel (where supported).
- **Display options** (right sidebar) — visualization-specific options, plus common sections:
  - **Panel options** — title, description, transparent background, panel links, repeat options.
  - **Standard options** — unit, min/max, decimals, display name, color scheme, no-value text.
  - **Value mappings** — value/range/regex/special mappings.
  - **Thresholds** — value/color steps; absolute or percentage; show as lines or regions (where supported).
  - **Data links and actions** — clickable URLs and unauthenticated API calls.
  - **Overrides** — per-field config overrides.

### Panel styles (public preview)

For time series, stat, gauge, bar gauge, bar chart, **Panel styles** in the sidebar offers preconfigured combos of
display options and field config. Styles merge with existing defaults — only fields the style defines change; field
overrides are unaffected. Enable with the `vizPresets` feature toggle.

## Library panels

Centrally-stored reusable panel definition, referenced from any dashboard.

- **Create** — Edit panel → panel menu → **More → New library panel**. Name and folder required. The source panel
  becomes a library-panel reference automatically.
- **Add** — Dashboard → **Add new element → Use library panel**.
- **Edit** — Open any instance, edit, save. Changes propagate to every dashboard using it.
- **Unlink** — Library panels list → click panel → pick a dashboard → **View panel** → panel menu → **More → Unlink
  library panel**. The instance becomes inline; the library panel is unchanged.
- **Replace** — Panel menu → **More → Replace library panel** → pick another.
- **List** — Main menu → **Dashboards → Library panels**. Shows folder, type, referencing dashboards.
- **Delete** — From the library panels list, only when no dashboards reference the panel.
- **RBAC** — Library panel permissions follow folder permissions (and explicit RBAC overrides where enabled).
- **JSON shape** — see `json-model.md` § Library panels.

Library panel changes propagate on next dashboard load. Save the source dashboard after creating to persist.

## Panel inspector

Panel menu → **Inspect**, or press `i` while hovering.

- **Data** — raw query results as a table; switch series, panel data vs. annotations.
- **Stats** — request duration, processing time, data points, series count. For diagnosing slow panels.
- **JSON** — three views: panel JSON, panel data (post-transformation frames), data source query response. Copy exact
  query payloads for support tickets.
- **Query** — queries actually sent to the data source, with variables resolved. Copy to reproduce outside Grafana.
- **Download** — export as CSV, Excel, logs txt, or panel JSON.

Stats and Query tabs are the primary tools for "why is this dashboard slow?" before reaching for the network tab.
