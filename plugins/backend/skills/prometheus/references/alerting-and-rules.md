# Alerting and Recording Rules

## Alerting Philosophy

Keep alerting simple. Alert on **symptoms** (user-visible impact), not causes.
Have good dashboards to pinpoint causes after an alert fires.

### What to Alert On

**Online-serving systems:**
- High latency (user-facing, as high in the stack as possible)
- High error rate (user-visible errors)
- Only page on latency at one point in the stack — if the overall user latency
  is fine, don't page on a slow sub-component

**Offline processing:**
- Data taking too long to get through the system

**Batch jobs:**
- Job has not succeeded recently enough to avoid user impact
- Threshold: at least 2x the normal job run cycle

**Capacity:**
- Approaching resource limits that will cause outage without intervention

**Meta-monitoring:**
- Prometheus, Alertmanager, Pushgateway are healthy
- Prefer blackbox tests (end-to-end) over individual component checks

### Alert Naming

Use CamelCase for alert names (community convention):

```yaml
- alert: HighRequestLatency
  expr: histogram_quantile(0.95, sum by (le, job) (rate(http_request_duration_seconds_bucket[5m]))) > 0.5
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "High request latency on {{ $labels.job }}"
    description: "95th percentile latency is {{ $value }}s (threshold: 0.5s)"
```

### Alert Design Guidelines

1. **Allow for slack.** Use `for` duration to accommodate small blips.
2. **Link to relevant dashboards** in annotations.
3. **Include threshold in description** so on-call knows the boundary.
4. **Avoid noisy alerts.** If an alert fires and there's nothing to do, remove it.
5. **Different alert types for different request characteristics** — low-traffic
   endpoints may need different thresholds than high-traffic ones.

## Recording Rules

Recording rules pre-compute frequently used or expensive expressions. They run
at evaluation intervals and store the result as a new time series.

### Naming Convention

```
level:metric:operations
```

- **level** — Aggregation level and labels of the output
- **metric** — Original metric name (strip `_total` when using `rate()`)
- **operations** — Applied operations, newest first

```yaml
# rate of requests per instance and path
- record: instance_path:requests:rate5m
  expr: rate(requests_total{job="myjob"}[5m])

# aggregate away instance
- record: path:requests:rate5m
  expr: sum without (instance)(instance_path:requests:rate5m{job="myjob"})
```

### Aggregation Rules

1. **Aggregate ratios correctly.** Aggregate numerator and denominator separately,
   then divide. Never average a ratio or average an average.

```yaml
# Failure ratio — aggregate numerator and denominator separately
- record: instance_path:request_failures:rate5m
  expr: rate(request_failures_total{job="myjob"}[5m])

- record: instance_path:request_failures_per_requests:ratio_rate5m
  expr: |2
      instance_path:request_failures:rate5m{job="myjob"}
    /
      instance_path:requests:rate5m{job="myjob"}

# Aggregate up — divide after aggregation
- record: path:request_failures_per_requests:ratio_rate5m
  expr: |2
      sum without (instance)(instance_path:request_failures:rate5m{job="myjob"})
    /
      sum without (instance)(instance_path:requests:rate5m{job="myjob"})
```

2. **Use `without` for aggregation.** Preserves all labels except the ones you're
   removing, avoiding accidental label loss.

3. **Average latency from summary/histogram** — use `mean` operation name:

```yaml
- record: instance_path:request_latency_seconds_count:rate5m
  expr: rate(request_latency_seconds_count{job="myjob"}[5m])

- record: instance_path:request_latency_seconds_sum:rate5m
  expr: rate(request_latency_seconds_sum{job="myjob"}[5m])

- record: instance_path:request_latency_seconds:mean5m
  expr: |2
      instance_path:request_latency_seconds_sum:rate5m{job="myjob"}
    /
      instance_path:request_latency_seconds_count:rate5m{job="myjob"}
```

4. **Level labels must match.** The labels removed via `without` should be
   reflected in the output level. If `without (instance)` is applied, the
   output level should not include `instance`.

### When to Use Recording Rules

- Dashboard queries that are expensive and queried frequently
- Expressions used in multiple alerts
- Complex multi-step aggregations (build up in layers)
- When `histogram_quantile()` on large datasets causes query timeouts

### Recording Rule Anti-Patterns

| Don't | Why |
|-------|-----|
| Record everything | Costs storage, most rules are unused |
| Skip intermediate levels | Harder to debug, can't reuse steps |
| Use `by` instead of `without` | Silently drops new labels added later |
| Average ratios | Statistically invalid — aggregate components separately |
| Inconsistent naming | Level/metric/operation structure exists for a reason |
