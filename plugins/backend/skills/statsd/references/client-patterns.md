# Client Library Patterns

StatsD clients send UDP datagrams from your application to the local
StatsD/DogStatsD agent. Client configuration has a direct impact on
metric accuracy and application performance.

## Client Setup

### Connection

StatsD listens on UDP port **8125** by default. DogStatsD also supports
Unix Domain Sockets (UDS) for lower overhead.

```
# Standard StatsD
host: 127.0.0.1, port: 8125, protocol: UDP

# DogStatsD with UDS (lower overhead, recommended for containers)
socket_path: /var/run/datadog/dsd.socket
```

### Initialization Best Practices

1. **Create one client instance per application.** Do not create a new
   client per request — connection setup and buffering state would be lost.
2. **Set a namespace prefix.** Automatically prepends to all metric names:
   `namespace: "myapp"` turns `request.count` into `myapp.request.count`.
3. **Set global/constant tags.** Tags that apply to every metric
   (env, service, version) should be set once at initialization.
4. **Close/flush on shutdown.** Buffered metrics are lost if the client
   is not flushed before process exit.

### Language Examples

**Go:**
```go
client, err := statsd.New("127.0.0.1:8125",
    statsd.WithNamespace("myapp."),
    statsd.WithTags([]string{"env:prod", "service:api", "version:2.1"}),
)
defer client.Close()
```

**Python:**
```python
from datadog import initialize, statsd

initialize(
    statsd_host="127.0.0.1",
    statsd_port=8125,
    statsd_namespace="myapp",
    statsd_constant_tags=["env:prod", "service:api", "version:2.1"],
)
```

**Java:**
```java
StatsDClient client = new NonBlockingStatsDClientBuilder()
    .prefix("myapp")
    .hostname("localhost")
    .port(8125)
    .constantTags("env:prod", "service:api", "version:2.1")
    .build();
```

**Ruby:**
```ruby
statsd = Datadog::Statsd.new(
  'localhost', 8125,
  namespace: 'myapp',
  tags: ['env:prod', 'service:api', 'version:2.1']
)
```

## Buffering

By default, some clients send one UDP packet per metric call. This
creates excessive syscall overhead in hot paths.

### Enable Buffering

Buffering packs multiple metrics into a single UDP packet, separated
by newlines. Most modern DogStatsD clients buffer by default.

**Key settings:**
- **Max packet size:** 1432 bytes (UDP, safe for Ethernet MTU) or
  8192 bytes (UDS)
- **Flush interval:** Automatic flush every ~100-300ms (client-dependent)
- **Manual flush:** Call `flush()` before shutdown or at critical points

**Go** — buffers by default, no configuration needed.

**Python:**
```python
# v0.43.0+: buffering enabled by default
dsd = DogStatsd(host="127.0.0.1", port=8125, disable_buffering=False)

# Pre-v0.43.0: use context manager
with DogStatsd() as dsd:
    dsd.gauge('metric_1', 123)
    dsd.gauge('metric_2', 456)
# Flushes on context exit
```

**Java:**
```java
StatsDClient client = new NonBlockingStatsDClientBuilder()
    .hostname("127.0.0.1")
    .port(8125)
    .maxPacketSizeBytes(1500)  // Buffer up to 1500 bytes per packet
    .build();
```

## Sampling

Sampling reduces UDP traffic at the cost of statistical accuracy.
The client randomly decides whether to send each metric based on the
sample rate.

### How It Works

```
client.increment("requests", rate=0.1)
```

- Client rolls a random number: if < 0.1, send the metric
- The datagram includes `|@0.1` so the server knows to multiply by 10
- ~90% of calls produce zero network traffic

### Sample Rate Corrections by Type

| Type | Server Correction |
|------|------------------|
| Counter | Value multiplied by `1/rate` |
| Gauge | No correction (last value kept as-is) |
| Set | No correction |
| Histogram | Count corrected; other stats are not |
| Distribution | Value counted `1/rate` times |

### When to Sample

| Scenario | Recommendation |
|----------|---------------|
| < 1000 metrics/sec | `rate=1.0` (no sampling) |
| 1000-10000 metrics/sec | `rate=0.5` to `rate=0.1` for counters/timers |
| > 10000 metrics/sec | `rate=0.1` or lower; also enable client-side aggregation |
| Gauges | Always `rate=1.0` |
| Sets | Always `rate=1.0` |

**Do not sample gauges or sets.** The server cannot correct for
sampling on these types — you'll get randomly missing data points.

## High-Throughput Tuning

When sending thousands of metrics per second, the default configuration
may cause packet drops. Symptoms:
- High Agent CPU usage
- `datadog.dogstatsd.client.packets_dropped` increasing
- Missing data points in dashboards

### Mitigation Strategies (in order)

1. **Enable client-side buffering** — packs metrics into fewer packets.

2. **Enable client-side aggregation** — client pre-aggregates counters,
   gauges, and sets before sending. Available in Go v5.0+, Java v3.0+,
   .NET v7.0+.
   ```go
   // Go: enabled by default in v5.0+
   client, _ := statsd.New("127.0.0.1:8125")
   ```
   ```java
   // Java: enabled by default in v3.0+
   StatsDClient client = new NonBlockingStatsDClientBuilder()
       .enableAggregation(true)
       .build();
   ```

3. **Use UDS instead of UDP** — Unix Domain Sockets have lower overhead
   than UDP (no IP/UDP header processing, no kernel buffer limits).

4. **Increase kernel buffer sizes** (Linux, for UDP):
   ```bash
   sysctl -w net.core.rmem_max=26214400
   ```
   Set `dogstatsd_so_rcvbuf: 26214400` in Agent config to match.

5. **Sample high-volume metrics** — reduce rate to 0.5 or 0.1 for
   counters and timers in hot paths.

6. **Enable Agent pipeline autoadjust** — Agent uses multiple cores for
   metric processing:
   ```yaml
   dogstatsd_pipeline_autoadjust: true
   ```

7. **Increase client queue size** — prevents drops when Agent is
   temporarily slow:
   ```java
   .queueSize(8192)  // default: 4096
   ```

## Error Handling

StatsD uses UDP, which is fire-and-forget. The client cannot know if
the Agent received the metric. This is by design — metric emission
should never block or crash the application.

### Client Error Patterns

**Do:**
- Log client initialization failures at startup
- Monitor `datadog.dogstatsd.client.packets_dropped` telemetry
- Set up an error handler for internal client errors (Java, .NET)

**Do not:**
- Wrap every metric call in try/catch
- Retry failed sends (UDP has no concept of retry)
- Block the application if StatsD is unavailable

### Graceful Degradation

If the StatsD agent is down:
- UDP sends silently fail (packets dropped by OS)
- Application continues unaffected
- Metrics are lost for the downtime period
- No recovery of lost data (StatsD is not durable)

This is the tradeoff: zero latency impact in exchange for at-most-once
delivery.

## Kubernetes Deployment

### Finding the Agent Host

Use the downward API to expose the node IP:
```yaml
env:
  - name: DD_AGENT_HOST
    valueFrom:
      fieldRef:
        fieldPath: status.hostIP
```

The application connects to `$DD_AGENT_HOST:8125`.

### UDS in Kubernetes

Mount the DogStatsD socket as a volume:
```yaml
volumes:
  - name: dsdsocket
    hostPath:
      path: /var/run/datadog/
volumeMounts:
  - name: dsdsocket
    mountPath: /var/run/datadog
```

The application connects to `/var/run/datadog/dsd.socket`.

UDS provides better performance and avoids `hostPort` networking
complexities.
