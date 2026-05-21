# MetricsQL Behavioral Differences from PromQL

Mechanics of how MetricsQL diverges semantically. Queries using affected functions return different numbers than
Prometheus. Intentional — fixes what the VictoriaMetrics team considers PromQL bugs.

## Contents

- [The Core Diffs](#the-core-diffs)
- [Rate and Increase — Detailed Mechanics](#rate-and-increase--detailed-mechanics)
- [Function-by-Function Diff Table](#function-by-function-diff-table)
- [Prometheus-Compatible Variants](#prometheus-compatible-variants)
- [Implicit Query Conversions](#implicit-query-conversions)
- [Auto-Aligned Subqueries](#auto-aligned-subqueries)
- [Lookbehind Window Auto-Selection](#lookbehind-window-auto-selection)
- [Staleness Handling](#staleness-handling)
- [Migration Checklist](#migration-checklist)

---

## The Core Diffs

### 1. Last-Sample-Before-Window Anchor

**MetricsQL** anchors `rate()`/`increase()` to the last sample **before** the lookbehind window — catches the delta from
that sample into the first in-window sample.

**Prometheus** uses only in-window samples — loses one delta per window for slow counters.

Worst case: `increase(counter[$__interval])` with one sample per window. Prometheus reports zero forever; MetricsQL
reports the actual delta.

### 2. No Extrapolation

**MetricsQL** returns the literal observed delta. An integer counter incrementing by 5 over 5m returns exactly 5.

**Prometheus** extrapolates to window edges. The same counter might return 5.16 because the first sample landed 10s into
the window.

Impact: `increase(errors_total[5m]) > 10` fires at slightly different actual counts on the two backends.

### 3. Step Smaller Than Scrape Interval

When Grafana passes `step=5s` for a metric scraped every `30s`:

- **Prometheus** returns empty between scrapes — fewer than 2 samples in window.
- **MetricsQL** auto-widens lookbehind to `max(step, scrape_interval)` for `rate` and `default_rollup`.

Fixes [Grafana issue #11451](https://github.com/grafana/grafana/issues/11451) without user intervention.

### 4. Scalar/Instant-Vector Unification

PromQL has two number-like types: `scalar` and `instant vector with no labels`. They behave differently; `scalar()` and
`vector()` coerce.

MetricsQL treats both as the same. Explicit `scalar()` calls are usually unnecessary.

### 5. NaN Drop

`(-1)^0.5` returns empty in MetricsQL; Prometheus returns a NaN series.

Grafana renders identically. Programmatic consumers see fewer points.

### 6. Metric Name Retention for Safe Functions

Prometheus strips `__name__` after any function. MetricsQL keeps the name when the function doesn't change meaning:

- `min_over_time(foo)`, `max_over_time(foo)`, `round(foo)` → result keeps `__name__="foo"`.

Other functions still strip. Use `keep_metric_names` to override.

---

## Rate and Increase — Detailed Mechanics

**Setup:** counter sampled at `t=0, 30, 60, 90, 120` with values `100, 105, 110, 115, 125`.

**Query:** `increase(counter[60s])` at `t=120`.

**Prometheus:**

- Window = `(60, 120]`, in-window: `t=90 (115), t=120 (125)`.
- Raw delta = 125 - 115 = 10.
- Extrapolation: 60s window, 30s sample span → extrapolates to full window.
- Result: ~20.

**MetricsQL:**

- Pre-window sample: `t=60 (110)`.
- Window end: `t=120 (125)`.
- Result: 125 - 110 = 15.

For `rate()`: Prometheus ~0.33/s, MetricsQL exactly 0.25/s. MetricsQL matches what an operator would compute manually.

---

## Function-by-Function Diff Table

| Function        | MetricsQL behavior                                   | Prometheus behavior                        | Prom-compat variant   |
| :-------------- | :--------------------------------------------------- | :----------------------------------------- | :-------------------- |
| `rate`          | Last sample before window included; no extrapolation | Window-internal samples only; extrapolates | `rate_prometheus`     |
| `increase`      | Last sample before window included; no extrapolation | Window-internal samples only; extrapolates | `increase_prometheus` |
| `delta`         | Compares last-before-window to last-at-window-end    | First-in-window to last-in-window          | `delta_prometheus`    |
| `changes`       | Counts change from pre-window sample                 | Counts only in-window changes              | `changes_prometheus`  |
| `increase_pure` | Like `increase` but assumes counters start at 0      | (no equivalent)                            | —                     |

`increase_pure` differs from `increase` only in that `increase` discards an unusually large first value (treats it as a
fresh reset); `increase_pure` always treats first sample as a real value from a counter starting at 0.

---

## Prometheus-Compatible Variants

Use `_prometheus`-suffixed functions when:

- Byte-for-byte parity needed (shared dashboards, SLO rules consumed by both).
- Maintaining a query library targeting both backends.
- Debugging a discrepancy to confirm it's rate semantics.

Variants:

- `rate_prometheus(m[d])` — added v1.120.0, computed as `increase_prometheus(m[d]) / d`.
- `increase_prometheus(m[d])`.
- `delta_prometheus(m[d])`.
- `changes_prometheus(m[d])`.

These still don't extrapolate — they ignore the pre-window sample but follow MetricsQL's no-NaN, no-extrapolation rules.
For exact parity in every detail, use Prometheus.

---

## Implicit Query Conversions

Every incoming query is rewritten unless `-search.disableImplicitConversion`. `-search.logImplicitConversion` logs
rewrites.

### Lookbehind Window Auto-Fill

When `[d]` is omitted:

- `default_rollup` and `rate` → `[max(step, scrape_interval)]`.
- All other rollups → `[step]` (`[1i]` / `[$__interval]`).

`avg_over_time(temperature)` → `avg_over_time(temperature[1i])`.

### Default-Rollup Wrapping

Series selectors not inside a rollup get wrapped in `default_rollup`:

- `foo` → `default_rollup(foo)`.
- `foo + bar` → `default_rollup(foo) + default_rollup(bar)`.
- `count(up)` → `count(default_rollup(up))` (aggregate, not rollup).
- `abs(temperature)` → `abs(default_rollup(temperature))` (transform, not rollup).

`default_rollup` returns the last raw sample in window.

### Subquery Step Injection

Subqueries without explicit step get `1i`:

- `avg_over_time(rate(http_requests_total[5m])[1h])` → `avg_over_time(rate(http_requests_total[5m])[1h:1i])`.

### Implicit Subquery Formation

Rollups on non-selectors form subqueries with `1i` lookbehind and `1i` step:

- `rate(sum(up))` → `rate((sum(default_rollup(up)))[1i:1i])`.

Silent-subquery trap — performance differs from the apparent rate.

---

## Auto-Aligned Subqueries

Subquery sample timestamps align deterministically:

- Inner rollup uses outer's **step** (not user-supplied step in `[d:step]`).
- Outer rollup uses the query `step` from `/api/v1/query_range`.

`max_over_time(rate(http_requests_total[5m])[1h:30s])`:

- Inner `rate` evaluated at 30s intervals over trailing 1h.
- Outer `max_over_time` reduces 120 values to one per Grafana step.

Alignment guarantees repeatable reads — useful for caching, problematic if random offsets expected.

---

## Lookbehind Window Auto-Selection

| Function family   | Window if omitted            | Rationale                                 |
| :---------------- | :--------------------------- | :---------------------------------------- |
| `default_rollup`  | `max(step, scrape_interval)` | Prevents gaps when step < scrape_interval |
| `rate`            | `max(step, scrape_interval)` | Rate needs ≥2 samples                     |
| All other rollups | `step` (`1i`)                | Aligns to Grafana points                  |

`step` source:

- `/api/v1/query_range?step=30s` → `step = 30s`.
- `/api/v1/query?time=...` → current eval interval.

**Alerting implication:** vmalert evaluates at fixed intervals. `rate(errors[1m])` in an alert may silently widen if
`1m < scrape_interval`. Prefer explicit wide windows (`[5m]`+) for deterministic alert behavior.

---

## Staleness Handling

- **`default_rollup`** — staleness-aware. Returns no value for series with a staleness marker in the lookbehind.
- **`last_over_time`** — not staleness-aware. Returns last sample regardless.

Use `default_rollup` to detect "metric stopped reporting." Use `last_over_time` when staleness markers should be treated
as zero-data noise.

`stale_samples_over_time(m[d])` counts staleness markers — for tracking churn in service discovery or pod lifecycles.

---

## Migration Checklist

- [ ] Audit alerts comparing `increase()`/`rate()` to fixed thresholds. Accept new numbers or switch to `*_prometheus`.
- [ ] Replace `rate(sum(x))` patterns — silent subqueries in MetricsQL. `sum(rate(x[5m]))` is faster and predictable.
- [ ] Audit recording rules with omitted lookbehinds. Add explicit `[5m]` to lock behavior.
- [ ] Test with `-search.logImplicitConversion` enabled; verify conversions match intent.
- [ ] For dual-backend consumers, decide per-query: standard or `*_prometheus` variant. Document the choice.
- [ ] Grafana dashboards: omitted lookbehind OK where `$__interval` scales appropriately. Explicit windows for
      zoom-stable production dashboards.
- [ ] Watch `count(up)`-style queries depending on Prometheus NaN behavior — MetricsQL drops NaN; count may differ.
