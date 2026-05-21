# Transformations

Catalog of Grafana panel transformations, common patterns, ordering rules, debugging mechanics. Transformations run
client-side, after queries return, in listed order.

## Contents

- [Transformation mechanics](#transformation-mechanics)
- [Catalog](#catalog)
- [Common patterns](#common-patterns)
- [Debugging](#debugging)

---

## Transformation mechanics

- Order matters. Each transformation receives the previous output as input.
- Each row in the **Transformations** tab can be:
  - **Disabled** (eye icon) — keeps the step in place but skips it. For isolating which transformation broke a panel.
  - **Debugged** (bug icon) — shows input and output frames side-by-side.
  - **Filtered** (filter icon) — applies only to a specific query refId (or annotations). Filtering works on original
    query outputs; later transformations operate on the merged stream and may not preserve refId boundaries.
  - **Deleted** (trash icon).
- Text fields accept dashboard variables — interpolated before the transformation runs.
- When Grafana can't render transformed data, toggle **Table view** above the visualization to inspect the resulting
  frames.

## Catalog

Grouped by purpose.

### Adding fields and values

- **Add field from calculation** — derive a new field. Modes:
  - **Reduce row** — reducer (mean, sum, min, max, last, ...) across selected fields per row.
  - **Binary operation** — `field1 OP field2` or `field OP number` (`+`, `-`, `*`, `/`, `%`, `**`). Use
    `All number fields` on the left to broadcast.
  - **Unary operation** — `abs`, `exp`, `ln`, `floor`, `ceil`.
  - **Cumulative functions** — running total, running mean.
  - **Window functions** — moving mean, stddev, variance. Trailing or centered window; pick window size.
  - **Row index** — inserts row number; `As percentile` toggle converts to 0–1 fraction.
  - **Alias** sets the new field name; **Replace all fields** removes originals.
- **Config from query results** — extracts `Min`, `Max`, `Unit`, `Thresholds`, value mappings from one query and applies
  to other queries' fields. Field mapping table controls how each source column maps to a config property.
- **Convert field type** — coerce to `Numeric`, `String`, `Time` (Moment.js format input), `Boolean`, `Enum`, or `Other`
  (JSON parse).
- **Extract fields** — parse JSON, `key=value`, or regex (`(?<NewField>...)` named capture) from a string field. `Auto`
  discovers fields. `Replace All Fields` + `Keep Time` is the common combo for time series.
- **Lookup fields from resource** — enrich with `Countries`, `USA States`, or `Airports` data (spatial enrichment).
- **Format string** — string-case conversions (`Upper`, `Lower`, `Sentence`, `Title`, `Pascal`, `Camel`, `Snake`,
  `Kebab`), `Trim`, `Substring`.
- **Format time** — render a time field via Moment.js format string (`YYYY-MM-DD HH:mm:ss`).

### Filtering

- **Filter data by query refId** — toggle queries (`A`, `B`, ...) on/off. Not available for Graphite.
- **Filter data by values** — include/exclude rows matching one or more conditions:
  - Universal: `Is Null`, `Is Not Null`, `Equal`, `Not Equal`, `Regex`.
  - Strings: `Contains substring`, `Does not contain substring` (case-insensitive).
  - Numbers: `Greater`, `Lower`, `Greater or equal`, `Lower or equal`, `In between`.
  - Time: `In between` (pre-populated with selected time range).
  - Combine with `Match all` (AND) or `Match any` (OR).
- **Filter fields by name** — keep/drop fields by regex, manual selection, or `From variable` (dashboard variable).
  Regex supports `${variableName}` interpolation.
- **Limit** — keep first N rows. Negative N keeps the last `|N|` rows.

### Reshaping

- **Concatenate fields** — combine all fields from all frames into one frame side-by-side.
- **Join by field** — merge frames on a shared field (typically time). **Inner join** drops unmatched rows; **Outer
  join** (time series) keeps all rows with nulls for misses; **Outer join (SQL-like)** is full-outer over tabular data.
- **Join by labels** — pivot multiple time series into one wide table using a chosen label as the spread dimension.
- **Labels to fields** — convert series labels into columns (`Columns` mode) or into a long-form per-series table
  (`Rows` mode). Auto-merges results.
- **Merge series/tables** — combine query results into one frame where shared fields share rows.
- **Organize fields by name** — rename, reorder, hide fields. Single-query only — use **Join** or remove queries
  otherwise. **Set field order mode** Auto (sort by label/name asc/desc) or Manual (drag).
- **Partition by values** — split a single result into one frame per unique value of a selected field (e.g., split by
  `Region`). Avoids N queries with different `WHERE` clauses.
- **Prepare time series** — convert between time-series shapes: `Wide`, `Multi-frame`, `Long`. For data sources
  returning a shape the visualization can't handle natively.
- **Reduce** — collapse each field to a single value via reducers. Modes:
  - **Series to rows** — one row per input field, columns = calculations.
  - **Reduce fields** — keep frame structure, collapse each field to one value.
- **Rename by regex** — rename matching field names using regex + replacement pattern with back-references (`$1`).
  Global match `/(.*)/g` supported since Grafana 9.0.
- **Rows to fields** — turn rows into separate fields. For `Gauge`/`Stat`/`Pie chart` where each metric needs its own
  field. **Use as** column maps each row property to `Field name`, `Field value`, or a config option
  (`Min`/`Max`/`Unit`/`Threshold`).
- **Series to rows** — combine multiple time-series queries into one frame with `Time`, `Metric`, `Value` columns. The
  `Metric` column reflects the source query's refId or `Label`.
- **Sort by** — sort frames by a chosen field. `Reverse` toggles direction.
- **Transpose** — pivot rows and columns. Defaults to string type when mixed; pick how to render empty cells.

### Grouping

- **Group by** — group rows by one or more fields, aggregate the rest via reducers (`Total`, `Mean`, `Min`, `Max`,
  `Last`, `First`, `Count`, ...). Adding a count to the group_by field yields per-group sample counts.
- **Grouping to matrix** — pivot three fields into a matrix (`Column`, `Row`, `Cell value`). Choose how to render empty
  cells (`Null`, `True`, `False`, `Empty`).
- **Group to nested tables** — group by a field; remaining columns nest as child tables under each group row. Used with
  Table's expandable rows.

### Histograms

- **Create heatmap** — convert histogram-style series into temporal heatmap buckets. X bucket: `Size` (time interval) or
  `Count`. Y bucket: `Linear`, `Logarithmic` (base 2/10), or `Symlog` (allows negatives).
- **Histogram** — value-distribution buckets. Configure `Bucket size`, `Bucket offset`. `Combine series` produces a
  single histogram across all input series.

### Time series modeling

- **Time series to table transform** — convert a time series query into a `Trend` field for Table panel's `sparkline`
  cell type. Each series becomes a row with its sparkline. Pick a calculation for the side-by-side numeric value.
- **Trendline** — fit `Linear` or `Polynomial` regression curve over a series. (Renamed from "Regression analysis".)
- **Smoothing** — ASAP-algorithm noise reduction. `Resolution` 1–1000 controls smoothing intensity (lower = more
  smoothing). Preserves all original time points.
- **Spatial** — geospatial operations: `Prepare spatial field` (auto/coords/geohash/lookup), `Calculate value`
  (heading/area/distance), `Transform` (`As line`, `Line builder`).

## Common patterns

- **Convert epoch seconds to milliseconds** — `Add field from calculation` → `Binary operation` → `$field * 1000` →
  enable `Replace all fields` to keep only the converted field, or apply a `Date & time` unit override after.
- **Top N over time** — `Reduce` (mode `Reduce fields`, calc `Max`) → `Sort by` value descending → `Limit` to N.
- **Side-by-side series in a table** — `Join by field` on `Time` (Outer join, time series) to align all queries; then
  visualize as **Table**.
- **One sparkline per row in a table** — `Time series to table transform` per query, then `Join by field` or `Merge`.
- **Drop the domain from hostnames** — `Rename by regex` with match `/^([^.]+).*/` and replacement `$1`.
- **Extract Prometheus label as variable display** — query variable's Regex field: `/.*instance="([^"]*).*/`.
- **Filter wide tables to one column-group** — `Filter fields by name` with regex like `^(time|prod-.*)$`.
- **Single-source split across multiple panels' series** — `Partition by values` on the discriminator field; visualize
  with one series per partition.
- **Per-group aggregation table** — `Group by` on entity (`Server ID`), add `mean(CPU)`, `last(Time)`, `last(Status)`.
  Yields a current-state table from raw time series.

## Debugging

- Toggle **Table view** in the panel preview to see the post-transformation frame as raw data.
- Click the **bug icon** on a row to inspect input and output frames; column and row deltas are obvious.
- Disable transformations one at a time (eye icon) to bisect failures.
- For multi-query panels, use the **filter icon** to apply a transformation to one query — useful when one query returns
  the wrong shape and others are fine.
- Open **Panel inspector → Data** to see final transformed frames as the visualization sees them.
- Remove unused transformations. Each disabled-but-present transformation still costs CPU on every refresh.
