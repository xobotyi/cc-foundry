# Security Posture

Security principles for infrastructure that are non-negotiable defaults, not optional hardening steps applied after the
fact.

## Foundational Principles

**Least privilege.** Every identity — human, service, container, VM — gets the minimum permissions needed to perform its
function. No shared credentials. No wildcard permissions. No "we'll tighten it later." Research shows 99% of cloud
identities use less than 5% of granted permissions — right-size from the start.

- Service accounts get scoped permissions, not admin
- Network access is deny-by-default, allow-by-exception
- File system permissions are restrictive by default
- API keys and tokens are scoped to specific operations
- Elevated access is temporary and audited

**Zero trust.** Never trust, always verify. Network location does not grant trust. Every request is authenticated and
authorized regardless of origin. From NIST SP 800-207:

- The network is always assumed hostile
- All communication is secured regardless of network location
- Access to resources is granted on a per-session basis
- Access is determined by dynamic policy — identity, device state, behavior
- All assets are monitored for integrity and security posture

NIST defines seven verification domains for zero trust posture: identity, device, network/environment, application
workload, data, visibility/analytics, and governance. Verification must span all seven — covering only network
segmentation leaves the other six domains unprotected.

**Assume breach.** Treat all network traffic — including internal — as potentially malicious. Shift focus from perimeter
defense to internal monitoring. Limit implicit trust zones. Implement session-based authentication to restrict lateral
movement.

**Just-in-time (JIT) access.** Elevated access is temporary and automatically expires. Static elevated permissions
accumulate over time ("permission sprawl") — approximately 25% growth per quarter without lifecycle management. 62% of
organizations lack a formal lifecycle for cloud permissions. JIT access with automated approval workflows reduces the
privileged access window while maintaining operational effectiveness. Short-lived tokens (4-8 hour maximum lifespan)
prevent lateral movement attacks that succeed against persistent credentials.

**Defense in depth.** Multiple independent security layers. A failure in one layer must not compromise the system.
Layers include: network segmentation, authentication, authorization, encryption, monitoring, and incident response.

## Secrets Management

- **Never commit secrets to version control.** Not in code, not in config, not in comments, not in environment files
  checked into git.
- **Use a secrets manager** — HashiCorp Vault, SOPS, age, cloud-native KMS. Secrets are injected at runtime, not baked
  into images or config.
- **Rotate secrets on a schedule.** Automate rotation. If rotation is manual, it won't happen.
- **Scope secrets narrowly.** A database credential used by one service should not be shared with another. Separate
  credentials per service, per environment.
- **Audit secret access.** Log who accessed what secret and when.
- **Gate secrets on contextual signals.** Beyond RBAC, add context-aware controls (time of day, location, pipeline
  metadata) to secrets access. Dynamic authorization based on situational trust, not static entitlements.

## Certificate Lifecycle Management

Certificate-related outages are increasing — 72% of organizations experienced them in the past year, with weekly outages
rising from 12% (2022) to 45% (2025). Public TLS certificate lifespans are decreasing (expected 47-day lifespans by
2028), requiring 9x more rotations.

- **Automate certificate issuance and renewal** (ACME / Let's Encrypt). Manual certificate management cannot keep pace
  with shorter lifespans.
- **Monitor expiration proactively.** Certificate expiry is a preventable outage.
- **Encrypt in transit.** TLS everywhere. No exceptions for "internal" traffic — internal networks are not trusted (zero
  trust). Enforce minimum TLS 1.2+, prefer 1.3.
- **Encrypt at rest.** All persistent storage — disks, databases, backups, object stores. Key management must be
  separate from data storage.

## Machine Identity Governance

Machine identities (API keys, SSL/TLS certificates, service tokens) now outnumber human identities 45:1 in many
organizations. IAM teams are typically responsible for only 44% of an organization's machine identities — the majority
are ungoverned.

- **Inventory all machine identities.** You cannot secure what you don't know exists.
- **Apply the same lifecycle management** to machine identities as human identities: issuance, rotation, revocation,
  auditing.
- **Treat undiscovered machine identities as vulnerabilities.** 77% of security leaders agree with this assessment.

## Access Control

- **Authentication before authorization.** Verify identity first, then check permissions. Use multi-factor
  authentication for human access to infrastructure.
- **Role-based access control (RBAC).** Define roles with specific permission sets. Assign users to roles, not
  individual permissions.
- **Audit trails.** Log all access to infrastructure systems. Who did what, when, from where. Logs must be
  tamper-resistant (write-once storage or forwarded to a separate system).
- **Break-glass procedures.** Define emergency access escalation paths. Document them. Test them. Every break-glass
  event triggers a post-incident review.

## Supply Chain Integrity

63% of cloud security incidents stem from misconfigurations rather than sophisticated attacks. Supply chain security
extends beyond dependency pinning to verifiable integrity across the entire delivery pipeline.

- **Pin dependency versions.** Never use "latest" in production. Every dependency must be pinned to a specific, known
  version.
- **Verify checksums and signatures.** Validate integrity of downloaded packages, images, and binaries. Sign container
  images (Sigstore Cosign, Docker Notary) — image signing is not included by default in most CI/CD pipelines but is
  critical for preventing tampered container propagation.
- **Use private registries** for container images and packages in production environments. Mirror public registries;
  don't pull directly from public sources in production.
- **Scan for vulnerabilities.** Automated scanning of dependencies, container images, and infrastructure code. Integrate
  into CI/CD — don't deploy known-vulnerable components. The average enterprise pipeline uses 127 external components
  with comprehensive validation on only 36%.
- **Track transitive dependencies.** A vulnerability in a dependency's dependency is still your vulnerability.
- **Monitor SBOM drift.** Most teams generate a Software Bill of Materials once per release but few monitor how it
  changes continuously. Continuous SBOM monitoring catches early signs of supply chain attacks.
- **Model IaC as an attack surface.** IaC is scanned for misconfigurations but rarely modeled for attack paths. Use
  threat modeling tools to simulate privilege escalations and lateral movements embedded in Terraform or Kubernetes
  configurations.

## Policy-as-Code

Manual security reviews do not scale with cloud-native delivery. Automate governance through declarative policy engines.

**Enforcement layers:**

- **Pre-merge (CI)** — validate manifests against policies during PR. Catch violations before code reaches a cluster.
  Use Kyverno CLI, OPA Conftest, or Pulumi CrossGuard
- **Admission control (runtime)** — intercept API requests before resource persistence. OPA Gatekeeper or Kyverno as
  Kubernetes admission controllers
- **Continuous compliance** — periodic audit of existing resources against current policies. Detect violations that
  predate policy introduction

**Rollout pattern — audit before enforce:**

1. Deploy new policies in `audit` mode — observe what would be blocked
2. Remediate existing violations
3. Switch to `enforce` mode once blast radius is understood

**Operational safety:**

- Exclude critical system namespaces (`kube-system`) from restrictive policies to prevent cluster lockout
- Deploy admission controllers with minimum 3 replicas — a single-replica admission controller is a single point of
  failure that blocks all API requests
- Use declarative exceptions (Kyverno `PolicyException`) for scoped exemptions rather than modifying core policies.
  Store exceptions in Git for auditability

**Tool selection:**

- **Kyverno** — YAML-native, rapid adoption for K8s-focused teams. Strengths: mutation, resource generation, native
  image verification (Sigstore). 15ms avg latency
- **OPA Gatekeeper** — Rego-based, cross-platform consistency (K8s + Terraform + API gateways). Strengths: complex
  computational logic, multi-platform policy reuse
- **Pulumi CrossGuard** — policy packs in TypeScript/Python that validate infrastructure before deployment. Bridges IaC
  and GitOps layers
