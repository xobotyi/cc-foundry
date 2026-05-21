# Terraform

The Grafana Terraform provider (`grafana/grafana`) manages dashboards, folders, data sources, alerting resources,
service accounts, RBAC, SLOs, synthetic monitoring, OnCall, and more — across Grafana OSS, Enterprise, and Cloud.

## Contents

- [When to choose Terraform](#when-to-choose-terraform)
- [Provider setup](#provider-setup)
- [Authentication](#authentication)
- [Core resources](#core-resources)
- [Folders and dashboards](#folders-and-dashboards)
- [Data sources](#data-sources)
- [Alerting resources](#alerting-resources)
- [Provenance — allow UI edits](#provenance--allow-ui-edits)
- [GitHub Actions workflow](#github-actions-workflow)
- [Importing existing resources](#importing-existing-resources)
- [Common pitfalls](#common-pitfalls)

---

## When to choose Terraform

- Already running Terraform for other infrastructure
- Need the broadest coverage of Grafana resources (most of any IaC tool)
- Want stateful drift detection
- Need to manage Grafana Cloud stack lifecycle alongside in-stack resources

For dashboards only or a Git-native, Kubernetes-style workflow, prefer `grafanactl`/`gcx` or file provisioning. For
Kubernetes-only shops, prefer the Grafana Operator or Crossplane provider.

## Provider setup

`main.tf`:

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

For multiple Grafana instances / Grafana Cloud, configure provider aliases:

```hcl
provider "grafana" {
  alias = "cloud"
  url   = "https://my-stack.grafana.net/"
  auth  = var.cloud_token
}

resource "grafana_folder" "example" {
  provider = grafana.cloud
  title    = "Example"
}
```

## Authentication

- **Service account token** (recommended) — create in Grafana under Administration → Service accounts. Assign the
  minimum role: typically `Editor` for dashboard/data source work; for alerting, include `fixed:alerting.provisioning.*`
  (or RBAC equivalents).
- **Basic auth** — `auth = "<user>:<pass>"` (development only)
- **Cloud API key** — for managing Cloud stacks (separate `cloud_api_key` configuration)

Store the token via Terraform variables backed by a secrets manager (Vault, AWS SM, GitHub Actions secrets). Never
commit tokens.

## Core resources

| Grafana concept       | Terraform resource                    |
| --------------------- | ------------------------------------- |
| Folder                | `grafana_folder`                      |
| Dashboard (classic)   | `grafana_dashboard`                   |
| Dashboard (K8s v1)    | `grafana_apps_dashboard_dashboard_v1` |
| Dashboard (K8s v2)    | `grafana_apps_dashboard_dashboard_v2` |
| Data source           | `grafana_data_source`                 |
| Library panel         | `grafana_library_panel`               |
| Alert rule group      | `grafana_rule_group`                  |
| Contact point         | `grafana_contact_point`               |
| Notification policy   | `grafana_notification_policy`         |
| Mute timing           | `grafana_mute_timing`                 |
| Notification template | `grafana_message_template`            |
| Service account       | `grafana_service_account`             |
| Service account token | `grafana_service_account_token`       |
| Team                  | `grafana_team`                        |
| User                  | `grafana_user`                        |
| RBAC role             | `grafana_role`                        |
| RBAC role assignment  | `grafana_role_assignment`             |
| Cloud stack           | `grafana_cloud_stack`                 |

Full catalog: https://registry.terraform.io/providers/grafana/grafana/latest/docs

## Folders and dashboards

```hcl
resource "grafana_folder" "platform" {
  title = "Platform"
}

resource "grafana_dashboard" "api_overview" {
  folder      = grafana_folder.platform.id
  config_json = file("${path.module}/dashboards/api-overview.json")
}
```

### Bulk dashboards via `for_each`

```hcl
resource "grafana_dashboard" "platform_dashboards" {
  for_each    = fileset("${path.module}/dashboards/platform", "*.json")
  folder      = grafana_folder.platform.id
  config_json = file("${path.module}/dashboards/platform/${each.key}")
}
```

### Kubernetes-style dashboards (Grafana ≥ 13)

Use `grafana_apps_dashboard_dashboard_v1` or `_v2`. The body matches the `spec` of the new dashboard API:

```hcl
resource "grafana_apps_dashboard_dashboard_v1" "demo" {
  metadata {
    name = "demo-dashboard"
    annotations = {
      "grafana.app/folder" = grafana_folder.platform.id
    }
  }
  spec = jsonencode({
    title        = "Demo"
    schemaVersion = 41
    panels       = []
  })
}
```

## Data sources

```hcl
resource "grafana_data_source" "prometheus" {
  type = "prometheus"
  name = "Prometheus"
  url  = "http://prometheus.observability.svc.cluster.local:9090"

  json_data_encoded = jsonencode({
    httpMethod      = "POST"
    prometheusType  = "Mimir"
    manageAlerts    = true
  })

  secure_json_data_encoded = jsonencode({
    httpHeaderValue1 = var.prometheus_token
  })
}
```

- `json_data_encoded` and `secure_json_data_encoded` accept JSON strings — encode maps with `jsonencode`
- `secure_json_data_encoded` is write-only; Terraform can't read it back, so `terraform plan` always shows a change
  unless wrapped in `lifecycle.ignore_changes`

## Alerting resources

### Alert rule group

```hcl
resource "grafana_rule_group" "platform_errors" {
  name             = "platform_errors"
  folder_uid       = grafana_folder.platform.uid
  interval_seconds = 60
  org_id           = 1

  rule {
    name      = "HighErrorRate"
    condition = "C"
    for       = "5m"

    data {
      ref_id         = "A"
      datasource_uid = grafana_data_source.prometheus.uid
      relative_time_range {
        from = 300
        to   = 0
      }
      model = jsonencode({
        expr          = "sum(rate(http_requests_total{status=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m]))"
        intervalMs    = 1000
        maxDataPoints = 43200
        refId         = "A"
      })
    }

    data {
      ref_id         = "C"
      datasource_uid = "__expr__"
      relative_time_range {
        from = 0
        to   = 0
      }
      model = jsonencode({
        expression = "$A > 0.05"
        type       = "math"
        refId      = "C"
      })
    }

    labels = {
      severity = "warning"
      team     = "platform"
    }
    annotations = {
      summary     = "Error rate above 5%"
      runbook_url = "https://runbooks.example.com/high-error-rate"
    }
  }
}
```

### Contact point

```hcl
resource "grafana_contact_point" "platform_oncall" {
  name = "platform-oncall"

  pagerduty {
    integration_key = var.pagerduty_key
  }

  email {
    addresses = ["platform-team@example.com"]
    message   = "{{ template \"custom_email.message\" . }}"
  }
}
```

Each integration type is a separate block — `email`, `slack`, `pagerduty`, `opsgenie`, `webhook`, `teams`, etc. A single
`grafana_contact_point` can have multiple integration blocks (one contact point, multiple receivers).

### Notification template group

```hcl
resource "grafana_message_template" "platform_templates" {
  name = "platform"

  template = <<-EOT
    {{ define "custom_email.message" }}
    Alert: {{ .Status }}
    {{ range .Alerts }}
      - {{ .Labels.alertname }}: {{ .Annotations.summary }}
    {{ end }}
    {{ end }}
  EOT
}
```

### Notification policy tree

One resource. Provisioning it overwrites the existing tree.

```hcl
resource "grafana_notification_policy" "main" {
  contact_point = grafana_contact_point.platform_oncall.name
  group_by      = ["alertname", "team"]
  group_wait    = "30s"
  group_interval = "5m"
  repeat_interval = "4h"

  policy {
    contact_point = grafana_contact_point.platform_oncall.name
    matcher {
      label = "team"
      match = "="
      value = "platform"
    }
    mute_timings = [grafana_mute_timing.weekends.name]

    policy {
      matcher {
        label = "severity"
        match = "="
        value = "critical"
      }
      contact_point = grafana_contact_point.platform_oncall.name
      group_wait    = "10s"
    }
  }
}
```

### Mute timing

```hcl
resource "grafana_mute_timing" "weekends" {
  name = "weekends"

  intervals {
    weekdays = ["saturday", "sunday"]
  }
}
```

## Provenance — allow UI edits

Terraform-managed alerting resources are read-only in the UI by default. To allow UI edits, set
`disable_provenance = true`:

```hcl
resource "grafana_contact_point" "edit_in_ui" {
  name               = "edit-in-ui"
  disable_provenance = true

  email {
    addresses = ["team@example.com"]
  }
}
```

UI edits persist until the next `terraform apply`, which overwrites them. Use sparingly; if frequent UI edits are
needed, the resource arguably shouldn't be in Terraform.

## GitHub Actions workflow

Sample CI workflow that plans on PRs and applies on `main`:

````yaml
name: terraform
on:
  push:
    branches: [main]
  pull_request:

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: hashicorp/setup-terraform@v3
      - run: terraform init
      - run: terraform fmt -check
      - id: plan
        run: terraform plan -input=false -no-color
        continue-on-error: true
      - name: post plan
        if: github.event_name == 'pull_request'
        uses: mshick/add-pr-comment@v1
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
          message: |
            ```
            ${{ steps.plan.outputs.stdout }}
            ```
      - if: github.ref == 'refs/heads/main'
        run: terraform apply -auto-approve
        env:
          TF_VAR_grafana_service_account_token: ${{ secrets.GRAFANA_TOKEN }}
````

State backend: never commit `terraform.tfstate` to Git. Use a remote backend — S3 + DynamoDB lock, Terraform Cloud, GCS,
Azure Blob.

## Importing existing resources

1. Run the manual change in Grafana UI
2. Export the resource as Terraform HCL: in the Grafana UI export dialog, pick "Terraform" format
3. Paste into a `.tf` file
4. `terraform import grafana_xxx.name <id>` attaches the existing resource to Terraform state
5. `terraform plan` should show no changes — if it does, reconcile the HCL with the actual state
6. `terraform apply` (a no-op) confirms the import

The Grafana alerting UI has a "Modify export" feature for tweaking a rule and exporting the modified version without
saving to Grafana — useful for designing the Terraform resource before deploying.

## Common pitfalls

- Missing `provider = grafana.cloud` on resources when using aliases — resource targets the default provider
- Service account token in the `auth` argument literal — gets committed accidentally
- Partial notification policy tree provisioning — overwrites the entire tree
- Editing a Terraform-managed resource in the UI without `disable_provenance` — UI changes are blocked
- Secrets in `json_data_encoded` instead of `secure_json_data_encoded`
- `secure_json_data_encoded` always shows as changed in `terraform plan` — add
  `lifecycle { ignore_changes = [secure_json_data_encoded] }` when the source of truth is the variable
- Bumping the provider version without checking the changelog — Grafana 12 introduced `grafana_apps_*` resources
  superseding `grafana_dashboard` for v2 dashboards
- `for_each` over dashboards without stable file names — renaming rebuilds the resource (different address), causing
  deletion + recreation
- Hand-writing `model` JSON for alert rule queries — easy to break; export from the UI and paste into
  `model = jsonencode({...})`
- Missing `fixed:alerting.provisioning.*` on the service account — alerting resources fail with 403
