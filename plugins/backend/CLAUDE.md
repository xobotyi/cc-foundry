# backend Plugin

Backend platform discipline: observability, metrics instrumentation, and distributed tracing.

## Skills

| Skill | Purpose |
|-------|---------|
| `observability` | Three pillars (logging, metrics, tracing) — interconnection, purposes, and high-level practices |
| `prometheus` | Prometheus metric types, naming, labels, cardinality, PromQL, alerting, instrumentation |
| `statsd` | StatsD metric types, naming, UDP push model, DogStatsD extensions, aggregation patterns |
| `otel-tracing` | OpenTelemetry tracing — spans, context propagation, instrumentation, sampling, semantic conventions |

## Plugin Scope

This plugin covers backend platform concerns — what's specific to building observable services,
operators, workers, and daemons. The `observability` skill provides high-level guidance across
all three pillars; technology-specific skills (`prometheus`, `statsd`, `otel-tracing`) cover
tooling conventions. Language-specific skills (Go, TypeScript) are provided by their respective
language plugins.
