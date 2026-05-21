# Panel Deep Dives

Per-panel configuration for the three highest-traffic visualizations: **Time series**, **Stat**, **Table**. Standard
options, value mappings, thresholds, field overrides, and data links are in `panel-options.md`; this file covers
visualization-specific settings.

## Contents

- [Time series](#time-series)
- [Stat](#stat)
- [Table](#table)

---

## Time series

Default time-stamped-numeric visualization. Renders series as **Lines**, **Bars**, or **Points**.

### Tooltip options

- **Tooltip mode** — `Single` (hovered series only), `All` (every series, hovered in bold), `Hidden`.
- **Values sort order** (mode `All`) — `None`, `Ascending`, `Descending`.
- **Hide zeros** (mode `All`) — drops `0`-valued series from the tooltip list.
- **Hover proximity** — px from cursor to data point to trigger the tooltip.
- **Max width** / **Max height** — tooltip box dimensions (default height 600 px).

### Legend options

- **Visibility** — on/off.
- **Mode** — `List` (default) or `Table`.
- **Placement** — `Bottom` or `Right`.
- **Width** — only when placement is `Right`.
- **Limit** — collapse beyond N entries behind a `Show all` link.
- **Values** — reducers beside each series (any combination of standard calculations).

### Axis options

- **Time zone** placement — `Auto`, `Left`, `Right`, `Hidden`.
- **Placement** (y-axis) — `Auto`, `Left`, `Right`, `Hidden`. `Auto` puts series with the first unit on the left and the
  rest on the right; mixed-unit panels render two y-axes automatically.
- **Label** — y-axis label. Override per series for multi-axis labels.
- **Width** — fixed axis width in px; blank = auto.
- **Show grid lines** — `Auto`, `On`, `Off`.
- **Color** — `Text` (panel text color) or `Series` (per-series color).
- **Show border** — toggle axis border.
- **Scale** — `Linear`, `Logarithmic` (base 2 or 10), `Symlog` (binary/common log with configurable linear-region
  threshold; allows negatives).
- **Centered zero** — center y-axis on zero.
- **Soft min** / **Soft max** — adjusted y-bounds that still allow values past them. For dampening flat-data spikes
  without clipping; use standard **Min** / **Max** for hard limits.

### Annotation options

- **Multi-row annotations** — split each annotation frame into its own row.
- **Annotation clustering** (public preview, `annotationsClustering` feature flag) — merge adjacent point annotations
  into one region.
- **Hide lines and areas** (public preview, same flag) — render only marker icons, no vertical lines or shaded regions.

### Graph styles

- **Style** — `Lines`, `Bars`, `Points`. Combine via overrides.
- **Line interpolation** — `Linear`, `Smooth` (curved), `Step before` (points at end of step), `Step after` (points at
  start of step).
- **Line width** — slider; `0` hides the line (for fill-only visuals).
- **Fill opacity** — slider; drives area fill below the line.
- **Gradient mode** — `None`, `Opacity` (denser at higher y), `Hue` (subtle), `Scheme` (uses the color scheme).
  Influenced by **Fill opacity**.
- **Line style** — `Solid`, `Dash` (length, gap; default `10,10`), `Dots` (gap; default `0,10`).
- **Connect null values** — `Never`, `Always`, `Threshold` (close gaps shorter than the threshold).
- **Disconnect values** — `Never`, `Threshold` (break the line at values above the threshold).
- **Show points** — `Auto`, `Always`, `Never`.
- **Show values** — render data-point values above marks.
- **Point size** — 1–40 px diameter.
- **Stack series** — `Off`, `Normal`, `100%`. Grafana doc warns stacking can mislead and links to data-to-viz.com's "The
  issue with stacking" for rationale.
- **Bar alignment** — bar position relative to the data-point timestamp.
- **Bar width factor** — bar width as a fraction of inter-point spacing (`0.5` = half the gap, `1.0` = touching).

### Stack series in groups

The stacking group option only appears as an override. Add a `Stack series` override, pick `Normal`, then name the
group. Same-name series stack together; different groups stack independently.

### Special overrides

- **Graph styles → Transform**:
  - `Constant` — show the first value as a constant horizontal line.
  - `Negative Y transform` — flip values to negative on the y-axis.
- **Graph styles → Fill below to** — fills area between two series. Set `Fill below to: <other series>` on the upper
  series. Pair with `Line width: 0` on bounding series for a clean band (min/max envelope pattern).

### Multi y-axis pattern

Two series with different units (temperature/humidity, requests/latency): add two **Fields with name** overrides, each
setting `Standard options → Unit` and `Axis → Placement` (`Left` / `Right`). Repeat per distinct unit.

### Pan and zoom

Click-and-drag zooms in; double-click zooms out (range doubles each click around the current center). Click-and-drag on
the x-axis area pans the time range. Both update the dashboard time range.

### Alert rules

Time series is one of the few panels supporting panel-attached alert rules. Configure in the panel editor's **Alert**
tab. Linked alert rules display as annotations.

---

## Stat

Single headline value (numeric, string, boolean) with optional sparkline. Replaces deprecated Singlestat.

### Value options

- **Show** — `Calculate` (reducer across all rows) or `All values` (one stat per row).
- **Calculation** (when `Show = Calculate`) — pick a reducer from the standard catalog.
- **Limit** (when `Show = All values`) — row cap, default 5,000.
- **Fields** — pick fields to display.

### Stat styles

- **Orientation** — `Auto`, `Horizontal`, `Vertical`. Controls stacking direction.
- **Text mode**:
  - `Auto` — name + value when multiple series exist.
  - `Value` — value only; name in tooltip.
  - `Value and name` — always both.
  - `Name` — name only; value in tooltip (value still drives the color).
  - `None` — nothing; both in tooltip.
- **Wide layout** (only with `Text mode = Value and name`) — `On` puts value and name side-by-side when wide enough;
  `Off` stacks value beneath name.
- **Color mode**:
  - `None` — no color.
  - `Value` — color value and graph area.
  - `Background Gradient` — soft gradient over value, graph, and panel background.
  - `Background Solid` — solid background.
- **Graph mode** — `None` (no sparkline) or `Area` (sparkline below value; requires time column). Sparkline hides
  automatically when the panel is too small.
- **Text alignment** — `Auto` (centered for single stat, left for multiple) or `Center`.
- **Show percent change** — only meaningful when `Show = Calculate`. Compares to previous period.
- **Percent change color mode** — `Standard` (green up / red down), `Inverted` (red up / green down — for metrics where
  rising is bad), `Same as Value`.

### Text size

- **Title** — numeric size for the stat title.
- **Value** — numeric size for the displayed value.

### Limitations

- Stat does **not** support **Actions** (data link buttons in the API-call sense).
- Data links don't expose `One click`; single data link → click-anywhere opens it; multiple → click opens a menu.

---

## Table

Most flexible layout — rows × columns with rich cell types.

### Data format

Requires column-row structure. **Missing cells cause the table to fail to render entirely** — fix gaps with
transformations before rendering.

The dataset selector (bottom drop-down, edit mode only) switches between multiple returned frames.

### Table options

- **Show table header** — show/hide column names.
- **Frozen columns** — count of columns frozen at the left while scrolling.
- **Cell height** — `Small`, `Medium`, `Large`.
- **Max row height** — px ceiling for rows (relevant when `Wrap text` is on).
- **Enable pagination** — auto-sizes page to table height.
- **Minimum column width** — default 150 px; drop to 50 for mobile-friendly dashboards.
- **Column width** — fixed column width override (else auto-computed).
- **Column alignment** — `Auto`, `Left`, `Center`, `Right`.
- **Column filter** — enables per-column filter funnel icons (see [Column filtering](#column-filtering)).
- **Wrap text** — wrap cell content.
- **Wrap header text** — wrap header text.

### Sorting

- Click a column header to cycle `default → descending → ascending`.
- Hold `Cmd`/`Ctrl` and click additional headers for multi-column sort.

### Column filtering

After enabling **Column filter** in Table options:

- Click the funnel icon → check values to show, or use the search field for long lists.
- Operators: `Contains` (regex by default), `Expression` (boolean where `$` is the cell value, e.g.,
  `$ >= 10 && $ <= 12`), or `=`, `!=`, `<`, `<=`, `>`, `>=`.
- Active filters show a blue funnel icon; `Clear filter` removes it.
- Hover a cell → ad-hoc filter icon adds `column = value` to a Filter variable for the data source (see drilldown
  patterns in `annotations-links.md`).

### Footer calculations

Expand the footer section in the sidebar and pick one or more reducers (`Mean`, `Max`, `Last`, `Total`, ...). Apply
multiple at once. Default: applies to every field; to restrict, add the footer through a field override. Non-numeric
fields display nothing for numeric reducers.

Warning: footer calculations on `Markdown + HTML` cells produce undefined results.

### Cell types

Pick under **Cell options → Cell type**. Applies to all fields by default; use a **Cell options → Cell type** override
to restrict to specific fields.

- **Auto** — text/number. Default. Options: `Cell value inspect`, `Tooltip from field`, `Styling from field`.
- **Colored text** — applies threshold/value-mapping/color-scheme colors to text.
- **Colored background** — same, for background. Sub-options:
  - **Background display mode** — `Basic` or `Gradient`.
  - **Apply to entire row** — paint the whole row by this column's color.
- **Data links** — cell text becomes the data link title. With `Auto`, data links make text clickable but keep the
  original value as the label.
- **Gauge**:
  - **Gauge display mode** — `Basic`, `Gradient`, `Retro LCD`.
  - **Value display** — `Value color`, `Text color`, `Hidden`.
  - Gauge min/max default to dataset min/max; override per column for per-row bounds.
- **Sparkline** — per-row sparkline. Multi time-series must pass through **Time series to table** first. Sub-options
  mirror Time series graph styles (Style, Line interpolation, Line width, Fill opacity, Gradient mode, Line style,
  Connect null values, Show points, Point size, Bar alignment) plus **Hide value**.
- **JSON View** — render value as code; nested object expands on hover.
- **Pill** — render comma-separated strings or JSON arrays as colored pills. Colors are stable per value across the
  table.
- **Markdown + HTML** — GitHub-Flavored Markdown. Sanitized by default; raw HTML requires `disable_sanitize_html = true`
  in Grafana config. Toggle **Dynamic height** for content-fitting rows; pair with pagination to avoid performance hits
  (dynamic height disables virtualization).
- **Image** — URL or base64. Options: `Alt text`, `Title text`.
- **Actions** — button firing an unauthenticated API call. Options: `Endpoint`, `Method` (`GET`/`POST`/`PUT`),
  `Content-Type` (JSON, Text, JavaScript, HTML, XML, x-www-form-urlencoded), `Query parameters`, `Header parameters`,
  `Payload`. Treat as user-visible — same rules as panel-level actions.

### Tooltip from field

Use another column's value as the cell tooltip. Toggle **Tooltip from field**, pick the source field (visible or
hidden), pick **Tooltip placement** (`Auto` / `Top` / `Right` / `Bottom` / `Left`). A chip marker appears in source-cell
corners.

Common pattern: hidden `Info` column with rich context; point visible columns at it via the **Cell options → Tooltip
from field** override. Source-field overrides (value mappings, display name) affect the tooltip content.

### Styling from field

Use another column's value (JSON-encoded CSS) to style cells, e.g., `{"marginLeft":12,"text-decoration":"underline"}`.
Typically used as an override on a subset of cells, not table-wide.

### Limitations

- **Annotations and alerts not supported** in table visualizations.
- Data links don't expose `One click`; single data link → single-click cell; multiple → opens a menu.
