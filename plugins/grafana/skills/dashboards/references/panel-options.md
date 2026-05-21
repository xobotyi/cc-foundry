# Panel Options

Standard options, thresholds, value mappings, field overrides — display-only configuration applied after queries and
transformations.

## Contents

- [Panel options (common)](#panel-options-common)
- [Standard options](#standard-options)
- [Thresholds](#thresholds)
- [Value mappings](#value-mappings)
- [Field overrides](#field-overrides)
- [Display-name expressions](#display-name-expressions)

---

## Panel options (common)

Sidebar **Panel options** section. Common to all panels.

- **Title** — header text. Supports template and global variables (`$var`, `${__from}`, `${__dashboard}`, `${__org}`,
  `${__user}`). Query-scoped globals like `$__interval` are not available here.
- **Description** — tooltip rendered as GitHub-Flavored Markdown. Supports emphasis, lists, links, tables, code blocks.
  Sanitized — scripts and unsafe HTML stripped. Keep short; it's a tooltip.
- **Transparent background** — adopt dashboard background.
- **Panel links** — header-icon URLs to other dashboards or external systems. See `annotations-links.md` § Panel links.
- **Repeat options** — `Repeat by variable`, `Repeat direction` (Horizontal/Vertical), `Max per row`. See `variables.md`
  § Repeating elements.

## Standard options

Sidebar **Standard options** section. Applies to all numeric fields unless overridden.

- **Unit** — pick from the catalog (`Time → seconds`, `Data → bytes`, `Throughput → reqps`, `Misc → Percent (0-100)`).
  Custom unit syntax:
  - `suffix:<text>` — text after the value (e.g., `suffix:req/s`).
  - `prefix:<text>` — text before the value.
  - `time:<format>` — Moment.js format string (`time:YYYY-MM-DD`). Format must not include `:`.
  - `si:<base scale><unit>` — SI-scaled custom unit (`si:mF` for millifarads). Source-data scale via the base char.
  - `count:<unit>` — count of `<unit>`.
  - `currency:<symbol>` — currency with auto-abbreviation (K/M/B/T).
  - `currency:financial:<symbol>` — currency without abbreviation. Append `:suffix` to place the symbol after the
    number.
  - Bare emojis work as units.
- **Min** / **Max** — for percentage thresholds, gauge ranges, bar gauge scaling. Blank = auto-calculate across all
  series.
- **Field min/max** — compute per field (not across the panel). For fields with different scales.
- **Decimals** — decimal places. Blank = auto. Set to `String` unit to preserve all decimals.
- **Display name** — overrides the rendered field name. Supports expressions (see
  [Display-name expressions](#display-name-expressions)).
- **Color scheme** — `Single color`, `Shades of a color`, `From thresholds (by value)`, `Classic palette`,
  `Classic palette (by series name)`, `Multiple continuous colors (by value)` (Green-Yellow-Red, etc.),
  `Single continuous color (by value)` (Blues, Reds, ...). Some panels add `From data source` and `Hue rotation`.
- **No value** — text displayed when a field has no value or all values are null. Default `-`.

### Time-format unit gotcha

`Date & time` expects ms since Unix epoch. For seconds-since-epoch data, multiply by 1000 with **Add field from
calculation → Binary operation** (`field * 1000`) before applying the format.

## Thresholds

Sidebar **Thresholds** section. Drives colors and conditional styling.

- **Base** — minus infinity; default green.
- **Add threshold** — value + color; Grafana sorts thresholds high-to-low. Any number value; colors from the color
  picker.
- **Mode**:
  - **Absolute** — values interpreted in field units.
  - **Percentage** — values 0–100, computed against `min`/`max`.
- **Show thresholds** (time series, bar chart, candlestick, trend):
  - `Off`
  - `As lines`
  - `As lines (dashed)`
  - `As filled regions`
  - `As filled regions and lines`
  - `As filled regions and lines (dashed)`

Defaults on threshold-supporting visualizations: `80 = red`, `Base = green`, `Mode = Absolute`, `Show thresholds = Off`
on time-series-like visualizations.

Thresholds also color:

- Stat value text / background
- Gauge needle / dial regions
- Bar gauge segments
- Geomap markers
- Table cell text / background (via cell display mode `Color text` / `Color background`)
- State timeline regions (for numeric inputs)

### Supported visualizations

Bar chart, Bar gauge, Candlestick, Canvas, Gauge, Geomap, Histogram, Stat, State timeline, Status history, Table, Time
series, Trend.

## Value mappings

Sidebar **Value mappings** section. Translates raw values to display text and color. Applied after standard options;
bypasses unit formatting for the mapped value.

Four mapping types:

- **Value** — exact match. Map `1` → `Up`, color green.
- **Range** — numeric range, min/max inclusive.
- **Regex** — JS regex against the string form of the value.
- **Special** — match `Null`, `NaN`, `True`, `False`, `Empty`, `Null + NaN`. For `null → N/A`.

Each mapping sets: display text, color, icon (canvas only).

### Table cell rendering

Table panels apply value-mapping colors to text/background only when cell display mode is `Color text` or
`Color background`. Default mode renders mapped text without color.

### Supported visualizations

Bar chart, Bar gauge, Candlestick, Canvas, Gauge, Geomap, Histogram, Pie chart, Stat, State timeline, Status history,
Table, Time series, Trend.

## Field overrides

Sidebar **Overrides** section (or **Add field override** at the bottom). Applies standard options, thresholds, mappings,
data links, and visualization-specific options to a subset of fields.

Override rule matchers:

- **Fields with name** — exact field name.
- **Fields with name matching regex** — JS regex. Does not rename; use **Rename by regex** transformation for that.
- **Fields with type** — `number`, `string`, `time`, `boolean`, `other`, `frame`, `enum`.
- **Fields returned by query** — query refId (`A`, `B`, ...).
- **Fields with values** — reducer condition (`Min`, `Max`, `Count`, `Total` ≷ value).

Each override holds one or more properties — any field-config setting. Common pattern: select fields with `_bytes`
suffix via regex, override unit to `Data → Bytes`.

### Override precedence

`base defaults` → `standard options` → `value mappings` → `thresholds` → `field overrides` (last write wins). Within
overrides, rules apply in the order listed in the **Overrides** tab; drag to reorder.

## Display-name expressions

In **Display name** (standard option) and override **Display name**, these expressions interpolate per-field:

- `${__field.displayName}` — current display name, including labels (`Temp {Loc="PBI", Sensor="3"}`).
- `${__field.name}` — raw field name.
- `${__field.labels}` — all labels as `key="value"` pairs.
- `${__field.labels.<key>}` — value of one label.
- `${__field.labels.__values}` — all label values, comma-separated (no keys).

Combine with template variables: `${__field.labels.host} (${env})`. Empty-string render falls back to the default
display method.
