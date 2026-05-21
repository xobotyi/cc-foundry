# gcx (Grafana CLI)

`gcx` is the Grafana CLI for authenticating, managing multiple environments, pushing/pulling Kubernetes-style resources,
querying telemetry, and driving Grafana from agentic coding tools. Supersedes `grafanactl`. Designed for both human
terminal use and AI-agent use.

> **Status:** Public preview. Requires Grafana Cloud or Grafana OSS/Enterprise **v12 or later**. Older Grafana versions
> are not supported by `gcx`.

## Contents

- [When to choose gcx](#when-to-choose-gcx)
- [Installation](#installation)
- [Configuration](#configuration)
- [Contexts](#contexts)
- [Resource workflows](#resource-workflows)
- [Telemetry and investigation](#telemetry-and-investigation)
- [Agentic features](#agentic-features)
- [CI pipeline pattern](#ci-pipeline-pattern)
- [Migrating from grafanactl](#migrating-from-grafanactl)
- [Common pitfalls](#common-pitfalls)

---

## When to choose gcx

- CLI-driven Git-native workflow without Terraform state
- Moving Kubernetes-style resources (dashboards, folders, alert rules, data sources, library panels, playlists) between
  environments (dev → staging → prod)
- AI coding agent (Claude Code, Cursor, Copilot) reading live Grafana state and editing resources from the terminal
- Foundation SDK generates dashboards as code and a preview/push tool is needed
- Querying telemetry (PromQL, LogQL, traces) from the same tool that manages resources
- Grafana Cloud-specific resources (Synthetic Monitoring, k6 checks, Fleet Management, Incidents, Adaptive Telemetry,
  SLOs)

Choose Terraform for state management and stateful drift detection across the broadest resource catalog. Choose file
provisioning to have Grafana read configurations directly at startup. Choose the HTTP API for one-off custom
integrations.

## Installation

### Quick install script (Linux / macOS) — recommended

```bash
curl -fsSL https://raw.githubusercontent.com/grafana/gcx/main/scripts/install.sh | sh
```

The script detects OS and architecture, downloads the latest release from GitHub, verifies the SHA-256 checksum, and
installs the binary to `~/.local/bin`. Override via environment variables:

- `INSTALL_DIR` — custom install directory (default `$HOME/.local/bin`)
- `VERSION` — pin a specific version
- `GITHUB_TOKEN` — supply a GitHub token to avoid rate limits

Pin a version:

```bash
curl -fsSL https://raw.githubusercontent.com/grafana/gcx/main/scripts/install.sh | VERSION=0.2.4 sh
```

### Homebrew (macOS / Linux)

```bash
brew install grafana/grafana/gcx
brew upgrade grafana/grafana/gcx
```

Builds from source on first install — initial install takes 30-60 seconds.

### Pre-built binary

Download from [github.com/grafana/gcx/releases/latest](https://github.com/grafana/gcx/releases/latest), extract, move to
a `PATH` directory, ensure execute permissions. On macOS, Gatekeeper may block manually-downloaded binaries — clear
quarantine:

```bash
xattr -d com.apple.quarantine "$(command -v gcx)" 2>/dev/null || true
codesign --sign - --force "$(command -v gcx)"
```

### Build from source

Requires `git` and Go 1.24+:

```bash
go install github.com/grafana/gcx/cmd/gcx@latest
```

## Configuration

Two modes:

- **Environment variables** — single context; ideal for CI
- **Configuration files** — multiple named contexts; switch between Grafana instances

### Environment variables

Minimum for self-managed Grafana:

```bash
export GRAFANA_SERVER="https://grafana.example.com"
export GRAFANA_ORG_ID="1"
```

For Grafana Cloud, replace `GRAFANA_ORG_ID` with `GRAFANA_STACK_ID`.

Authentication (pick one):

- `GRAFANA_TOKEN` — service account token (recommended)
- `GRAFANA_USER` + `GRAFANA_PASSWORD` — basic auth

Verify:

```bash
gcx config check
```

### Configuration file

Resolution order:

1. `--config` flag
2. `$XDG_CONFIG_HOME/gcx/config.yaml`
3. `$HOME/.config/gcx/config.yaml`
4. `$XDG_CONFIG_DIRS/gcx/config.yaml`

Configuration keys (under `contexts.<name>.grafana.`):

- `server` — instance URL
- `org-id` — for self-managed Grafana / Enterprise
- `stack-id` — for Grafana Cloud (use instead of `org-id`)
- `token` — service account token
- `user`, `password` — basic auth

## Contexts

Contexts let you switch between Grafana instances without re-editing config.

```bash
# Configure the default context (self-managed)
gcx config set contexts.default.grafana.server http://localhost:3000
gcx config set contexts.default.grafana.org-id 1
gcx config set contexts.default.grafana.token <token>

# Add a Grafana Cloud context
gcx config set contexts.cloud.grafana.server https://mystack.grafana.net
gcx config set contexts.cloud.grafana.stack-id 12345
gcx config set contexts.cloud.grafana.token <cloud-token>

# Add a staging context
gcx config set contexts.staging.grafana.server https://staging.grafana.example
gcx config set contexts.staging.grafana.org-id 1
gcx config set contexts.staging.grafana.token <token>

# List contexts
gcx config list-contexts

# Switch
gcx config use-context staging

# Dump current config
gcx config view
```

## Resource workflows

The `resources` subcommand handles Kubernetes-style resources from the `/apis/` surface. The official gcx overview page
lists supported resources as: Grafana dashboards, folders, alert rules, data sources; and Grafana Cloud products
including Synthetic Monitoring, k6, Fleet Management, Incidents, and Adaptive Telemetry. Run `gcx resources list`
against the instance to see the exact set available — resource coverage expands as Grafana resources migrate to the
Kubernetes-style API.

> Subcommand flags shown below (e.g., `--path` / `-p`, `-o yaml`) follow the same shape as predecessor `grafanactl` from
> which `gcx` is derived. Run `gcx resources <cmd> --help` against the installed version to confirm flag spellings for
> that release before scripting against them.

### Migrate resources between environments

```bash
# Pull from development
gcx config use-context development
gcx resources pull --path ./resources/ -o yaml

# (optional) preview locally — dashboards only
gcx dev serve ./resources/

# Push to production
gcx config use-context production
gcx resources push -p ./resources/
```

Default path is `./resources`. Override with `--path` / `-p`. Default output is YAML; use `-o json` for JSON.

### Back up and restore

```bash
# Back up
gcx config use-context production
gcx resources pull --path ./backup/ -o yaml
# commit ./backup/ to version control or push to cloud storage

# Restore (optionally preview first)
gcx dev serve ./backup/
gcx resources push -p ./backup/
```

### Dashboards-as-code with the Foundation SDK

```bash
# Preview the output of a generator script with live reload
gcx dev serve --script 'go run scripts/generate-dashboard.go' --watch './scripts'

# Generate manifest files
go run scripts/generate-dashboard.go --generate-resource-manifests --output ./resources

# Push the generated resources
gcx resources push -p ./resources/
```

The Foundation SDK supports Go, TypeScript, Python, Java, and PHP. `gcx` accepts the manifests produced by any of them.

### Browse and edit from the terminal

List resource types and counts:

```bash
gcx resources list
# GROUP                    VERSION   KIND
# folder.grafana.app       v1        folder
# dashboard.grafana.app    v1        dashboard
# dashboard.grafana.app    v1        librarypanel
# dashboard.grafana.app    v2        dashboard
# playlist.grafana.app     v1        playlist
```

Get all of a kind:

```bash
gcx resources get dashboards
gcx resources get dashboards -o json
gcx resources get dashboards.v1.dashboard.grafana.app   # specific version
```

Combine with `jq` for ad-hoc audits:

```bash
# Find dashboards using each data source
gcx resources get dashboards -o json | jq '.items | map({
  uid: .metadata.name,
  datasources: .spec.panels | map(.datasource.uid)
})'
```

Edit a single resource via JSON patch:

```bash
gcx resources edit dashboards.v1.dashboard.grafana.app/old-dashboard \
  -p '{"spec":{"tags":["deprecated"]}}'
```

Delete one or more resources:

```bash
gcx resources delete dashboards/test-from-stg,test-from-dev
```

## Telemetry and investigation

Unlike `grafanactl` (resources only), `gcx` queries telemetry against the configured instance. This makes it useful for
AI agents: they can read **production state**, not just code.

Typical operations:

- PromQL queries against the configured Mimir/Prometheus data source
- LogQL queries against the configured Loki data source
- Pull traces and latency histograms for an endpoint
- Inspect SLO burn rates and alert firing history
- Investigate noisy alerts and propose adjustments

Resource lifecycle and telemetry stay in one tool, so an agent investigating a slow endpoint can pull traces, identify
the cause, then push the alert-rule fix without switching contexts.

## Agentic features

`gcx` was designed for use by AI coding agents.

- **Auto-detects agentic drivers** (Claude Code, Cursor, Copilot) and removes human-friendly UI elements (spinners,
  colors, prompts) when running under one
- **Machine-readable command catalog** for runtime capability discovery
- **Structured output** via `-o json` / `-o yaml` with predictable field naming across versions
- **Predictable exit codes** for scripting
- **Destructive-operation confirmations** — operations like delete require explicit confirmation flags unless run
  non-interactively

### Skills

The gcx overview page lists portable agent-instruction "skills" covering alert investigation, root-cause analysis,
dashboard GitOps, SLO management, and observability setup. The Grafana announcement blog post references a
`gcx skills install --all` command; confirm the exact command shape with `gcx skills --help` against the installed
version before relying on it — the official gcx docs at the time of writing don't enumerate the `skills` subcommand
syntax in detail.

### Agentic workflow examples

- **Latency analysis** — agent pulls traces, identifies the bottleneck, proposes a fix
- **Query optimization** — agent runs PromQL against the actual metrics backend to verify a query is efficient
- **SLO verification** — agent reads current burn rates and reports SLO status
- **Alert tuning** — agent inspects firing history, identifies noise patterns, proposes threshold adjustments

## CI pipeline pattern

```yaml
# GitHub Actions snippet
- name: install gcx
  run: brew install grafana/grafana/gcx

- name: pull dashboards from staging
  env:
    GRAFANA_SERVER: ${{ secrets.STAGING_URL }}
    GRAFANA_TOKEN: ${{ secrets.STAGING_TOKEN }}
    GRAFANA_ORG_ID: 1
  run: gcx resources pull --path ./resources/ -o yaml

- name: commit any drift
  run: |
    git add resources/
    git diff --cached --quiet || git commit -m 'sync from staging'

- name: push to production
  if: github.ref == 'refs/heads/main'
  env:
    GRAFANA_SERVER: ${{ secrets.PROD_URL }}
    GRAFANA_TOKEN: ${{ secrets.PROD_TOKEN }}
    GRAFANA_ORG_ID: 1
  run: gcx resources push -p ./resources/
```

## Migrating from grafanactl

`gcx` inherits `grafanactl`'s design with improvements (telemetry, agentic features, broader resource coverage). The
`grafanactl` GitHub repository archives on **2026-06-01**.

**Migration is mechanical:**

- Search-and-replace the binary name: `grafanactl` → `gcx`
- One command rename per the Grafana docs: `grafanactl resources serve` → `gcx dev serve`
- Configuration file location: `~/.config/grafanactl/config.yaml` → `~/.config/gcx/config.yaml` (copy the file)
- Configuration keys are the same shape (`server`, `org-id`, `stack-id`, `token`, `user`, `password`) — verified against
  the gcx configuration docs
- Environment variables are the same shape (`GRAFANA_SERVER`, `GRAFANA_ORG_ID` / `GRAFANA_STACK_ID`, `GRAFANA_TOKEN`,
  `GRAFANA_USER`, `GRAFANA_PASSWORD`) — verified against the gcx configuration docs

CI scripts and Makefiles can be updated with `sed`:

```bash
sed -i 's/grafanactl resources serve/gcx dev serve/g; s/grafanactl/gcx/g' .github/workflows/*.yml Makefile
```

After migration, copy your config file (or re-run `gcx config set ...`) and verify with `gcx config check`.

### What's new in gcx vs grafanactl

- **Telemetry queries** (PromQL / LogQL / traces) from the CLI — gcx overview docs list "SRE" use cases including
  monitoring telemetry and incident root-causing
- **Agentic-driver auto-detection** and structured output for agents — gcx overview confirms auto-detection for Claude
  Code, Copilot, Cursor, and similar tools
- **Skills** — portable agent instructions covering alert investigation, root-cause analysis, dashboard GitOps, SLO
  management, observability setup (per gcx overview)
- **`gcx dev serve`** replaces `grafanactl resources serve`
- **Grafana Cloud product coverage** — Synthetic Monitoring, k6, Fleet Management, Incidents, Adaptive Telemetry
- **Rego-based linting** for resources — per gcx overview "observability as code" features (no command syntax in the
  docs I fetched; verify with `gcx --help`)

### grafanactl status

`grafanactl` continues to function until the repository archives. Don't adopt for new work — start with `gcx`. For
existing `grafanactl` deployments, plan migration before 2026-06-01.

## Common pitfalls

- `gcx` against Grafana < v12 — only v12+ is supported. For older Grafana, use `grafanactl` while upgrading.
- Mixing `org-id` and `stack-id` — self-managed uses `org-id`, Cloud uses `stack-id`. Setting both confuses the CLI.
- `gcx dev serve` on non-dashboard resources — `serve` only handles dashboards
- Missing context switch before `pull` / `push` — accidentally writes to the wrong instance. Always run
  `gcx config check` before destructive operations.
- Pulling into a directory with unrelated files — `pull` doesn't clean stale files; next `push` syncs the leftovers
- Assuming `resources` covers all Grafana resources — only Kubernetes-style resources are managed via `resources`. Data
  sources and alerting partly migrated; check `gcx resources list` against the live instance.
- Running `gcx` non-interactively without `GRAFANA_TOKEN` (or basic auth env vars) — CLI prompts interactively, hanging
  CI jobs
- Sharing the same service account token across all environments — use one token per context with minimum role
