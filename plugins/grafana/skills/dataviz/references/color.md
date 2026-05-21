# Color

Semantic conventions, perceptually uniform palettes, accessibility, and Grafana color scheme mapping.

## Contents

- [Semantic color conventions](#semantic-color-conventions)
- [Sequential, diverging, and categorical palettes](#sequential-diverging-and-categorical-palettes)
- [Colorblind safety](#colorblind-safety)
- [Contrast and dark/light themes](#contrast-and-darklight-themes)
- [Mapping to Grafana color schemes](#mapping-to-grafana-color-schemes)
- [Anti-patterns](#anti-patterns)

---

## Semantic color conventions

Color is redundant — never the sole signal.

Western monitoring convention:

- **Green** — normal, healthy, OK.
- **Amber / yellow / orange** — warning, degraded, approaching limit.
- **Red** — critical, error, breached threshold.
- **Blue** — informational, baseline, neutral.
- **Grey / muted** — disabled, no-data, unknown.
- **Purple** — pending, in-progress (less standard; document if used).

**Rule:** reusing red for "high traffic" and "error rate" makes them indistinguishable. One semantic mapping per
dashboard, applied everywhere.

**Pair color with a non-color cue.** Threshold lines/regions, value text, icon glyphs, label suffixes (`CRIT`, `WARN`) —
for colorblind viewers, misconfigured monitors, grayscale screenshots.

## Sequential, diverging, and categorical palettes

Match palette type to data structure.

- **Sequential** — ordered low → high, single hue. For magnitudes (heatmap density, utilization %). Viridis, Cividis,
  Magma, Inferno, Plasma; Grafana `Single continuous color (by value)`.
- **Diverging** — two-ended, neutral midpoint. For deviations from a baseline (temp anomaly, ratio above/below 1.0).
  RdBu, BrBG, Spectral. Only when zero/center is meaningful.
- **Categorical** — distinct hues, no order. For series identity. Grafana `Classic palette`, Tableau 10, ColorBrewer
  Set2. Limit to 7–10 hues.

**Rule:** never categorical for ordered magnitudes (false order inferred); never sequential for categories (adjacent
series indistinguishable).

### Viridis family (perceptually uniform)

Viridis, Cividis, Magma, Inferno, Plasma:

- **Perceptually uniform** — equal data steps = equal color steps.
- **Monotonic luminance** — smooth dark-to-light gradient.
- **Colorblind-safe** across common deficiencies.
- **Grayscale-printable.**

Use for sequential heatmaps and value-driven continuous encodings.

## Colorblind safety

~8% of men, 0.5% of women have color-vision deficiency. Biggest hit: red–green (deuteranopia/protanopia).

- **Avoid unmodified red-green as sole signal.** Pair with brightness/shape/text.
- **Use Viridis/Cividis** for sequential data — safe across deuteranopia, protanopia, tritanopia.
- **Test categorical palettes** in colorblind simulators (Coblis, Color Oracle, Chrome DevTools).
- **Safe severity sets:** blue → orange → red; blue → yellow → red; cyan → orange → magenta (divergent).

### Non-color redundancy

- **Threshold regions** — position encoding.
- **Value text color** — secondary cue.
- **Shape/icon** — `✓` healthy, `▲` warning, `■` critical.
- **Label suffix** — `OK / WARN / CRIT`.

## Contrast and dark/light themes

WCAG 2.x baseline:

- **Body text** — 4.5:1 (AA), 7:1 (AAA).
- **Large text and graphics** — 3:1 (AA).
- **Non-text UI** — 3:1 (AA) for focus indicators and boundaries.

For NOC/TV dashboards, design for worse contrast (glare-prone TVs, half brightness). Use AAA for stat-panel value text.

### Light vs dark themes

- **Dark theme** — saturated mid-luminance pops. Pastels disappear.
- **Light theme** — high-saturation clashes; pastels and mid-luminance read cleaner.
- Palettes tuned for one theme fail on the other. Test in both; use Grafana adaptive tokens where supported.

## Mapping to Grafana color schemes

**Standard options → Color scheme**:

- **Single color** — non-status numeric metrics. Color carries no info.
- **Shades of a color** — magnitude on a single hue.
- **From thresholds (by value)** — default for status metrics.
- **Classic palette** — categorical, indexed by field order. Brittle if query results vary.
- **Classic palette (by series name)** — indexed by series name. Stable across reruns; prefer for production
  time-series.
- **Multiple continuous colors (by value)** — Green-Yellow-Red etc. For heatmaps and gauge backgrounds; pair with field
  min/max.
- **Single continuous color (by value)** — Blues, Reds, Greens, Purples. Sequential single-hue; closer to Viridis than
  rainbow.

**Default recipe:**

- Status panels → **From thresholds (by value)**, `Base = green`, amber warn, red crit.
- Multi-series time series → **Classic palette (by series name)**.
- Heatmap → sequential continuous (Blues or Viridis-equivalent); diverging only for actual anomaly metrics.

## Anti-patterns

- **Rainbow color scales** — perceptually non-uniform. Never for sequential data.
- **Red-green-only severity** — fails for deuteranopes. Pair with brightness or shape.
- **Saturated everything** — nothing stands out. Reserve high saturation for noticeable series.
- **Hue overload** — > 10 hues becomes guessing. Use small multiples instead.
- **Decorative threshold colors** — colors should mean state changes, not decoration.
- **Inconsistent palette across panels** — lock per-entity at dashboard or org level.
- **Background gradient on every stat** — loud. Use only when panel must grab attention from across the room.
