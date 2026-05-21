# Perception and Encoding

Cleveland & McGill graphical perception research, pre-attentive attributes, and Tufte's data-ink principle.

## Contents

- [Encoding accuracy hierarchy (Cleveland & McGill)](#encoding-accuracy-hierarchy-cleveland--mcgill)
- [Pre-attentive attributes](#pre-attentive-attributes)
- [Data-ink ratio and chart junk (Tufte)](#data-ink-ratio-and-chart-junk-tufte)
- [Applying perception rules to Grafana](#applying-perception-rules-to-grafana)

---

## Encoding accuracy hierarchy (Cleveland & McGill)

Cleveland and McGill (1984) ranked visual encodings by quantitative-magnitude estimation accuracy. Most → least:

1. **Position on a common scale** — multiple series on shared axis, dot plots, line charts with shared x.
2. **Position on non-aligned scales** — small multiples.
3. **Length** — bar length on a common baseline.
4. **Angle or slope** — line slope, pie slices.
5. **Area** — bubble plots, treemap rectangles.
6. **Volume** — 3D bars, spheres.
7. **Color saturation / luminance** — choropleth, heatmap cells.
8. **Color hue** — categorical only.

**Rule:** if a viewer needs to read a number, encode it as high in the hierarchy as the layout allows. Color hue
distinguishes categories — never magnitude.

### Implications

- Bar chart beats pie chart for ranking (length > angle).
- Side-by-side line charts beat overlays when the question is "which is bigger" rather than "are they correlated."
- Heatmap cells communicate density well but magnitudes poorly — pair with hover values or value mappings.
- Stacked area conflates length (bottom) with position-difference (upper layers). Reserve for parts-of-a-whole where
  total dominates.

## Pre-attentive attributes

Properties the visual system processes in < 200 ms, before conscious attention. A target with a unique pre-attentive
attribute "pops out" against distractors.

Canonical set:

- **Color hue** — distinguishes categories at a glance.
- **Color intensity (saturation/luminance)** — orders severity within a hue family.
- **Position** — strong for grouping and ordering.
- **Length** — basis of bar charts.
- **Width / thickness** — weaker than length.
- **Size (area)** — outlier detection, not precise comparison.
- **Shape** — discriminates ~5 categories.
- **Orientation** — strong for tilted elements in a field.
- **Curvature** — curved vs straight.
- **Enclosure / boundary** — a box groups items.
- **Motion / blinking** — extremely strong; reserve for active anomalies.

### Composability fails

Pop-out collapses when two attributes combine (red circle hidden in red squares and blue circles). **One pre-attentive
attribute per channel.** Doubling up degrades recognition.

### What this means for dashboards

- One alert color per severity. Don't use red for "error rate," "saturation," and "high latency" simultaneously.
- Reserve motion for unacknowledged alerts. Decorative pulsing trains viewers to ignore motion.
- Group panels with proximity (grid) and enclosure (rows, tabs), not borders on every panel.

## Data-ink ratio and chart junk (Tufte)

Tufte (1983): **data-ink** conveys data; **non-data ink** is everything else (gridlines, backgrounds, borders, 3D
effects, decoration).

**Data-ink ratio** = data-ink / total ink. Maximize within readability.

**Chart junk** — non-data ink that distracts or misleads:

- Moire patterns.
- Heavy gridlines competing with data.
- 3D effects (perspective distorts position and area).
- Redundant labels and titles.
- Area-scaled pictograms for 1D data.

### Applied to dashboards

- **Drop heavy gridlines.** Light low-contrast lines or none. Rarely need major + minor.
- **No 3D anything.** Distorts area and position.
- **One color per signal — no gradient-by-default.** Gradient emphasizes magnitude on stat panels; decoration elsewhere.
- **Set the unit on the field once** — don't repeat in every cell.
- **Skip backgrounds, shadows, panel borders.** Grafana's default chrome is minimal; don't add.

### Non-minimalist counterpoint (Few)

Stephen Few: strict data-ink can hurt comprehension. Light gridlines, axis ticks, hover affordances have high
readability value. **Strip decoration; keep navigation.** A dashboard without axis labels is broken, not minimalist.

## Applying perception rules to Grafana

- **Time-series multi-series:** use position (shared x-axis) and color hue for category. Don't drop color saturation to
  encode magnitude unless the data is single-series sequential (e.g., a heatmap).
- **Stat panels:** use **From thresholds (by value)** color scheme so the value drives the color via threshold position
  (perceptually robust); fall back to single color for non-status metrics where color would add noise.
- **Bar gauge vs Gauge:** bar gauge uses length (rank 3); radial gauge uses angle (rank 4). Bar gauge wins for ranking
  multiple values; gauge reads cleanly only for a single headline number.
- **Heatmap thresholds:** if the heatmap is the primary readout, pair value mapping or annotations with the color
  encoding — color alone is rank 7/8 in the encoding hierarchy.
- **Stacked vs unstacked time series:** stack only when the total matters more than the components. For golden-signal
  dashboards (error rate per service), unstacked beats stacked.
- **Pie chart caveats:** if you must use one, ≤ 5 segments, no more, and only when the part-of-a-whole framing is the
  message. For everything else, bar chart.
- **Chart junk audit:** disable gridlines if axis ticks alone are clear; turn off the panel title's transparent
  background option; remove decorative thresholds (lines without semantic meaning); cut down legend entries with `Limit`
  when more than ~10 series.
