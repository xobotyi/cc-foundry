# MetricsQL Function Catalog

All functions by category. `(PromQL)` marks PromQL-supported entries — prefer them when queries may be ported.

## Contents

- [Rollup Functions](#rollup-functions)
- [Transform Functions](#transform-functions)
- [Label Manipulation Functions](#label-manipulation-functions)
- [Aggregate Functions](#aggregate-functions)

Unmarked = MetricsQL-only.

---

## Rollup Functions

Operate on `func(selector[d])` — calculate over raw samples in the window.

### Counter / Rate Family

- **`rate(m[d])`** (PromQL) — per-second avg increase rate; MetricsQL includes pre-window sample. See
  behavioral-diffs.md.
- **`rate_prometheus(m[d])`** — Prometheus-compatible rate (excludes pre-window sample)
- **`irate(m[d])`** (PromQL) — instant rate from last two samples
- **`increase(m[d])`** (PromQL) — total increase over window; MetricsQL includes pre-window sample
- **`increase_prometheus(m[d])`** — Prometheus-compatible increase
- **`increase_pure(m[d])`** — like `increase` but assumes counters always start from 0
- **`delta(m[d])`** (PromQL) — diff between last-before-window and last-at-window-end
- **`delta_prometheus(m[d])`** — first-in-window to last-in-window
- **`idelta(m[d])`** (PromQL) — diff between last two samples
- **`changes(m[d])`** (PromQL) — count of value changes (includes pre-window transition)
- **`changes_prometheus(m[d])`** — Prometheus-compatible changes count
- **`resets(m[d])`** (PromQL) — counter reset count
- **`rate_over_sum(m[d])`** — per-second rate over the sum of raw samples (for gauges)

### Statistical Aggregations Over Time

- **`avg_over_time(m[d])`** (PromQL), **`sum_over_time(m[d])`** (PromQL), **`min_over_time(m[d])`** (PromQL),
  **`max_over_time(m[d])`** (PromQL), **`count_over_time(m[d])`** (PromQL)
- **`median_over_time(m[d])`** — median value
- **`mode_over_time(m[d])`** — most frequent value (assumes discrete values)
- **`geomean_over_time(m[d])`** — geometric mean
- **`stddev_over_time(m[d])`** (PromQL), **`stdvar_over_time(m[d])`** (PromQL)
- **`mad_over_time(m[d])`** — median absolute deviation
- **`sum2_over_time(m[d])`** — sum of squares
- **`range_over_time(m[d])`** — max - min over the window
- **`quantile_over_time(phi, m[d])`** (PromQL), **`quantiles_over_time("label", phi1,...,phiN, m[d])`**
- **`distinct_over_time(m[d])`** — count of unique values
- **`zscore_over_time(m[d])`** — z-score for raw samples

### Conditional Counting

- **`count_eq_over_time(m[d], eq)`**, **`count_ne_over_time(m[d], ne)`**
- **`count_gt_over_time(m[d], gt)`**, **`count_le_over_time(m[d], le)`**
- **`sum_eq_over_time(m[d], eq)`**, **`sum_gt_over_time(m[d], gt)`**, **`sum_le_over_time(m[d], le)`**
- **`share_eq_over_time(m[d], eq)`** — share in `[0..1]` of samples equal to `eq`; useful for SLI/SLO
- **`share_gt_over_time(m[d], gt)`**, **`share_le_over_time(m[d], le)`**
- **`count_values_over_time("label", m[d])`** — count per distinct value, exposed as label

### Increase/Decrease Counting

- **`increases_over_time(m[d])`** — count of value increases
- **`decreases_over_time(m[d])`** — count of value decreases
- **`ascent_over_time(m[d])`**, **`descent_over_time(m[d])`** — cumulative magnitude of increases/decreases

### Derivatives and Prediction

- **`deriv(m[d])`** (PromQL) — per-second derivative via linear regression
- **`deriv_fast(m[d])`** — per-second derivative from first and last sample only
- **`ideriv(m[d])`** — derivative from last two samples
- **`predict_linear(m[d], t)`** (PromQL) — linear extrapolation `t` seconds into future
- **`holt_winters(m[d], sf, tf)`** (PromQL) — double exponential smoothing
- **`integrate(m[d])`** — area under the curve

### Sample Position and Timing

- **`first_over_time(m[d])`**, **`last_over_time(m[d])`** (PromQL)
- **`tfirst_over_time(m[d])`** — timestamp of first sample
- **`tlast_over_time(m[d])`** — alias for `timestamp(m[d])`
- **`tlast_change_over_time(m[d])`** — timestamp of last value change
- **`tmax_over_time(m[d])`**, **`tmin_over_time(m[d])`** — timestamp of sample with max/min value
- **`timestamp(m[d])`** (PromQL) — timestamp of last sample
- **`timestamp_with_name(m[d])`** — same as `timestamp` but keeps metric name
- **`lag(m[d])`** — seconds between last sample and current point
- **`lifetime(m[d])`** — seconds between first and last sample in window
- **`duration_over_time(m[d], max_interval)`** — duration the series was present (gaps ignored)
- **`scrape_interval(m[d])`** — average interval between samples

### Anomaly Detection

- **`outlier_iqr_over_time(m[d])`** — returns last sample if outside `[q25-1.5*iqr, q75+1.5*iqr]`
- **`hoeffding_bound_lower(phi, m[d])`**, **`hoeffding_bound_upper(phi, m[d])`** — Hoeffding bounds

### Histogram

- **`histogram_over_time(m[d])`** — VictoriaMetrics-format histogram from gauge values

### Multi-Result Rollups (return labeled families)

These return multiple series tagged with `rollup="..."`:

- **`rollup(m[d])`** — min/max/avg
- **`rollup_rate(m[d])`** — per-second rate min/max/avg over adjacent samples
- **`rollup_increase(m[d])`**, **`rollup_delta(m[d])`**, **`rollup_deriv(m[d])`**
- **`rollup_scrape_interval(m[d])`** — interval min/max/avg
- **`rollup_candlestick(m[d])`** — OHLC values

Optional second arg `"min"`, `"max"`, etc. returns only one component without the `rollup` label.

### Special

- **`default_rollup(m[d])`** — last sample (staleness-aware); auto-applied to bare selectors
- **`absent_over_time(m[d])`** (PromQL), **`present_over_time(m[d])`** (PromQL)
- **`aggr_over_time(("func1","func2",...), m[d])`** — apply multiple rollup functions in one pass
- **`stale_samples_over_time(m[d])`** — count of staleness markers

---

## Transform Functions

Operate on rollup results. If applied directly to a series selector, `default_rollup` is auto-applied first.

### Arithmetic and Math

- **`abs(q)`** (PromQL), **`sgn(q)`**
- **`ceil(q)`** (PromQL), **`floor(q)`** (PromQL), **`round(q, nearest?)`** (PromQL)
- **`exp(q)`** (PromQL), **`ln(q)`** (PromQL), **`log2(q)`** (PromQL), **`log10(q)`** (PromQL)
- **`sqrt(q)`** (PromQL)
- **`clamp(q, min, max)`** (PromQL), **`clamp_min(q, min)`** (PromQL), **`clamp_max(q, max)`** (PromQL)

### Trigonometric

- **`sin(q)`** (PromQL), **`cos(q)`** (PromQL), **`tan(q)`** (PromQL)
- **`asin(q)`** (PromQL), **`acos(q)`** (PromQL), **`atan(q)`** (PromQL)
- **`sinh(q)`**, **`cosh(q)`**, **`tanh(q)`**
- **`asinh(q)`**, **`acosh(q)`**, **`atanh(q)`**
- **`deg(q)`** (PromQL), **`rad(q)`** (PromQL), **`pi()`** (PromQL)

### Time and Date

- **`time()`** (PromQL) — eval timestamp
- **`now()`** — current wall-clock timestamp
- **`start()`**, **`end()`**, **`step()`** — bounds of query range
- **`day_of_month(q)`** (PromQL), **`day_of_week(q)`** (PromQL), **`day_of_year(q)`** (PromQL)
- **`days_in_month(q)`** (PromQL), **`hour(q)`** (PromQL), **`minute(q)`** (PromQL)
- **`month(q)`** (PromQL), **`year(q)`** (PromQL)
- **`timezone_offset(tz)`** — seconds offset of timezone
- **`ttf(q)`** — time-to-failure estimate based on current rate

### Histograms

- **`histogram_quantile(phi, buckets, boundsLabel?)`** (PromQL)
- **`histogram_quantiles("label", phi1,...,phiN, buckets)`**
- **`histogram_avg(buckets)`**, **`histogram_fraction(lower, upper, buckets)`**
- **`histogram_stddev(buckets)`**, **`histogram_stdvar(buckets)`**
- **`prometheus_buckets(q)`** — convert VictoriaMetrics histogram to Prometheus format
- **`buckets_limit(k, buckets)`** — keep only top-K buckets

### Range Transforms

- **`range_avg(q)`**, **`range_sum(q)`**, **`range_min(q)`**, **`range_max(q)`**
- **`range_first(q)`**, **`range_last(q)`**
- **`range_median(q)`**, **`range_quantile(phi, q)`**
- **`range_stddev(q)`**, **`range_stdvar(q)`**, **`range_mad(q)`**
- **`range_normalize(q1, ..., qN)`** — normalize to `[0..1]`
- **`range_linear_regression(q)`** — linear fit over range
- **`range_zscore(q)`**, **`range_trim_zscore(q)`**, **`range_trim_outliers(q)`**, **`range_trim_spikes(q)`**

### Running Aggregates

- **`running_avg(q)`**, **`running_max(q)`**, **`running_min(q)`**, **`running_sum(q)`**

### Smoothing and Interpolation

- **`smooth_exponential(q, sf)`** — exponential smoothing
- **`interpolate(q)`** — fill gaps with linear interpolation
- **`keep_last_value(q)`** — fill gaps with last known value
- **`keep_next_value(q)`** — fill gaps with next known value
- **`remove_resets(q)`** — make counter monotonic by removing apparent resets

### Sorting and Limiting

- **`sort(q)`** (PromQL), **`sort_desc(q)`** (PromQL)
- **`limit_offset(limit, offset, q)`** — pagination

### Series-Level

- **`absent(q)`** (PromQL), **`scalar(q)`** (PromQL), **`vector(q)`** (PromQL)
- **`drop_empty_series(q)`** — drop series that are entirely empty
- **`union(q1, ..., qN)`** — combine multiple query results

### Bit Operations

- **`bitmap_and(q, mask)`**, **`bitmap_or(q, mask)`**, **`bitmap_xor(q, mask)`**

### Random

- **`rand()`**, **`rand_normal()`**, **`rand_exponential()`** — pseudo-random number generators

### Resource Utilization

- **`ru(free, max)`** — resource utilization: `100 * (max - free) / max`

---

## Label Manipulation Functions

Transform labels on result series without changing values.

### Set / Modify Labels

- **`label_set(q, "label1", "v1", ..., "labelN", "vN")`** — set/overwrite labels
- **`label_del(q, "label1", ..., "labelN")`** — delete labels
- **`label_copy(q, "src1", "dst1", ..., "srcN", "dstN")`** — copy label values
- **`label_move(q, "src1", "dst1", ..., "srcN", "dstN")`** — move (copy then delete source)
- **`label_keep(q, "label1", ..., "labelN")`** — keep only listed labels
- **`label_replace(q, "dst", "replacement", "src", "regex")`** (PromQL) — regex-based replacement
- **`label_join(q, "dst", "sep", "src1", ..., "srcN")`** (PromQL) — join multiple labels into one

### Case Conversion

- **`label_lowercase(q, "label1", ..., "labelN")`**
- **`label_uppercase(q, "label1", ..., "labelN")`**

### Value-Based

- **`label_value(q, "label")`** — replace series value with numeric parse of label value
- **`label_map(q, "label", "src1", "dst1", ..., "srcN", "dstN")`** — value-mapping table
- **`label_transform(q, "label", "regex", "replacement")`** — regex transform on label value

### Matching

- **`label_match(q, "label", "regex")`** — keep series where label matches regex
- **`label_mismatch(q, "label", "regex")`** — keep series where label does NOT match regex
- **`labels_equal(q, "label1", "label2", ...)`** — keep series where listed labels have equal values

### Special

- **`alias(q, "name")`** — set `__name__` on results
- **`drop_common_labels(q1, ..., qN)`** — drop labels with the same value across all series
- **`label_graphite_group(q, groupIdx)`** — extract Graphite-path group as a label

### Sorting

- **`sort_by_label(q, "label1", ..., "labelN")`** — alphabetical
- **`sort_by_label_desc(q, ...)`** — alphabetical descending
- **`sort_by_label_numeric(q, ...)`** — numeric
- **`sort_by_label_numeric_desc(q, ...)`** — numeric descending

---

## Aggregate Functions

Reduce many series to fewer via grouping. All accept `by(labels)` / `without(labels)` and optional `limit N`.

### Basic Statistics

- **`sum(q)`** (PromQL), **`avg(q)`** (PromQL), **`min(q)`** (PromQL), **`max(q)`** (PromQL), **`count(q)`** (PromQL)
- **`median(q)`** — quantile 0.5
- **`mode(q)`** — most frequent value (discrete)
- **`geomean(q)`** — geometric mean
- **`stddev(q)`** (PromQL), **`stdvar(q)`** (PromQL)
- **`mad(q)`** — median absolute deviation
- **`sum2(q)`** — sum of squares

### Selection (Top/Bottom-K)

- **`topk(k, q)`** (PromQL), **`bottomk(k, q)`** (PromQL)
- **`topk_avg(k, q, ...)`**, **`bottomk_avg(k, q, ...)`** — k series with largest/smallest avg
- **`topk_min(k, q)`**, **`bottomk_min(k, q)`** — by min value
- **`topk_max(k, q)`**, **`bottomk_max(k, q)`** — by max value
- **`topk_last(k, q)`**, **`bottomk_last(k, q)`** — by last value
- **`topk_median(k, q)`**, **`bottomk_median(k, q)`** — by median
- **`outliersk(k, q)`** — k most extreme outliers
- **`outliers_iqr(q)`** — series with samples outside `[q25-1.5*iqr, q75+1.5*iqr]`
- **`outliers_mad(tolerance, q)`** — outliers by MAD

### Limiting

- **`limitk(k, q)`** — keep k series (arbitrary)
- **`any(q)`** — return one arbitrary series per group

### Quantiles

- **`quantile(phi, q)`** (PromQL), **`quantiles("label", phi1,...,phiN, q)`**

### Counting Variants

- **`count_values("label", q)`** (PromQL) — count per distinct value
- **`distinct(q)`** — count of distinct values

### Other

- **`group(q)`** (PromQL) — labels-only aggregation
- **`histogram(q)`** — produce VictoriaMetrics histogram from instant values
- **`zscore(q)`** — per-group z-score

### `limit N` Suffix

Cap result series after aggregation:

```
sum(x) by (y) limit 3
```

Keeps an arbitrary 3 series per `y` group. Distinct from `topk(3, sum(x) by (y))` which keeps the largest 3.
