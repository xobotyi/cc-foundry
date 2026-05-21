---
name: provisioning
description: >-
  Grafana provisioning across all delivery methods: file provisioning YAML (datasources, dashboards, alerting),
  Kubernetes-style HTTP API, gcx CLI (replacing grafanactl), Terraform provider, Foundation SDK, Git Sync. Invoke
  whenever task involves any interaction with Grafana provisioning or observability-as-code — configuring
  datasources, managing dashboards or alerting resources as code, automating Grafana setup, choosing between IaC
  tools, migrating between approaches, or using the Grafana HTTP API.
---

# Grafana Provisioning

Make Grafana resources reproducible. Pick the right tool for each resource type and team workflow, then keep the runtime
configuration in sync with version control. Wrong tool choices don't cause errors immediately — they show up months
later as drift, brittle CI, or notification policies overwritten by a partial config push.

## References

- **File provisioning** — [`${CLAUDE_SKILL_DIR}/references/file-provisioning.md`] Directory layout, env var
  interpolation, full datasource / dashboard / plugin / alerting YAML schemas, reload behavior, UI edit semantics
- **HTTP API** — [`${CLAUDE_SKILL_DIR}/references/http-api.md`] New `/apis/` Kubernetes-style surface vs. legacy
  `/api/`, dashboard / folder / datasource CRUD, alerting provisioning endpoints, annotation API, pagination,
  authentication
- **Terraform** — [`${CLAUDE_SKILL_DIR}/references/terraform.md`] Provider setup, full resource catalog, dashboards /
  datasources / alerting examples, provenance and UI-edit toggle, GitHub Actions workflow, import workflow
- **gcx** — [`${CLAUDE_SKILL_DIR}/references/gcx.md`] Grafana CLI install, contexts, resource pull/push/serve, telemetry
  queries, agentic features and skills, CI integration, migration from `grafanactl`
- **Observability as code** — [`${CLAUDE_SKILL_DIR}/references/observability-as-code.md`] Tool comparison, decision
  matrix, how to compose tools, migration paths (Grizzly → gcx, legacy API → new API, file → Terraform)

## Tool selection

Pick the primary tool based on resource type and team workflow. The references above contain a full decision matrix —
quick selection rules:

- **Self-managed Grafana, simple setup** → file provisioning
- **Dev → staging → prod resource migration** → `gcx` (Grafana ≥ v12)
- **Dashboards generated programmatically** → Foundation SDK + `gcx`
- **Agentic coding tools driving Grafana from the terminal** → `gcx`
- **Git as source of truth, edits via Grafana UI** → Git Sync
- **Already running Terraform** → Grafana Terraform provider
- **Kubernetes-native GitOps shop** → Grafana Operator or Crossplane
- **One-off scripts and custom integrations** → HTTP API directly
- **Grafana Cloud only with existing Ansible** → Grafana Ansible Collection
- **Existing grafanactl deployment, Grafana < v12** → continue with `grafanactl` until upgrading; the binary keeps
  working through the 2026-06-01 archive date

Compose tools where natural: Foundation SDK generates, `gcx` pushes; Terraform owns alerting + data sources, file
provisioning ships fixed dashboards.

### Tool status notes

- **`gcx`** is the current Grafana CLI. Requires Grafana ≥ v12. Public preview as of 2026. Inherits `grafanactl`'s
  design and adds telemetry queries, agentic-driver auto-detection, and broader Grafana Cloud product coverage.
- **`grafanactl`** is superseded by `gcx`. GitHub repo archives 2026-06-01. Migration is a binary rename plus one
  command rename (`grafanactl resources serve` → `gcx dev serve`). Don't adopt for new work unless on Grafana < v12.
- **Grizzly** is deprecated; mentioned only because some existing deployments still use it. Successor was `grafanactl`,
  now `gcx`. Don't adopt for new work.
- **Grafonnet** is deprecated for new work; use the Foundation SDK.
- **API keys** are deprecated; use service account tokens.
- **`/api/dashboards/db`** is legacy; use `/apis/dashboard.grafana.app/v1/...` where the new API supports the case
  (especially dashboards v2 / dynamic dashboards).

## File provisioning

YAML files in `provisioning/` directories read by Grafana at startup. Not available in Grafana Cloud.

### Directory layout

```
provisioning/
├── datasources/        # *.yaml — data source configs
├── dashboards/         # *.yaml — dashboard provider configs (NOT dashboards themselves)
├── plugins/            # *.yaml — plugin app configs
└── alerting/           # *.yaml or *.json — alert resources
```

Dashboard JSON files live elsewhere (e.g., `/var/lib/grafana/dashboards/`) and the dashboard provider YAML points to
them.

### Environment variables

All provisioning YAML supports `$VAR` and `${VAR}` for values (not keys, not dashboard JSON). Order: `${VAR}` first,
then `$VAR`. Escape literal `$` as `$$`. Prefer `$VAR` when the substituted value contains `$`.

### Datasource shape

```yaml
apiVersion: 1
prune: true   # auto-delete provisioned datasources removed from this file

datasources:
  - name: Prometheus              # required, unique per org
    type: prometheus              # required
    access: proxy                 # proxy = Server, direct = Browser
    uid: prom_main
    url: http://prometheus:9090
    isDefault: true
    jsonData:
      prometheusType: Mimir
      manageAlerts: true
    secureJsonData:
      httpHeaderValue1: ${TENANT_TOKEN}
    editable: false
```

Secrets go in `secureJsonData` (encrypted at rest). For multi-instance Grafana with shared DB, set `version` and bump it
on each change.

### Dashboard shape

Provider YAML configures discovery; dashboard JSON files contain the dashboards:

```yaml
apiVersion: 1
providers:
  - name: 'team-platform'
    folder: ''                         # '' = root
    type: file
    disableDeletion: false
    updateIntervalSeconds: 30          # poll if > 10, watch filesystem if ≤ 10
    allowUiUpdates: false              # let UI edits persist until next reprovision
    options:
      path: /var/lib/grafana/dashboards
      foldersFromFilesStructure: true
```

`foldersFromFilesStructure: true` maps subdirectory names to Grafana folders. Nested folders not supported.

Dashboard JSON must use the Kubernetes-style format for dashboards v2 / dynamic dashboards
(`apiVersion: dashboard.grafana.app/v1`).

### Alerting shape

`provisioning/alerting/*.yaml` can contain any combination of:

- `groups` — alert rule groups (with `name`, `folder`, `interval`, `rules[]`)
- `contactPoints` — contact points with `receivers[]`
- `policies` — the notification policy tree (entire tree is one resource — replaces existing)
- `templates` — notification template groups
- `muteTimes` — mute time intervals

Plus `deleteRules`, `deleteContactPoints`, `deleteTemplates`, `deleteMuteTimes`, `resetPolicies`.

Variable interpolation does **not** apply in: alert rule annotations, `relativeTimeRange`, query `data.model`, mute
timing names/intervals, template names/bodies. Escape `$variable` as `$$variable` where not wanted.

### Reload behavior

Provisioning runs at startup. Reload at runtime via the Admin API (`POST /api/admin/provisioning/{type}/reload`) —
requires admin permissions. Dashboard files have their own poll/watch loop independent of provisioning reload.

## HTTP API

Two surfaces:

- **New `/apis/<group>.grafana.app/<version>/...`** — Kubernetes-style resources. Covers dashboards, folders, library
  panels, playlists; expanding over time. Built on these are `gcx`, Foundation SDK, Git Sync.
- **Legacy `/api/...`** — data sources, annotations, admin, alerting provisioning. Won't get new functionality but
  remains functional.

### Authentication

Service account tokens (recommended) via `Authorization: Bearer <token>`. API keys still work but are deprecated.

### Dashboard CRUD pattern

```
POST   /apis/dashboard.grafana.app/v1/namespaces/<ns>/dashboards
PUT    /apis/dashboard.grafana.app/v1/namespaces/<ns>/dashboards/<uid>
GET    /apis/dashboard.grafana.app/v1/namespaces/<ns>/dashboards/<uid>
GET    /apis/dashboard.grafana.app/v1/namespaces/<ns>/dashboards?limit=100
DELETE /apis/dashboard.grafana.app/v1/namespaces/<ns>/dashboards/<uid>
```

Namespace is `default` for single-org Grafana, `stack-<id>` for Grafana Cloud. Use pagination's `metadata.continue`
token for list endpoints.

### Alerting provisioning API

`/api/v1/provisioning/{alert-rules,contact-points,policies,templates,mute-timings}` — JSON CRUD.

Standard endpoints return JSON **not compatible with file provisioning**. For round-tripping via configuration files,
use `/export` endpoints which return YAML / JSON / Terraform format.

Resources created via the API can't be edited in the UI by default. Send `X-Disable-Provenance: true` to allow UI edits.

### Data sources

Legacy `/api/datasources` is the only data source surface. List defaults to 5000 max (no pagination). Always put secrets
in `secureJsonData`.

## Terraform

The Grafana Terraform provider has the broadest resource coverage of any IaC tool.

### Setup

```hcl
terraform {
  required_providers {
    grafana = {
      source  = "grafana/grafana"
      version = ">= 2.9.0"
    }
  }
}

provider "grafana" {
  url  = "https://grafana.example.com"
  auth = var.grafana_service_account_token
}
```

Authenticate with a service account token (`Editor` role minimum, plus `fixed:alerting.provisioning.*` for alerting
resources).

### Core resource map

- Folder / Dashboard / Library panel — `grafana_folder`, `grafana_dashboard`, `grafana_apps_dashboard_dashboard_v1|v2`,
  `grafana_library_panel`
- Data source — `grafana_data_source` (use `json_data_encoded` / `secure_json_data_encoded`)
- Alerting — `grafana_rule_group`, `grafana_contact_point`, `grafana_message_template`, `grafana_notification_policy`,
  `grafana_mute_timing`
- Users / teams / RBAC — `grafana_user`, `grafana_team`, `grafana_service_account`, `grafana_role`,
  `grafana_role_assignment`
- Cloud — `grafana_cloud_stack` and supporting Cloud resources

### Bulk dashboards via `for_each`

```hcl
resource "grafana_dashboard" "platform_dashboards" {
  for_each    = fileset("${path.module}/dashboards/platform", "*.json")
  folder      = grafana_folder.platform.id
  config_json = file("${path.module}/dashboards/platform/${each.key}")
}
```

### Provenance

Terraform-managed resources are read-only in the UI by default. Set `disable_provenance = true` on a resource to allow
UI edits. The next `terraform apply` overwrites UI changes — use sparingly.

### State and CI

Never commit `terraform.tfstate` to Git. Use a remote backend (S3+DynamoDB, Terraform Cloud, GCS, Azure Blob). Typical
CI: `terraform fmt -check`, `plan` on PRs (post plan as a comment), `apply -auto-approve` on `main`.

## gcx

CLI for the new Kubernetes-style APIs plus telemetry queries. Resource pull/push/serve/edit between environments,
PromQL/LogQL/trace queries, agentic-tool integration. Requires Grafana ≥ v12.

### Configuration via contexts

```bash
gcx config set contexts.production.grafana.server https://prod.grafana.example
gcx config set contexts.production.grafana.org-id 1
gcx config set contexts.production.grafana.token <token>
gcx config use-context production
gcx config check
```

Self-managed uses `org-id`; Grafana Cloud uses `stack-id`. Pick one.

### Migrate resources between environments

```bash
gcx config use-context development
gcx resources pull --path ./resources/ -o yaml

gcx config use-context production
gcx resources push -p ./resources/
```

### Ad-hoc audits via jq

```bash
gcx resources get dashboards -o json | jq '.items | map({
  uid: .metadata.name,
  datasources: .spec.panels | map(.datasource.uid)
})'

gcx resources delete dashboards/test-from-stg,test-from-dev
```

### Foundation SDK pipeline

```bash
gcx dev serve --script 'go run scripts/generate-dashboard.go' --watch ./scripts
go run scripts/generate-dashboard.go --generate-resource-manifests --output ./resources
gcx resources push -p ./resources/
```

### Agentic features

`gcx` is designed for AI coding agents. Auto-detects drivers like Claude Code and Cursor, emits structured JSON/YAML
output with stable field names, exposes a machine-readable command catalog, and bundles portable skills
(`gcx skills install --all`) for alert investigation, SLO management, and observability setup.

## Application

When **deciding** how to provision a new resource:

- Match the tool to volatility (Git Sync / `gcx` for volatile dashboards, Terraform / file for stable infra)
- One source of truth per resource type — don't have Terraform and file provisioning both manage the same alert rule
- Prefer `gcx` over `grafanactl` for new work (Grafana ≥ v12); `grafanactl` repo archives 2026-06-01
- Use service account tokens with minimum-required role

When **writing** provisioning files:

- Put secrets in `secureJsonData` (file) or `secure_json_data_encoded` (Terraform) — never in `jsonData`
- Always set a stable `uid` / `metadata.name` on dashboards for stable URLs
- The notification policy tree is a single resource — never push a partial tree
- Variable interpolation doesn't apply to alert rule annotations, query models, template content
- Set `editable: false` (datasources) or accept the default (alerting) for true source-of-truth behavior; enable UI
  edits explicitly when needed

When **migrating** between approaches:

- Use `/export` endpoints or the UI Export feature to dump current state in the target tool's format
- `terraform import` attaches existing resources without disruption
- Verify with `terraform plan` (or `gcx` dry-run if available) — should be a no-op after a successful import

When **reviewing** provisioning configuration:

- Cite the specific issue and the fix inline
- Check for secrets in plaintext fields (`url` with embedded creds, `jsonData` containing passwords)
- Check for partial policy-tree provisioning that would overwrite the broader tree
- Check `updateIntervalSeconds` is appropriate for the filesystem (raise above 10 if inotify events don't propagate)
- Check resource UIDs / names are stable across environments

## Integration

The **alerting** skill (sibling) governs _what_ alerting resources should contain and _how_ they behave at runtime
(state lifecycle, routing, templates). This skill governs _how to deliver_ those resources to Grafana.

The **dashboards** skill (sibling) governs panel composition and dashboard design. This skill governs how dashboards are
written to disk, pushed to Grafana, and version-controlled.

The **prometheus**, **logsql/metricsql** language skills cover query expressions inside provisioned resources. This
skill does not.
