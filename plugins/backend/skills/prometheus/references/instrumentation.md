# Instrumentation

Instrument everything. Every library, subsystem, and service should have at least
a few metrics. Instrumentation should be an integral part of your code — define
metrics in the same file you use them.

## Service Types

### Online-Serving Systems

HTTP servers, databases, APIs — anything where a human or system expects an
immediate response.

**Key metrics:**
- **Request rate:** `http_requests_total{method, status, handler}`
- **Error rate:** `http_requests_total{status=~"5.."}` or separate `http_errors_total`
- **Latency:** `http_request_duration_seconds` (histogram)
- **In-progress:** `http_requests_in_progress` (gauge)

**Guidelines:**
- Monitor both client and server side when possible
- Count requests at completion (not start) — aligns with error and latency stats
- Use a histogram for latency — enables percentile calculations and aggregation
- Always have a total requests counter alongside error counters (for ratio calculation)

### Offline Processing

Queues, pipelines, ETL jobs — processing happens asynchronously.

**Key metrics per stage:**
- **Items in:** `pipeline_items_received_total{stage}`
- **Items out:** `pipeline_items_processed_total{stage}`
- **In progress:** `pipeline_items_in_progress{stage}` (gauge)
- **Last processed timestamp:** `pipeline_last_processed_timestamp_seconds{stage}` (gauge)
- **Processing duration:** `pipeline_processing_duration_seconds{stage}` (histogram)

**Guidelines:**
- Track items at each stage to detect bottlenecks and stalls
- Export heartbeat timestamps to detect stalled processing
- If batching, also track batch count and size

### Batch Jobs

Cron jobs, scheduled tasks — do not run continuously.

**Key metrics (push to Pushgateway):**
- **Last success:** `job_last_success_timestamp_seconds` (gauge)
- **Last completion:** `job_last_completion_timestamp_seconds` (gauge)
- **Duration:** `job_duration_seconds` (gauge — represents single run, not distribution)
- **Records processed:** `job_records_processed_total` (counter)

**Guidelines:**
- Push to Pushgateway at job completion
- Batch job durations are gauges (single event), not histograms
- For jobs running > few minutes, also expose pull-based metrics for live monitoring
- Jobs running more often than every 15 minutes should be converted to daemons

## Subsystem Patterns

### Libraries

Instrument transparently — users should get metrics without configuration.

**Minimum for external resource access:**
- Request count (counter)
- Error count (counter)
- Latency (histogram)

Distinguish uses with labels where appropriate (e.g., database connection pool
should label by database name).

### Logging

For every log level, maintain a counter:

```
log_messages_total{level="info"}
log_messages_total{level="warning"}
log_messages_total{level="error"}
```

Check for significant changes in log rates as part of release validation.

### Failures

Every failure increments a counter. Always pair with a total attempts counter:

```
http_requests_total{handler="/api"}          # total
http_request_errors_total{handler="/api"}    # failures
```

Failure ratio: `rate(http_request_errors_total[5m]) / rate(http_requests_total[5m])`

### Threadpools

```
threadpool_tasks_queued        (gauge)
threadpool_threads_active      (gauge)
threadpool_threads_total       (gauge)
threadpool_tasks_completed_total  (counter)
threadpool_task_duration_seconds  (histogram)
threadpool_queue_wait_seconds     (histogram)
```

### Caches

```
cache_requests_total{result="hit"}
cache_requests_total{result="miss"}
cache_evictions_total
cache_size                     (gauge — current number of entries)
cache_request_duration_seconds (histogram — cache lookup latency)
```

Plus the downstream system's metrics (the system the cache sits in front of).

### Custom Collectors

When implementing a non-trivial custom collector:

```
mycollector_scrape_duration_seconds  (gauge — time to collect)
mycollector_scrape_errors_total      (counter — collection failures)
```

Collector durations are gauges (per-scrape measurement), not histograms.

## Things to Watch Out For

### Use Labels, Not Separate Metrics

```
# Bad — separate metrics per status code
http_responses_500_total
http_responses_403_total

# Good — single metric with label
http_responses_total{code="500"}
http_responses_total{code="403"}
```

### Don't Overuse Labels

Most metrics should have no labels. Start with none and add as concrete use
cases emerge. Keep cardinality below 10 per metric as a default target.

### Timestamps, Not Durations

```
# Bad — requires update logic, stale if process hangs
time_since_last_success_seconds

# Good — compute elapsed time in PromQL: time() - last_success_timestamp_seconds
last_success_timestamp_seconds
```

### Avoid Missing Metrics

Initialize metrics with default values (typically 0) at startup. Most client
libraries do this automatically for metrics without labels. For labeled metrics,
call the label combination once with a zero value.

### Performance in Hot Paths

Counter increments cost ~12-17ns (Java benchmark). For code called >100K times
per second:
- Limit metrics incremented in the inner loop
- Cache label lookup results (e.g., `With()` return value in Go)
- Avoid time-based observations in tight loops (syscall overhead)
