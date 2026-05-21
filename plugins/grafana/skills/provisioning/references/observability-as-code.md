# Observability as Code

A comparative overview of Grafana provisioning approaches: file provisioning, HTTP API, `grafanactl`/`gcx`, Terraform,
Foundation SDK, Git Sync, Grafana Operator, Crossplane, Ansible. Use this reference to pick the right tool for the job.

## Contents

- [The landscape](#the-landscape)
- [Decision matrix](#decision-matrix)
- [File provisioning](#file-provisioning)
- [HTTP API](#http-api)
- [grafanactl / gcx](#grafanactl--gcx)
- [Terraform](#terraform)
- [Foundation SDK](#foundation-sdk)
- [Git Sync](#git-sync)
- [Grafana Operator](#grafana-operator)
- [Crossplane provider](#crossplane-provider)
- [Ansible](#ansible)
- [Deprecated / legacy tools](#deprecated--legacy-tools)
- [How tools compose](#how-tools-compose)
- [Migration paths](#migration-paths)

---

## The landscape

Grafana 12 introduced versioned Kubernetes-style APIs (`/apis/`) and consolidated the as-code story around three
official pillars:

- **Grafana CLI (`gcx`, replacing `grafanactl`)** — command-line tool for the new APIs
- **Foundation SDK** — programmatic dashboard authoring in Go, TypeScript, Python, Java, PHP
- **Git Sync** — sync dashboards directly from a GitHub repo into Grafana, with branching and PRs in the UI

These compose with established IaC tools (Terraform, Ansible, Grafana Operator, Crossplane) — the path of choice with an
existing IaC pipeline.

## Decision matrix

| Scenario                                                                 | Recommended primary tool       |
| ------------------------------------------------------------------------ | ------------------------------ |
| Self-managed Grafana, want simplest possible setup                       | File provisioning              |
| Migrate dashboards between dev/staging/prod                              | `gcx` / `grafanactl`           |
| Generate dashboards from code with full programming-language power       | Foundation SDK + `gcx`         |
| Treat the Git repo as source of truth for dashboards, edit in Grafana UI | Git Sync                       |
| Manage Grafana alongside other infrastructure already in Terraform       | Terraform                      |
| Kubernetes-native shop, GitOps with Argo/Flux                            | Grafana Operator or Crossplane |
| One-off scripts or custom CI integrations                                | HTTP API                       |
| Existing Ansible playbooks for Grafana Cloud stack management            | Ansible                        |
| Multi-tenant Mimir/Loki rules co-located with the data source            | `mimirtool` / `lokitool`       |

## File provisioning

YAML files in `provisioning/` directories that Grafana reads at startup.

- **Strengths:** zero new tooling; works with any CI/CD that can place files; simple mental model
- **Weaknesses:** not available in Grafana Cloud; resources can't be edited in the UI; full restart or admin API reload
  required to apply changes; the entire notification policy tree is one resource
- **Best for:** self-managed Grafana running on VMs, containers, or Kubernetes with ConfigMaps; small to medium
  deployments

Detail: see [`file-provisioning.md`](file-provisioning.md).

## HTTP API

Direct REST calls to `/api/` (legacy) and `/apis/` (Kubernetes-style) surfaces.

- **Strengths:** universal; works against Cloud and self-managed; immediate apply; full control
- **Weaknesses:** no built-in state management; you reinvent CI patterns; secrets in plaintext during requests
- **Best for:** custom integrations, one-off scripts, building tooling on top, niche endpoints not exposed by other
  tools

Detail: see [`http-api.md`](http-api.md).

## grafanactl / gcx

CLI for the new Kubernetes-style APIs. Push/pull/serve/edit operations.

- **Strengths:** Git-native workflow without Terraform state; multi-context; preview locally before pushing; integrates
  with Foundation SDK; works against Cloud
- **Weaknesses:** `grafanactl` is being deprecated (repo archives 2026-06-01) — migrate to `gcx`; `resources` only
  covers Kubernetes-style resources today (data sources, alerts still need API/Terraform); `serve` only handles
  dashboards
- **Best for:** dashboards-as-code with version control, dev → prod promotion, ad-hoc resource audits via `jq`

Detail: see [`grafanactl.md`](grafanactl.md).

## Terraform

Grafana Terraform provider (`grafana/grafana`) with the broadest resource coverage.

- **Strengths:** broadest resource catalog (dashboards, folders, data sources, alerting, RBAC, service accounts, SLOs,
  synthetics, Cloud stack); stateful drift detection; mature ecosystem
- **Weaknesses:** Terraform state lifecycle adds operational overhead; HCL is verbose for dashboards; long JSON blobs in
  HCL files are painful to review
- **Best for:** organizations already running Terraform; managing Grafana Cloud stacks; broad coverage requirements

Detail: see [`terraform.md`](terraform.md).

## Foundation SDK

Programmatic dashboard authoring in Go, TypeScript, Python, Java, or PHP.

- **Strengths:** type-checked dashboard construction; reusable components; loops and conditionals; works with any
  language's testing tools
- **Weaknesses:** learning curve; adds a build step; generates resources but doesn't push them (pair with `gcx`)
- **Best for:** large dashboard catalogs with shared structure; programmatically generating per-tenant or per-service
  dashboards

Pipeline: write code → run generator → `gcx resources push`. See the `dashboards-as-code-workshop` repo for an example.

## Git Sync

GitHub-native two-way sync of dashboards.

- **Strengths:** branching and PRs in the Grafana UI; version history in Git; non-developers can edit dashboards without
  learning Git mechanics
- **Weaknesses:** GitHub only; dashboards only; newer / less battle-tested than alternatives
- **Best for:** teams that want Git source-of-truth without forcing everyone to use a CLI

## Grafana Operator

Kubernetes Operator that reconciles Custom Resources against a Grafana instance.

- **Strengths:** Kubernetes-native; declarative; GitOps via Argo/Flux; pairs with the rest of a Kubernetes observability
  stack
- **Weaknesses:** scope mostly limited to dashboards, folders, data sources; alerting and plugins less covered; requires
  running the operator
- **Best for:** Kubernetes shops; GitOps workflows; teams where observability resources live alongside application
  manifests

## Crossplane provider

Crossplane provider built on the Grafana Terraform provider; manages Grafana resources as Kubernetes manifests.

- **Strengths:** supports all resources the Terraform provider supports; integrates with Crossplane-based GitOps
- **Weaknesses:** alpha stability; requires Crossplane in the cluster; double layer of abstraction
- **Best for:** existing Crossplane users who already manage other infrastructure as Kubernetes manifests

## Ansible

Grafana Ansible Collection — playbook-driven Grafana Cloud management.

- **Strengths:** fits existing Ansible operations; declarative
- **Weaknesses:** Grafana Cloud only; limited resource set (cloud stack, plugins, API keys, dashboards, folders, data
  sources, alert contact points, notification policies)
- **Best for:** organizations already running Ansible for non-Grafana use cases

## Deprecated / legacy tools

- **Grizzly** — deprecated. Successor is `grafanactl` (itself being superseded by `gcx`).
- **Grafonnet** — deprecated Jsonnet library for dashboard generation. Successor is the Foundation SDK.
- **`/api/dashboards/db`** — legacy dashboard endpoint. Use `/apis/dashboard.grafana.app/` where possible.
- **API keys** — legacy authentication. Use service account tokens.

Don't adopt Grizzly or Grafonnet for new work. For Grizzly setups, plan migration to `gcx`.

## How tools compose

Approaches aren't mutually exclusive. Common compositions:

- **Foundation SDK + gcx** — generate dashboards programmatically, push via CLI
- **Terraform + file provisioning** — Terraform manages data sources and alerting; file provisioning ships fixed
  dashboards (one tool per layer of stability)
- **Git Sync + Terraform** — Git Sync owns iterating dashboards in the UI; Terraform owns the alerting and data source
  plane
- **gcx + HTTP API** — gcx for supported Kubernetes-style resources; ad-hoc HTTP calls for everything else
- **Grafana Operator + Helm chart** — Helm renders the Grafana Operator's Custom Resources alongside application
  workloads

Match the tool to the resource's volatility:

- Volatile (changed often, by many people) → Git Sync or `gcx` with frequent pull/push
- Stable (rarely changes, infrastructure-like) → Terraform or file provisioning
- Generated (computed from data, templated by service) → Foundation SDK

## Migration paths

### Grizzly → `gcx`

1. Identify Grizzly-managed resources (`grr list`)
2. Port resource definitions to the directory layout `gcx resources push` expects
3. `gcx resources push -p ./resources/`
4. Decommission Grizzly

Grizzly → `grafanactl` was a 1:1 conceptual mapping. `grafanactl` → `gcx` is a binary rename plus one command rename
(`grafanactl resources serve` → `gcx dev serve`).

### Legacy `/api/dashboards/db` → new `/apis/`

1. Replace `POST /api/dashboards/db` with `POST /apis/dashboard.grafana.app/v1/namespaces/<ns>/dashboards`
2. The dashboard's legacy `uid` becomes `metadata.name`
3. Top-level `folderUid` becomes `metadata.annotations["grafana.app/folder"]`
4. Top-level `overwrite: true` becomes a PUT (idempotent upsert) instead of POST

### File provisioning → Terraform

1. Use the Alerting UI Export or `/export` endpoints to dump current resources in Terraform (HCL) format
2. Move the HCL into `.tf` files; replace any hand-coded values with variables
3. `terraform import grafana_xxx.name <id>` attaches the existing resource to Terraform state without changes
4. `terraform plan` should be a no-op; reconcile any drift
5. `terraform apply` confirms the import
6. Delete the file-provisioned source (or leave the file in place and accept that Terraform will fight it)

### File provisioning → `gcx`

1. Export current Kubernetes-style resources: `gcx resources pull --path ./resources/ -o yaml`
2. Commit `./resources/` to Git
3. Decide whether to keep file provisioning as the runtime delivery (Grafana reads `./resources/` on start) or replace
   with `gcx resources push` in CI
