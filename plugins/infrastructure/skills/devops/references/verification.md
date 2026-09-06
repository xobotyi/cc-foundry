# What Each Verifier Proves

Every tool below proves a property of an artifact or a declared object. None of them proves that a service answers, a
packet path is open, a database opens, or a user-visible endpoint behaves. Read the "cannot see" before trusting a clean
run. Status anchors are dated; release numbers are deliberately absent because they roll.

## IaC static analysis

- **Trivy** — misconfiguration in Terraform HCL and plan JSON, Dockerfile, Kubernetes, Helm, CloudFormation, ARM, plus
  secrets and SBOM. Misconfiguration scanning is off in image, filesystem, and repository scans until
  `--scanners misconfig`. Needs the checks bundle, so air-gapped use needs extra configuration. Cannot see live cloud
  state. **Trivy's own supply chain was compromised twice in 2026** (advisory GHSA-69fq-xp46-6x23, CVE-2026-33634): 76
  of 77 `trivy-action` tags and every `setup-trivy` tag were force-pushed to credential-stealing commits on 2026-03-19,
  and malicious releases v0.69.4, v0.69.5, and v0.69.6 were published. The verifier is in the threat model; pin it by
  digest or commit SHA like any other dependency.
- **tfsec** — superseded by Trivy (consolidation announced 2023-02-18, repository not archived, no new engineering). Do
  not add it to a new pipeline.
- **checkov** — 750+ policies over Terraform, CloudFormation, ARM, Serverless, Helm, Kubernetes, Docker, with a resource
  graph for cross-resource checks. Static only; runtime validation is a Prisma Cloud feature.
- **tflint** — provider-specific errors (invalid instance types, deprecated syntax, unused declarations, naming) via
  rulesets. Not a security scanner.
- **KICS** — security and compliance queries over 22+ targets including Terraform, OpenTofu, Ansible, Helm, Compose,
  Bicep, GitHub workflows, Pulumi.
- **terrascan** — archived by Tenable 2025-11-20, read-only. Remove it from pipelines.
- **semgrep** — Terraform is generally available with cross-function dataflow; Dockerfile and YAML are experimental.

## Policy as code

- **OPA and conftest** — Rego over any structured input: plan JSON, manifests, HCL, Dockerfile, YAML, TOML, INI. They
  evaluate documents; they never see the applied result.
- **Kyverno CLI** — `apply`, `test`, `json` evaluate policies against manifests before admission; cluster-backed context
  can be mocked offline from 1.19.
- **OPA Gatekeeper** — validating and mutating admission webhook with deny, warn, dry-run, and audit; audit surfaces
  resources already in violation. Nothing outside the admission path.
- **Sentinel** is enterprise-gated (HCP Terraform, Vault Enterprise); OPA with conftest for plan gating, and Gatekeeper
  or Kyverno for admission, are the open-source equivalents. Roll a new policy out in audit mode, remediate existing
  violations, then enforce; exclude `kube-system` from restrictive policies; run admission controllers with more than
  one replica, or a controller outage blocks every API write.

## Drift

- **`terraform plan -detailed-exitcode`** and `tofu plan -detailed-exitcode`: 0 no diff, 1 error, 2 diff. This is the
  machine-readable drift gate; a plain `plan` exits 0 whether or not drift exists. Blind to resources absent from state
  and to anything the provider's refresh does not read.
- **driftctl** is in maintenance mode (last release 2023-12-01) and Snyk's replacement drift feature reached end of life
  on 2023-09-30. Do not add either.
- **Argo CD and Flux** report drift for the resources and fields they reconcile; see
  [`${CLAUDE_SKILL_DIR}/references/gitops.md`] for what they ignore by design.

## Host state

- **goss** — YAML assertions against a live host: packages, files, ports, services, users, processes, mounts, DNS, HTTP,
  command output. Linux is the supported platform; Windows and macOS are alpha.
- **pytest-testinfra** — the same assertions in Python over local, ssh, docker, podman, ansible, kubectl, and other
  backends. Slow-moving; one release in seventeen months as of 2026-09.
- **Chef InSpec** — profiles against hosts, containers, and cloud APIs; the source is Apache 2.0 but every supported
  release requires accepting the Progress Chef EULA. **Cinc Auditor** is the EULA-free build of the same code with
  profile compatibility.
- **serverspec** — RSpec assertions; quiet, not archived.
- A host assertion proves what was asserted. The assertion set is complete only if it names the observable effect of the
  change.

## Supply chain

- **cosign** — keyless signing by default: an ephemeral key bound to an OIDC identity by Fulcio, logged in Rekor;
  verification checks signature, certificate, and log entry. A signature proves who signed, not that the artifact is
  correct.
- **SLSA v1.2** is the approved current revision. Build track L1 provenance exists, L2 hosted build platform signs
  provenance, L3 hardened platform with isolation; Source track L1 version controlled through L4 two-party review.
  Levels describe build and source integrity, never artifact behavior.
- **syft** inventories packages into an SBOM; **grype** matches an SBOM or image against vulnerability data. Neither
  sees reachability or exploitability.
- **Pin GitHub Actions to a full commit SHA.** GitHub's own hardening guide names a full commit SHA as the only way to
  use an action as an immutable release, because a tag can be moved or deleted. `tj-actions/changed-files`
  (CVE-2025-30066, 2025-03-14) and the Trivy actions (2026-03-19) both had their existing tags repointed at
  secret-dumping commits; every pinned-by-tag consumer ran the payload. The allowed-actions policy can enforce SHA
  pinning organization-wide from 2025-08-15. Renovate `helpers:pinGitHubActionDigests` and Dependabot keep the SHA and
  its version comment in sync.
- **Pin container images by digest** for the same reason: a tag resolves to different bytes on different days.
- **actionlint** checks workflow syntax, expression types, shell scripts, and injection patterns; it does not check
  pinning. **zizmor** checks template injection, credential persistence, excessive permissions, impostor commits, and
  confusable references.

## Secrets detection

- **gitleaks** finds secrets in history, files, and stdin by pattern and entropy; it cannot say whether a match is live.
  **trufflehog** verifies supported secret types against the issuing service, which needs network access. Neither finds
  a secret with no detector; both miss the plan output, the state file, and the CI log unless those are scanned as
  inputs.

## Native test frameworks

- **`terraform test`** (Terraform 1.6, 2023-10-04, BUSL 1.1 only) and **`tofu test`** (OpenTofu 1.6, 2024-01-10, MPL
  2.0) apply real or mocked infrastructure and assert on it from `.tftest.hcl`. Mocks (Terraform 1.7) prove module
  logic, not provider behavior.
- **Pulumi** offers unit tests with mocks in the program's language, policy-pack property tests inside the CLI, and
  integration tests against an ephemeral stack.
- **Molecule** (major 26) proves an Ansible role converges and is idempotent within the scenario's sequence; the ansible
  skill owns the detail.

## Terraform versus OpenTofu

- HashiCorp moved Terraform to the Business Source License 1.1 on 2023-08-10; the current LICENSE names IBM as licensor
  with MPL 2.0 as the change license four years after each release. OpenTofu is a Linux Foundation project (2023-09-20)
  under MPL 2.0.
- **State encryption exists in OpenTofu only** (1.7.0, 2024-04-30): state and plan files encrypted at rest for local and
  backend storage. It does not protect against data loss or against replaying an older state or plan. Once enabled, the
  state is unreadable without the key; keep the old method configured until migration completes.
- Both support `-detailed-exitcode`, `import` blocks, `moved` blocks, `removed` blocks, and a native test framework.
