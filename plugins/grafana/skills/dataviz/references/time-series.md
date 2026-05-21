# Time-Series Specifics

Visual conventions for time-stamped data: aspect ratio, baseline, interpolation, dual axes, stacking.

## Contents

- [Aspect ratio and banking to 45°](#aspect-ratio-and-banking-to-45)
- [Baseline rules](#baseline-rules)
- [Interpolation choices](#interpolation-choices)
- [Aggregation and resolution](#aggregation-and-resolution)
- [Dual y-axes — when and when not](#dual-y-axes--when-and-when-not)
- [Stacking](#stacking)
- [Time-series anti-patterns](#time-series-anti-patterns)

---

## Aspect ratio and banking to 45°

Cleveland's "banking to 45°": slopes read most accurately when the average absolute angle is near 45°. Above 45° (tall
narrow) and below 45° (wide short) degrade trend estimation.

Rule of thumb:

- **Wider than tall** — typical observability panels 2:1 to 4:1.
- **Don't compress vertically** — < 120 px tall hides small variations.
- **Don't stretch horizontally** — 24-wide × 12-month at 5-min step is noise.

Grafana grid (24 cols × 30 px row unit) sweet spots:

- Headline trend full width: `w: 24, h: 8` (240 px).
- Side-by-side: `w: 12, h: 8` each.
- Sparkline tiles: `w: 6, h: 4`.

For long-horizon (28d SLO) accept narrower width over taller chart — shape matters more than point precision.

## Baseline rules

Baseline = y-axis lower bound. Most consequential axis decision.

- **Zero baseline** for ratios, rates, counts, bounded fractions. Anywhere "twice as much" is meaningful. Bar charts
  always need zero.
- **Skip zero** only for unbounded magnitudes where variation is the signal (stock prices, ambient temperature, uptime
  hours).
- **Never truncate silently.** Mark with axis labels or broken-axis indicator.
- **Thresholds inside visible range.** A "warn at 80%" line is useless if the y-axis caps at 50%.

Grafana enforcement:

- **Standard options → Min** = `0` for rates/ratios/counts.
- **Soft min / Soft max** bounds noise without clipping outliers.
- **Field min/max** for per-field ranges in multi-metric panels.

## Interpolation choices

Line type between samples encodes an assumption about what happened.

- **Linear** — default. Continuous change between samples. Honest for most metrics.
- **Smooth (curved Bezier)** — **lies.** Curves dip below lowest or rise above highest sample. Never on operational
  dashboards.
- **Step before** — value snaps to new reading at sample timestamp; flat between. For **discrete-state metrics**
  (feature flags, node count, queue depth).
- **Step after** — holds old reading until next sample. For **last-known-state** metrics persisting between
  observations.
- **Bars** — closed-bucket aggregates (requests-per-minute), not continuous samples.
- **Points** — low/irregular sample density where lines would lie about temporal density.

### Show points

`Show points: Auto` reveals points when density is low. Keep auto on; force `Always` only for scatter-style clouds.

## Aggregation and resolution

Grafana downsamples to fit panel pixel width. Aggregation choice affects spike survival.

- **`max` / `min`** preserves spikes. Latency, queue depth — worst moment matters.
- **`avg` / `mean`** smooths spikes. Throughput, request rate — typical level matters.
- **`last`** most recent value in the bucket. Gauge-like sampled metrics.
- **`sum`** for counters/rates already broken up by upstream `rate()`.

**`$__interval` vs `$__rate_interval`:**

- `$__interval` — Grafana-computed bucket size.
- `$__rate_interval` — Prometheus-specific; satisfies 4× scrape-interval rule. Always use in `rate()`.

When in doubt: overlay `avg` and `max`. Spikes disappearing under `avg` reveal themselves in `max`.

## Dual y-axes — when and when not

Often abused.

**OK:**

- **Correlated signals, different units.** Request rate (req/s, left) vs latency (ms, right) — visual coincidence is the
  message.
- **Single-source, two-unit panels.** Temperature (°C) + humidity (%) on same sensor.

**Anti-pattern:**

- **Forcing unrelated metrics into one panel** to save space. Split into two panels with shared time axis.
- **Hiding scale differences.** Different ranges make 1% look bigger than 50%. Normalize and use one axis.
- **More than two axes.** Unreadable.

**When dual axes are right:**

- Dominant metric left, supporting right.
- Different line styles (solid vs dashed) to map to axis.
- Match axis-label colors to series colors.

Configure via per-series overrides — **Standard options → Unit**, **Axis → Placement** (`Left` / `Right`).

## Stacking

Stacked charts add series cumulatively. Top = total; intermediate lines = boundary positions.

**When stacking helps:**

- **Parts of a whole summing to total.** Disk usage by partition.
- **Layered counters composing into a meaningful sum.** Request rate by status code.

**When stacking hurts:**

- **Cleveland's caveat:** non-bottom series read against non-flat baseline. Upper layers noisy.
- **Trend comparison of components.** "Did service A spike?" — unstacked beats stacked.
- **Independent entities.** Stacking CPU of 10 unrelated hosts implies a fake total.

**Mode choice:**

- `Normal` — cumulative absolute.
- `100%` — cumulative percentage. Use when proportions matter and total doesn't.

Default **unstacked**. Stack only when components sum meaningfully and user needs both total and breakdown.

## Time-series anti-patterns

- **Truncated y-axis with no indication** — most common chart lie.
- **Smooth interpolation on operational metrics** — curves invent data.
- **Mismatched dual-axis scales** silently exaggerating one signal.
- **Stacked area for 20 series** — bottom dominates, top unreadable. Top-N filter or small multiples.
- **`avg` downsampling on latency** — hides p99 spikes. Use `max` or render histogram quantile.
- **Time-window mismatch between panels** — viewers draw wrong conclusions. Use dashboard time controls.
- **No legend naming convention** — `legendFormat` (Prometheus), aliases (SQL), or **Organize fields by name**.
- **Refresh rate < sample rate** — burns CPU without new data. Match refresh to slowest source.
