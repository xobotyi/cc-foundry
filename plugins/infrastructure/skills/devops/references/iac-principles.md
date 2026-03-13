# Infrastructure as Code Principles

Foundational principles for managing infrastructure through declarative, version-controlled
definitions rather than manual processes.

## Core Principles

**Declarative over imperative.** Define the desired end state, not the steps to reach it.
Declarative definitions are idempotent by nature — applying them multiple times produces the
same result. Imperative scripts accumulate side effects and drift.

**Version-controlled.** All infrastructure definitions live in version control. Every change
is reviewed, auditable, and reversible. No changes through CLI, console, or manual SSH.

**Idempotency.** Applying the same configuration repeatedly must produce the same result
without side effects. This is the single most important property of reliable infrastructure
automation. A non-idempotent operation is a bug, not a feature.

**Reproducibility.** Given the same inputs (code + variables + state), the system must produce
identical infrastructure. Reproducibility requires pinned dependency versions, hermetic builds,
and deterministic ordering.

**Immutability.** Prefer replacing infrastructure over modifying in place. Mutable
infrastructure accumulates configuration drift, undocumented changes, and snowflake state.
Immutable infrastructure treats servers as cattle, not pets — replaceable units provisioned
from a known image or definition.

## GitOps Principles (OpenGitOps v1.0)

GitOps is the operational model where Git is the single source of truth for desired
infrastructure state. Four principles from the OpenGitOps specification:

1. **Declarative** — the system's desired state is expressed declaratively
2. **Versioned and immutable** — desired state is stored in a way that enforces immutability
   and versioning, retaining complete version history
3. **Pulled automatically** — software agents automatically pull desired state declarations
   from the source
4. **Continuously reconciled** — software agents continuously observe actual system state and
   attempt to apply the desired state

The pull model is critical: agents must be able to access desired state at any time. This is
a prerequisite for continuous reconciliation. Push-based deployment breaks the reconciliation
loop.

### GitOps Drift Management

**Drift detection and remediation.** The reconciliation loop must detect when actual state
diverges from desired state and either auto-remediate or alert. Drift sources include: manual
changes, failed partial applies, external system changes, and provider API updates.

**Reconciliation safety:** Controllers (HPA, cert-manager, Crossplane, external-dns)
legitimately modify resources. Auto-remediating those changes creates reconciliation loops
that destabilize clusters. Mitigations:
- Build exclusion lists (ignore rules for intentionally dynamic fields) before enabling
  auto-sync, not after
- Use ArgoCD sync waves or Flux `dependsOn` to enforce resource ordering (CRDs before
  custom resources, namespaces before workloads)
- Set up webhook receivers instead of aggressive polling — reconciliation triggers within
  seconds of push, reducing API rate limit pain at scale

**Pragmatic adoption (the Intuit pattern):** Even the largest GitOps adopters (Intuit: 45
ArgoCD instances, 20,000 apps, 200 clusters) deviate from pure GitOps when practical. Start
with automated drift detection and alerting, enable auto-remediation after confidence in
exclusion lists is established. GitOps "most of the time" is better than GitOps none of
the time.

**The gitops-bridge pattern:** Connects IaC (Day 0 provisioning) with GitOps (Day 2
configuration). IaC provisions cloud resources and writes metadata (role ARNs, endpoints)
into Kubernetes ConfigMaps/Secrets. GitOps tools consume this metadata, keeping application
configuration in sync with infrastructure without hardcoding cloud-specific values.

## The 12-Factor Methodology (Infrastructure-Relevant Factors)

Originally for SaaS apps, these factors apply equally to infrastructure design:

- **Factor I: Codebase** — one codebase tracked in version control, many deploys
- **Factor II: Dependencies** — explicitly declare and isolate dependencies. Pin versions.
  No implicit system-level dependencies.
- **Factor III: Config** — store config in the environment, not in code. Strict separation
  of config from code. Config varies between deploys; code does not.
- **Factor V: Build, release, run** — strictly separate build and run stages. A release is
  a build combined with config. Releases are immutable and uniquely identifiable.
- **Factor X: Dev/prod parity** — keep development, staging, and production as similar as
  possible. Three gaps to close: time gap (deploy quickly), personnel gap (same people write
  and deploy), tools gap (same backing services everywhere).
- **Factor XI: Logs** — treat logs as event streams. Never route or store logs within the
  application/infrastructure itself. Emit to stdout, let the platform handle routing.

## State Management

IaC tools differ fundamentally in how they track managed resources. Understanding these
approaches is critical for selecting the right tool and avoiding drift.

**Stateful (persistent state file).** Tools like Terraform maintain a state file that
maps configuration to real-world resources. The state file enables:
- Full lifecycle tracking — knows what was created, modified, or deleted
- Orphan detection — removing a resource from config automatically destroys it
- Drift detection — compares config, state, and actual infrastructure to find divergence

**Stateless (fact-gathering).** Tools like Ansible gather system facts in memory at
runtime without maintaining a persistent record of prior actions. Limitations:
- No orphan detection — removing a task from a playbook leaves the old resource in place.
  Must explicitly declare resources as "absent" to remove them
- Limited drift detection — can only verify items currently in the playbook, not items
  removed from it across updates
- Making stateless tools behave fully declaratively requires significant manual effort
  to account for all possible drift paths

**Continuous reconciliation (GitOps).** Tools like Flux and Argo CD treat a Git
repository as the source of truth and continuously compare desired state to actual
cluster state. Drift is detected and auto-remediated through the reconciliation loop.

**Practical guidance:**
- Use stateful tools for resource provisioning (creating/destroying infrastructure)
- Use stateless tools for configuration management (configuring existing resources)
- Use GitOps reconciliation for Kubernetes and environments requiring continuous
  drift correction
- When using stateless tools, implement explicit cleanup for removed resources

## IaC Quality and Security Smells

Research has identified 62 categories of security smells in IaC scripts across seven
major tools (Terraform, Ansible, Chef, Puppet, Pulumi, Saltstack, Vagrant). Common
categories include: hardcoded secrets, overly permissive permissions, insecure defaults,
outdated software versions, code injection, and insecure input handling.

**Quality indicators to monitor:**
- **Security smells** — patterns suggesting potential vulnerabilities. These persist for
  extended periods due to inadequate detection tools
- **Environment drift** — divergence between declared and actual state is a primary
  cause of deployment inconsistency and extended MTTR
- **Linter profile level** — for Ansible, `ansible-lint` profiles progress from `min`
  (syntax only) to `production` (reliability + maintainability). Target `production`
  for any code managing real infrastructure
- **Idempotency failures** — second apply showing diffs indicates broken configuration
- **Change frequency without test coverage** — high churn without corresponding tests
  correlates with defect rates

**Static analysis tools by ecosystem:**
- Terraform: `tflint` (custom rules), `checkov`, `tfsec`, `trivy`
- Ansible: `ansible-lint` (quality profiles), `yamllint`
- General IaC: `kics`, `checkov` (multi-tool), `GLITCH` (polyglot smell detection)
- Policy: OPA/Conftest, HashiCorp Sentinel, Pulumi CrossGuard

## Configuration Design (Google SRE)

Configuration is a human-computer interface for modifying system behavior. Key principles
from Google SRE's configuration design:

- **Minimize mandatory configuration.** Ideal configuration is no configuration. Every
  mandatory question is friction. Convert mandatory to optional by providing safe defaults.
- **Use dynamic defaults.** Defaults that adapt to the deployment context (available cores,
  memory, network topology) reduce configuration burden without sacrificing correctness.
- **Separate configuration philosophy from mechanics.** The structure and abstraction level
  of configuration matters more than the language (YAML, JSON, HCL). Get the abstraction
  right first.
- **User-centric over infrastructure-centric.** Configuration should ask questions in the
  user's domain language, not in infrastructure primitives. Fewer, higher-level knobs beat
  many low-level tunables.
- **Safe application of changes:**
  - Deploy gradually — never all-at-once
  - Always support rollback
  - Automatic rollback on loss of operator control (e.g., locking yourself out via firewall)
- **Version and track all configuration changes.** Every change to configuration must be
  auditable: who changed what, when, and why. Store configuration in version control with
  code review requirements.

## IaC Maturity

Despite widespread adoption (89% of organizations use IaC), only 6% have achieved full
cloud codification. The primary hurdles are:
1. Lack of knowledgeable engineering resources
2. Tooling fragmentation, complexity, and cost
3. Lack of IaC coverage for existing and legacy resources

This maturity gap means most organizations still have significant portions of
infrastructure outside of code control — a persistent source of drift, security risk,
and operational toil.
