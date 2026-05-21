---
name: dataviz
description: >-
  Data visualization discipline for monitoring and observability dashboards: chart-type selection by data shape,
  encoding accuracy hierarchy (position > length > angle > area > color), pre-attentive attributes, Tufte data-ink,
  color theory (semantic conventions, Viridis, colorblind safety), dashboard layout and information hierarchy
  (F/Z-pattern, tiering), time-series conventions (baseline, interpolation, dual axes, stacking), observability
  frameworks (RED, USE, Four Golden Signals, SLO/SLI). Invoke whenever task involves any interaction with dashboard
  design quality — making a good dashboard, reviewing a visualization, picking a chart type, dashboard layout, color
  choices, panel arrangement, or critiquing existing observability dashboards.
---

# Data Visualization for Dashboards

A dashboard is a tool for fast, accurate judgement under operational stress. Every visual choice supports that judgement
or undermines it.

## Scope

- **In scope:** chart selection, encoding accuracy, color, layout and hierarchy, time-series conventions, observability
  frameworks (RED, USE, Four Golden Signals, SLO/SLI), anti-patterns, review criteria.
- **Out of scope:**
  - **Grafana JSON, panel options, transformations, variables, library panels** — `dashboards` sibling owns mechanics.
  - **Alert rule definitions** — `alerting` sibling. This skill covers SLO/SLI dashboard structure, not rule firing.
  - **Query syntax** — `promql` / `metricsql` / `logsql` siblings.

## References

- **Perception and encoding** — [`${CLAUDE_SKILL_DIR}/references/perception.md`] Cleveland & McGill hierarchy,
  pre-attentive attributes, Tufte data-ink and chart junk, Stephen Few counterpoint.
- **Color** — [`${CLAUDE_SKILL_DIR}/references/color.md`] Semantic conventions, sequential/diverging/categorical
  palettes, Viridis, colorblind safety, WCAG contrast, dark/light themes, Grafana scheme mapping.
- **Layout** — [`${CLAUDE_SKILL_DIR}/references/layout.md`] F/Z patterns, tiering, grid discipline, progressive
  disclosure, RED/USE/Four Golden Signals, SLO/SLI dashboard structure.
- **Time-series specifics** — [`${CLAUDE_SKILL_DIR}/references/time-series.md`] Aspect ratio, baseline, interpolation,
  aggregation, dual y-axes, stacking.

## Encoding hierarchy

Cleveland & McGill (1984), most → least accurate:

1. Position on a common scale
2. Position on non-aligned scales (small multiples)
3. Length (bar charts)
4. Angle / slope (pie slices)
5. Area (bubble plots, treemaps)
6. Volume (3D)
7. Color saturation / luminance
8. Color hue (categorical only)

**Pick encodings as high as the data shape allows.** Color hue distinguishes categories; never magnitude.

## Chart-type selection

Flows from data shape and the question being answered. `dashboards` skill has the panel-type catalog; this skill has the
rationale.

- **Magnitudes over time** → line chart (Time series). Default for observability metrics.
- **Magnitudes across discrete categories** → bar chart for ranking. Never pie.
- **Parts of a whole** → stacked bar or stacked area, ≤ 5 components, only when total is meaningful. No pie above 5.
- **Distribution at a point in time** → histogram. Over time, **heatmap**.
- **One headline number** → stat panel; sparkline when trend context matters.
- **One value against a target** → bar gauge over radial gauge. Radial only for single prominent numbers.
- **Relationships between two metrics** → scatter (XY chart).
- **Tabular detail** → table with sparkline cells for per-row trends.
- **Status across many entities** → state timeline or status history. Pair colored cells with text or icons.

**Pie rule:** if you must, ≤ 5 segments, parts-of-a-whole framing, meaningful total. Otherwise bar chart.

## Pre-attentive attributes

Color hue, intensity, position, length, size, shape, orientation, motion — processed in under 200 ms. The unique
attribute "pops out" against the field.

- **One pre-attentive attribute per signal.** Combining collapses pop-out. If color encodes severity, don't reuse it for
  category.
- **Reserve motion for active anomalies.** Decorative blinking trains viewers to ignore motion.
- **Group with enclosure (rows, tabs) and proximity (grid)**, not panel borders.

## Color rules

Color is redundant — pair with text, position, or shape.

- **Fixed semantic mapping.** Green = OK, amber = warning, red = critical, blue = informational, grey = no-data. One
  mapping per dashboard. Reusing red for "high traffic" and "error rate" defeats the convention.
- **Match palette to data:**
  - Sequential (single hue or Viridis) for magnitudes.
  - Diverging (two ends, neutral middle) for anomalies around a baseline.
  - Categorical (distinct hues, no order) for series identity. Cap at ~10 hues.
- **Colorblind safety:** 8% of men have color-vision deficiency. Avoid unmodified red-green as sole signal. Use
  Viridis/Cividis for sequential data.
- **Contrast:** WCAG 4.5:1 for value text on stat panels. NOC TVs at half brightness amplify low-contrast failures.
- **No rainbow scales.** Perceptually non-uniform.

### Grafana color scheme defaults

- **Status panels (stat, gauge, bar gauge)** → `From thresholds (by value)`. `Base = green`, amber warn, red crit.
- **Multi-series time series** → `Classic palette (by series name)` — stable across reruns.
- **Heatmap** → sequential continuous (Blues / Greens) or Viridis-equivalent. Diverging only when zero/center is
  operational.
- **Non-status numeric metrics** → `Single color`. Position does the work.

## Layout and information hierarchy

Users scan dashboards in **F-pattern** (horizontal sweeps, then vertical down the left) or **Z-pattern** (top-left →
top-right → bottom-left → bottom-right). Top-left has the highest attention; bottom-right the lowest.

### Tier the dashboard

- **Tier 1** — primary KPIs. Visible without scrolling. 2–4 panels max.
- **Tier 2** — supporting trends and breakdowns.
- **Tier 3** — drilldown, references, raw tables.

Aim for ≤ 12 panels in the initial viewport.

### Grid discipline

- **Pick a column unit and stick to it.** 6, 8, or 12. Mixed widths in a row are noise.
- **Match panel heights within a row.** Mixed heights force the eye to re-anchor.
- **Group with rows / tabs / collapsed sections**, not decorative borders.
- **Repeat panels and rows** for symmetric per-entity dashboards.

### Progressive disclosure

Headline → trend → breakdown → trace. Top answers "is this OK?" in under 3 seconds; lower tiers answer "why?" when
something is wrong. Use data links for drilldown preserving time range and variables (see `dashboards` skill,
`annotations-links.md`).

## Time-series rules

- **Aspect ratio:** wider than tall, 2:1 to 4:1. Cleveland's "banking to 45°."
- **Baseline:**
  - **Zero** for ratios, rates, counts, bounded fractions. Anywhere "twice as much" means something.
  - **Skip zero** only for unbounded magnitudes where variation is the signal (temperature, stock prices).
  - **Never truncate silently** — most common chart lie.
- **Interpolation:**
  - **Linear** — default.
  - **Smooth (curved)** — invents values between samples. Never on operational dashboards.
  - **Step before / after** — discrete-state metrics (queue depth, feature flag, node count).
  - **Bars** — closed-bucket aggregates (requests-per-minute), not continuous samples.
- **Aggregation:**
  - `max` for latency, queue depth — preserves spikes.
  - `avg` for throughput — shows typical level.
  - Overlay both when in doubt.
  - `$__rate_interval` inside Prometheus `rate()` (4× scrape-interval rule).
- **Dual y-axes:**
  - **OK** for correlated signals on shared time axis (req rate + latency during incidents).
  - **Anti-pattern** for unrelated metrics or scale-mismatched signals — split panels or normalize.
- **Stacking:**
  - Default **unstacked**.
  - Stack only when components sum to a meaningful total and user needs both total and breakdown.
  - Non-bottom series read against non-flat baseline — magnitudes noisy.

## Observability frameworks

- **Four Golden Signals (Google SRE)** — Latency, Traffic, Errors, Saturation. **User-facing services.**
- **RED (Tom Wilkie)** — Rate, Errors, Duration. **Request-driven services** (HTTP/gRPC). Golden Signals minus
  saturation; better for bursty workloads.
- **USE (Brendan Gregg)** — Utilization, Saturation, Errors. **Resources** (hosts, disks, queues).

Pick by entity:

- Customer-facing service → Four Golden Signals or RED.
- Resource → USE.
- Platform overview → mix: Golden Signals on top, USE per resource tier below.

## SLO/SLI dashboards

- **SLI current value** — large stat, threshold = SLO target. Green ≥ target, red below.
- **Error budget remaining** — `1 - (1 - SLI) / (1 - SLO)` as %. Red near zero.
- **Burn rate** — `current_failure_rate / budget_failure_rate`. > 1 burns budget faster than allowed.
- **SLO compliance over time** — SLI series with SLO target as threshold line.
- **Burn-down chart** — remaining budget over SLO window (typically 28d).
- **Multi-window burn-rate alert state** — short/long-window burn signals from alert system.

**Layout:** SLO summary stats top tier. SLO trend + burn-down middle tier. Failure-mode breakdown bottom tier.

## Dashboard review checklist

1. **Purpose** — Can a new on-call describe the dashboard in one sentence?
2. **Headline visible without scrolling?** 3-second "is this OK?" answer in initial viewport.
3. **Hierarchy** — Do size, position, and color emphasis agree?
4. **Encoding hierarchy** — Every magnitude encoded as high as shape allows?
5. **Units set everywhere?** No bare numbers.
6. **Color** — Consistent semantic mapping? Stable categorical palette (`by series name`)? No rainbow sequential?
7. **Baseline** — Zero on rates/ratios/counts? Truncation marked?
8. **Interpolation** — Linear or step? No smooth curves?
9. **Time range** — Default matches dashboard purpose (24h ops, 28d SLO)?
10. **Drilldown** — Data links preserve time range and variables?
11. **Chart junk** — Decoration without information removed?
12. **Repeating panels and rows** for entity symmetry?
13. **Time-window consistency** — All panels controlled by dashboard time picker?

## Application

When **designing**:

- Start from the question the dashboard answers, not the metrics you have.
- Pick framework (RED, USE, Four Golden Signals, SLO) before panels.
- Tier panels: ≤ 4 headline KPIs, then trends, then breakdowns.
- Apply encoding hierarchy: position > length > angle > area > color.
- Lock semantic color mapping for the whole dashboard.
- Default to unstacked, linear-interpolation, zero-baseline time series.

When **reviewing**:

- Cite the panel and rule. Show the fix.
- Distinguish "wrong" from "stylistic preference."
- Point and fix; don't lecture.

## Integration

- **`dashboards`** — Grafana mechanics. This skill picks position-not-angle; that skill sets the scheme.
- **`alerting`** — rule definitions. This skill structures SLO/SLI dashboards that visualize burn.
- **`promql` / `metricsql` / `logsql`** — query syntax. This skill assumes correct queries.

## Critical rules

- **Position and length carry magnitude. Color hue carries category. Never confuse them.**
- **Color is redundant — pair semantic color with text, position, or shape.**
- **Zero baseline for rates, ratios, counts. Never silently truncate.**
- **Linear or step interpolation on operational dashboards. Smooth curves invent data.**
- **Default unstacked. Stack only when the total matters.**
- **Dual y-axes only for correlated signals.**
- **Top-left is the headline. 3-second "is this OK?" without scrolling.**
- **One pre-attentive attribute per signal.**
- **No rainbow palettes, no 3D, no decorative thresholds, no pie above 5 segments.**
