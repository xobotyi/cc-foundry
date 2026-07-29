# backend

Backend platform discipline plugin for Claude Code.

## The Problem

Observability choices are easy to get wrong and expensive to change: metric names that violate Prometheus conventions,
unbounded label cardinality, logs that can't be correlated with traces. Without encoded standards, every project
reinvents logging strategy, metric naming, and instrumentation patterns from scratch.

## The Solution

Provides skills that encode conventions for building observable services. The `observability` skill covers the three
pillars at a high level; technology-specific skills (`prometheus`, `statsd`, `otel-tracing`) cover tooling conventions.
Focuses on platform-level concerns that apply across languages.

## Installation

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install backend
```

## Skills

### observability

The three pillars of observable systems: structured logging, metrics, and distributed tracing. Covers interconnection
between pillars, correlation patterns, and high-level best practices. **Use when:** adding logging, designing metrics,
instrumenting traces, or reviewing observability patterns.

### prometheus

Prometheus instrumentation: metric types, naming conventions, labels, cardinality management, PromQL, alerting rules,
and exporter patterns. **Use when:** instrumenting code with Prometheus metrics or writing PromQL queries.

### statsd

StatsD metric instrumentation: counters, gauges, timers, histograms, sets, naming conventions, DogStatsD extensions, and
aggregation patterns. **Use when:** emitting StatsD metrics or configuring StatsD backends.

### otel-tracing

OpenTelemetry tracing: span creation, context propagation, instrumentation patterns, sampling strategies, and semantic
conventions. **Use when:** adding distributed tracing, configuring OTel SDKs, or reviewing trace instrumentation.

## Related Plugins

- **golang** — Go language discipline
- **javascript** — JavaScript and TypeScript language discipline
- **the-coder** — Language-agnostic coding discipline (discovery, planning, verification)

## License

MIT
