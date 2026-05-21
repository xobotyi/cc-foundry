# grafana

Grafana observability platform plugin for Claude Code.

## The Problem

Grafana dashboards, queries, and alerting involve multiple interconnected systems — dashboard JSON schemas, query
languages (PromQL, MetricsQL, LogsQL), unified alerting with its routing tree, and several provisioning methods
(file-based, HTTP API, Terraform, gcx CLI). Without standardized practices, agents produce dashboards with wrong panel
types, write inefficient queries, misconfigure alert routing, and choose the wrong provisioning tool for the job.

## The Solution

Seven skills covering the full Grafana observability consumption stack: from query writing through visualization to
alerting and provisioning-as-code. Each skill is grounded in official documentation (Grafana, Prometheus,
VictoriaMetrics) with research-verified reference material. A dedicated data visualization discipline ensures agents
make perceptually sound design choices, not just technically valid ones.

## Installation

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install grafana
```

## Skills

### dashboards

Grafana dashboard authoring: JSON model (Classic and V2 schemas), panel types and selection, standard options,
thresholds, value mappings, field overrides, transformations, variables, annotations, links, and library panels. **Use
when:** creating, editing, reviewing, or debugging Grafana dashboards.

### promql

PromQL query writing: selectors, operators, vector matching, functions, subqueries, recording and alerting rules, native
histograms, and query optimization. **Use when:** writing or debugging Prometheus queries for dashboards, alerts, or
recording rules.

### metricsql

VictoriaMetrics MetricsQL: PromQL superset extensions, behavioral differences (rate semantics, implicit conversions,
auto-aligned subqueries), rollup functions, WITH templates, and label manipulation. **Use when:** writing queries
against VictoriaMetrics or migrating from Prometheus PromQL.

### logsql

VictoriaLogs LogsQL: filters (word, phrase, regexp, range), pipe operators (stats, extract, unpack, format), field
extraction, and stream filtering. **Use when:** querying logs in VictoriaLogs.

### alerting

Grafana unified alerting: rule types (Grafana-managed and data-source-managed), evaluation lifecycle, notification
policies and routing, contact points, silences, mute timings, and notification templates. **Use when:** creating alert
rules, configuring notification routing, or debugging alert state.

### provisioning

Grafana provisioning across all delivery methods: file-based YAML, HTTP API, gcx CLI (replacing grafanactl), Terraform
provider, and observability-as-code workflows. **Use when:** managing Grafana resources as code, choosing between
provisioning tools, or automating Grafana setup.

### dataviz

Data visualization discipline for observability dashboards: encoding hierarchy, chart-type selection by data shape,
color theory (semantic conventions, colorblind safety), dashboard layout (information hierarchy, tiering), time-series
conventions, and observability framework dashboards (RED, USE, Golden Signals, SLO). **Use when:** designing dashboards,
choosing visualizations, reviewing dashboard quality, or applying observability frameworks.

## Related Plugins

- **backend** — Backend platform discipline (instrumentation side: Prometheus, StatsD, OTel)
- **the-coder** — Language-agnostic coding discipline
- **infrastructure** — Infrastructure management (Ansible, Docker, Proxmox)

## License

MIT
