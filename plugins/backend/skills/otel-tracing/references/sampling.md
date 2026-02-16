# Sampling

Sampling controls which traces are recorded and exported. It is the primary mechanism
for managing tracing costs without losing visibility.

## Why Sample

- **Cost control** — at high throughput, 100% collection is expensive
- **Focus on interesting traces** — errors, high latency, specific users
- **Reduce noise** — health checks, synthetic traffic, routine operations
- **Representativeness** — a small sample can accurately represent the whole

## When Not to Sample

- Low-volume services (tens of traces per second)
- Regulatory requirements that prohibit dropping data
- When pre-aggregation is sufficient (metrics, not traces)
- When the cost of implementing sampling exceeds storage savings

## Head Sampling

Decision made at trace creation time, before any spans complete.

### How It Works

The sampler evaluates the trace ID, span name, initial attributes, and parent context
to decide: record, record-and-sample, or drop.

### Built-in Head Samplers

| Sampler | Behavior |
|---------|----------|
| `AlwaysOn` | Record and sample everything |
| `AlwaysOff` | Drop everything |
| `TraceIdRatioBased(ratio)` | Sample based on trace ID hash at given ratio |
| `ParentBased(root)` | Delegates based on parent sampling decision |
| `ProbabilitySampler(ratio)` | W3C Trace Context Level 2 consistent sampling |

### ParentBased Sampler

The most common production configuration. Respects parent sampling decisions while
allowing custom root sampling:

```
ParentBased(
    root = TraceIdRatioBased(0.1),           // 10% of root spans
    remoteParentSampled = AlwaysOn,          // respect sampled parent
    remoteParentNotSampled = AlwaysOff,      // respect unsampled parent
    localParentSampled = AlwaysOn,           // respect local sampled
    localParentNotSampled = AlwaysOff        // respect local unsampled
)
```

**Default SDK sampler:** `ParentBased(root=AlwaysOn)` — samples everything but
respects parent decisions.

### Head Sampling Trade-offs

| Advantage | Disadvantage |
|-----------|-------------|
| Simple to configure | Cannot inspect full trace before deciding |
| Low overhead | Cannot ensure all error traces are sampled |
| Deterministic (same trace ID = same decision) | Cannot sample based on latency |
| Works at any point in pipeline | Fixed rate, not adaptive |

## Tail Sampling

Decision made after all (or most) spans in a trace have completed. Requires
collecting all spans before deciding.

### How It Works

1. All services export spans at 100% (or use `AlwaysOn` sampler)
2. An OpenTelemetry Collector with tail sampling processor collects spans
3. The processor buffers spans by trace ID, waits for completion
4. Sampling policies evaluate complete traces and decide keep/drop

### Common Tail Sampling Policies

```yaml
processors:
  tail_sampling:
    decision_wait: 10s
    num_traces: 100
    policies:
      - name: errors-policy
        type: status_code
        status_code: { status_codes: [ERROR] }
      - name: slow-traces
        type: latency
        latency: { threshold_ms: 5000 }
      - name: baseline
        type: probabilistic
        probabilistic: { sampling_percentage: 10 }
```

| Policy | Use Case |
|--------|----------|
| `status_code` | Keep all traces with errors |
| `latency` | Keep traces exceeding a duration threshold |
| `probabilistic` | Random baseline sample for general visibility |
| `string_attribute` | Keep traces matching specific attribute values |
| `always_sample` | Keep all traces (combine with other policies) |

### Tail Sampling Architecture

```
┌─────────┐     ┌─────────┐     ┌─────────────────────┐     ┌─────────┐
│Service A │────►│Load Bal.│────►│ Collector             │────►│ Backend │
│Service B │────►│Exporter │────►│ (tail sampling proc.) │────►│         │
│Service C │────►│         │────►│                       │────►│         │
└─────────┘     └─────────┘     └─────────────────────┘     └─────────┘
```

**Critical:** All spans with the same trace ID MUST reach the same collector
instance. Use a load-balancing exporter that routes by trace ID.

### Tail Sampling Trade-offs

| Advantage | Disadvantage |
|-----------|-------------|
| Full trace visibility before deciding | Requires buffering all spans (memory) |
| Can keep all error/slow traces | Needs collector infrastructure |
| Adaptive to actual trace content | Adds latency before export |
| Sophisticated filtering | Scaling requires trace-ID-aware load balancing |

## Combined Head + Tail Sampling

For very high-volume systems:

1. **Head sampling** at the SDK level reduces volume (e.g., 10% baseline)
2. **Tail sampling** at the Collector further refines (keep all errors from the 10%)

This protects the pipeline from overload while still capturing interesting traces.

## Sampling Decision Guidance

| Scenario | Recommended Approach |
|----------|---------------------|
| Low volume (< 100 traces/sec) | `AlwaysOn` — keep everything |
| Medium volume | `ParentBased(TraceIdRatioBased(0.1))` |
| High volume, need error visibility | Tail sampling: keep errors + latency + baseline |
| High volume, budget constrained | Head sampling at 1-5% + tail for errors |
| Mixed high/low volume services | Per-service head sampling rates |

## Key Principles

1. **Start with no sampling** — add it only when cost or volume requires it
2. **Always sample errors** — configure tail sampling to keep error traces
3. **Use ParentBased** — children should follow parent decisions for complete traces
4. **Provide attributes at span creation** — samplers cannot see late-added attributes
5. **Monitor your samplers** — dropped traces mean lost visibility; track drop rates
6. **Filter health checks** — they're high volume, low value; sample aggressively
   or filter entirely
