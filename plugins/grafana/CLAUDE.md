# grafana Plugin

Grafana observability platform: dashboards, query languages (PromQL, MetricsQL, LogsQL), alerting, provisioning, and
data visualization discipline.

## Skills

- **`dashboards`** — dashboard JSON model (Classic + V2), panel configuration, variables, transformations, and jq-based
  editing of dashboard files
- **`promql`** — PromQL query writing: selectors, operators, vector matching, functions, recording and alerting rules
- **`metricsql`** — VictoriaMetrics MetricsQL: the PromQL superset extensions and behavioral diffs
- **`logsql`** — VictoriaLogs LogsQL: filters, pipe operators, stats functions, stream selection
- **`alerting`** — Grafana unified alerting: rule types, evaluation lifecycle, routing, contact points, templates
- **`provisioning`** — Grafana provisioning: file YAML, HTTP API, gcx CLI, Terraform, observability-as-code
- **`dataviz`** — visualization design: encoding hierarchy, chart-type selection, color, layout, RED/USE/Golden
  Signals/SLO

## Skill Dependencies

- `metricsql` documents only what PromQL does not — shared fundamentals stay in `promql`
- `dashboards` owns panel mechanics; `dataviz` owns why a visualization works
- `alerting` owns alert semantics; `provisioning` owns how alerting resources are delivered

## Plugin Scope

This plugin owns telemetry consumption — querying, visualizing, alerting on, and provisioning Grafana. The `backend`
plugin owns the production side: backend produces telemetry, grafana consumes it. `backend/prometheus` covers
instrumenting code; `grafana/promql` is the authoritative PromQL reference and owns querying.

## Conventions

- Grafana doc sources use `latest` channel URLs — tracks the stable line without per-version edits
- V2 dashboard schema sources pin to `v12.1`, the only channel carrying the full sub-page set
- VictoriaMetrics sources are single pages on docs.victoriametrics.com with a per-topic anchor
