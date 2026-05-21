# grafana Plugin

Grafana observability platform: dashboards, query languages (PromQL, MetricsQL, LogsQL), alerting, provisioning, and
data visualization discipline.

## Skills

- **`dashboards`** — Grafana dashboard authoring: JSON model (Classic + V2), panel types, standard options, variables,
  transformations, annotations, links, library panels
- **`promql`** — PromQL query writing: selectors, operators, vector matching, functions, subqueries, recording/alerting
  rules, native histograms, optimization
- **`metricsql`** — VictoriaMetrics MetricsQL: PromQL superset extensions, behavioral diffs, rollup functions, WITH
  templates, label manipulation, implicit conversions
- **`logsql`** — VictoriaLogs LogsQL: filters, pipe operators, stats functions, field extraction, stream filtering,
  performance patterns
- **`alerting`** — Grafana unified alerting: rule types, evaluation lifecycle, notification policies, contact points,
  silences, templates, recording rules
- **`provisioning`** — Grafana provisioning: file YAML, HTTP API, gcx CLI, Terraform provider, observability-as-code
  workflows
- **`dataviz`** — Data visualization discipline: encoding hierarchy, chart-type selection, color theory, dashboard
  layout, time-series conventions, observability frameworks (RED/USE/Golden Signals/SLO)

## Plugin Scope

This plugin covers the **observability consumption stack** — how to query, visualize, alert on, and manage telemetry
data through Grafana and its query languages. The companion `backend` plugin covers the **production side** (emitting
metrics, logs, traces via Prometheus, StatsD, OTel).

Split: backend = produce telemetry, grafana = consume telemetry.

## Skill Relationships

```
                    dataviz (design principles)
                        ↓
promql ←→ metricsql    dashboards ←→ alerting
   ↘         ↓            ↓
    → logsql           provisioning
```

- `promql` is the authoritative PromQL reference; `metricsql` covers the superset extensions and cross-references
  `promql` for shared fundamentals
- `dashboards` handles panel configuration; `dataviz` handles why a visualization works
- `alerting` and `provisioning` share Grafana alerting YAML provisioning coverage from different angles
- `backend/prometheus` covers instrumentation; `promql` covers querying the same metrics

## Conventions

- Grafana docs use `latest` channel URLs (tracks current stable, currently 12.4.x)
- V2 dashboard schema references pin to `v12.1` (only channel with full sub-pages)
- VictoriaMetrics docs at docs.victoriametrics.com (single-page with anchors per topic)
- gcx is the current Grafana CLI tool; grafanactl is superseded (repo archives 2026-06-01)
- Grizzly is deprecated — mention only as historical context
