# Dashboard Layout

Information hierarchy, scanning patterns, and observability dashboard frameworks (RED, USE, Four Golden Signals, SLO).

## Contents

- [Reading patterns: F and Z](#reading-patterns-f-and-z)
- [Information hierarchy](#information-hierarchy)
- [Grouping and grid discipline](#grouping-and-grid-discipline)
- [Progressive disclosure](#progressive-disclosure)
- [Observability frameworks](#observability-frameworks)
- [SLO/SLI dashboards](#sloslii-dashboards)
- [Layout anti-patterns](#layout-anti-patterns)

---

## Reading patterns: F and Z

Eye-tracking (Nielsen 2006): users scan unfamiliar pages in **F-pattern** — two horizontal sweeps across the top, then
vertical down the left. Shorter pages with known layouts follow **Z-pattern** — top-left → top-right → diagonal to
bottom-left → bottom-right.

Both share priority: **top-left has highest attention, bottom-right lowest.**

### Implications for dashboards

- **Top-left = headline KPI.** SRE: SLO burn rate or current error rate. Product: active users or revenue.
- **Top row = state-at-a-glance.** Stat panels with current values and thresholds.
- **Second row = trends.** Time-series for the same metrics.
- **Lower rows = detail and drilldown.** Per-service tables, per-error breakdowns.
- **Bottom-right = least-important reference.** Runbook links, documentation, "last updated" footer.

## Information hierarchy

Signal importance must be visible at a glance through three coupled cues:

- **Size** — larger = higher priority. A 24×8 headline panel signals "this is the answer."
- **Position** — top-left first, then left-to-right, top-to-bottom.
- **Color emphasis** — saturated/red on headline; muted/blue/grey on context.

When all three agree, hierarchy is unambiguous. When they fight, viewers don't know what to look at.

### Tier the panels

- **Tier 1** — primary KPIs. Visible without scrolling. 2–4 panels max.
- **Tier 2** — supporting trends and breakdowns. Short scroll OK.
- **Tier 3** — drilldown, references, raw tables. Behind tabs, rows, `Show more`.

Aim for ≤ 12 panels in the initial viewport.

## Grouping and grid discipline

Grafana's 24-column grid enforces visual hierarchy.

- **Column rhythm:** pick a unit (6, 8, 12). Three columns of 8 or two of 12 = clean. 7+5+4+8 = noisy.
- **Row groupings:** **Rows** (Classic) or `RowsLayout` (V2) for collapsible blocks (CPU, Memory, Disk, Network).
- **Tabs (V2 `TabsLayout`):** for multiple lenses (per-region, per-service) where user needs one at a time. Don't hide
  unrelated views behind tabs.
- **Consistent panel sizes within a row.** Mixed heights force the eye to re-anchor.
- **Align axes across small multiples.** All panels share y-axis range; use **Auto grid layout** with min/max overrides.

### Repeat for symmetry

Repeating panels and rows (multi-value variables) enforce structural consistency. Prefer over hand-crafted per-entity
panels when entities are interchangeable.

## Progressive disclosure

Top answers "is this OK?" in under 3 seconds; rest expands to "why?" when something is wrong.

- **Headline → trend → breakdown → trace.** Stat (error rate) → series (24h) → table (top errors) → data link (traces).
- **Variables as filters.** `env`, `service`, `region`. Default to "whole system"; drilldown narrows.
- **Drilldown via data links.** Click series → per-service dashboard, variables and time range preserved (see
  `dashboards` skill, `annotations-links.md`).
- **Folded rows for tier 3.** Default collapsed; on-call expands when needed.

## Observability frameworks

### Google's Four Golden Signals (SRE Book)

- **Latency** — request duration. Distinguish success and error latency.
- **Traffic** — load. Requests/sec, transactions/min.
- **Errors** — rate of failed requests (HTTP 5xx, exceptions).
- **Saturation** — how full the system is. CPU, memory, queue depth, connection pool.

**Use for:** user-facing services.

**Panel mapping:**

- Latency → series with p50/p95/p99, plus stat for current p95.
- Traffic → series of request rate, plus current-rate stat.
- Errors → series of error rate/%, plus stat with thresholds (warn 1%, crit 5%).
- Saturation → series of headline resource, plus per-resource bar gauges.

### RED method (Tom Wilkie)

- **Rate** — requests/sec.
- **Errors** — failed request rate.
- **Duration** — request-time distribution.

**Use for:** request-driven services (HTTP, gRPC, message handlers). Golden Signals minus saturation; better for bursty
workloads.

**Panel mapping:** one row per service — rate stat, error-% stat, latency percentile series, latency bucket heatmap.

### USE method (Brendan Gregg)

- **Utilization** — % time resource was busy.
- **Saturation** — queued extra work (run-queue depth, page-ins, retries).
- **Errors** — resource error events.

**Use for:** resources (disks, NICs, CPUs, GPUs, FDs). Natural for capacity planning and host-health dashboards.

**Panel mapping:** utilization series, saturation series, error stat. Stack USE per resource type.

### Pick the right framework

- **Customer-facing service** → Four Golden Signals or RED (RED when saturation is hard to define).
- **Resource** → USE.
- **Whole-platform overview** → mix: Golden Signals for traffic/error/latency; USE for capacity tiers.

## SLO/SLI dashboards

SLI = measurable property (`successful_requests / total_requests`). SLO = target over a window (`99.9% over 28d`).
Remaining tolerance = **error budget**.

Standard panel set:

- **SLI current value** — large stat, threshold = SLO target. Green ≥ target, red below.
- **Error budget remaining** — stat: `1 - (1 - SLI) / (1 - SLO)` as %. Red near zero.
- **Burn rate** — `current_failure_rate / budget_failure_rate`. > 1 burns faster than allowed.
- **SLO compliance over time** — SLI series with SLO target as threshold line.
- **Burn-down chart** — remaining budget over SLO window.
- **Multi-window burn-rate alerts** — paired short/long-window signals (e.g., 1h burn > 14.4 AND 5m burn > 14.4). Alert
  state visible on dashboard.

**Layout:** SLO summary stats top. SLO trend + burn-down middle. SLI failure-mode breakdown bottom.

## Layout anti-patterns

- **Dashboard sprawl** — 50 panels, no hierarchy. Split into top-level overview + deep-dives.
- **Headline panel at the bottom** — viewers miss alert state.
- **Equal-priority everything** — without size/position cues, viewers can't tell what matters.
- **Variable filter at the bottom** — variables go above the dashboard or in controls.
- **One dashboard for "everything"** — becomes unmaintained. Per-service or per-concern survives.
- **Decoration rows** — text panels saying "CPU Metrics" between rows. Row title is the label.
- **Stale panels** — broken queries, moved sources. Audit and delete.
- **No time range guidance** — default should match purpose (24h ops, 28d SLO). `now-6h` rarely right.
