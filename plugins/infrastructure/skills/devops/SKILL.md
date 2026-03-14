---
name: devops
description: >-
  Infrastructure engineering discipline: infrastructure-as-code principles, deliverable
  quality standards, environment parity, change management, security posture, observability,
  incident response, policy-as-code, supply chain integrity, and disaster recovery. Invoke
  whenever task involves any interaction with infrastructure work — provisioning, configuring,
  deploying, monitoring, or operating infrastructure systems.
---

# DevOps Discipline

**Declarative, reproducible, observable, secure by default.**

Every infrastructure failure traces to one of four root causes:

- Undeclared state — infrastructure exists that isn't in code
- Unverified changes — changes deployed without testing or rollback plan
- Invisible systems — infrastructure that can't be monitored or debugged
- Assumed security — security treated as a later hardening step instead of a default

This skill prevents all four.

## References

- **IaC principles** — [`${CLAUDE_SKILL_DIR}/references/iac-principles.md`]: GitOps v1.0 spec, 12-factor methodology,
  state management comparison (stateful/stateless/GitOps), configuration design patterns, IaC maturity data
- **Observability** — [`${CLAUDE_SKILL_DIR}/references/observability.md`]: Three pillars deep dive, SLI/SLO/error budget
  framework, DORA metrics, toil reduction patterns, common observability gaps, sampling strategies
- **Change management** — [`${CLAUDE_SKILL_DIR}/references/change-management.md`]: Deployment strategy comparison table,
  release engineering principles, rollback requirements checklist, progressive delivery tooling
- **Security posture** — [`${CLAUDE_SKILL_DIR}/references/security-posture.md`]: Zero trust NIST domains, JIT access
  patterns, certificate lifecycle, machine identity governance, supply chain integrity, policy-as-code tooling
- **Disaster recovery** — [`${CLAUDE_SKILL_DIR}/references/disaster-recovery.md`]: RTO/RPO sizing by business impact,
  service tiering, recovery architecture trade-offs, chaos engineering approaches and tooling
- **Testing** — [`${CLAUDE_SKILL_DIR}/references/testing.md`]: Testing pyramid layers with tool lists, IaC quality
  metrics, runbook format and automation maturity levels, incident response patterns

## Core Principles

These apply to all infrastructure work regardless of tool.

### Everything in Code

- All infrastructure is defined in version-controlled, declarative code
- No manual changes through CLI, console, or SSH. If it's not in code, it doesn't exist
- Configuration is separated from code — config varies between environments, code does not
- Changes go through code review before deployment
- Every change is auditable: who changed what, when, why

### Idempotent and Reproducible

- Applying configuration twice produces zero changes on the second run. If the second apply shows diffs, the
  configuration is broken
- Given the same inputs, the system produces identical infrastructure every time
- Pin all dependency versions — tools, providers, modules, images. "Latest" is not a version
- Builds are hermetic: independent of the machine running them

**Pinning example:**

- Bad: `image: nginx:latest` / `version: ">=2.0"` / `hashicorp/consul:*`
- Good: `image: nginx:1.25.4@sha256:6a5...` / `version: "2.3.1"` / `hashicorp/consul:1.17.2`

### Immutable Over Mutable

- Prefer replacing infrastructure over patching in place
- Servers are cattle, not pets — replaceable units provisioned from known definitions
- Mutable infrastructure accumulates drift, undocumented changes, and snowflake state
- When mutation is unavoidable (stateful systems), treat it as a managed exception with explicit drift detection

### Secure by Default

- Least privilege everywhere — no wildcard permissions, no shared credentials, no "tighten later". 99% of cloud
  identities use less than 5% of granted permissions — right-size from the start
- Zero trust — network location does not grant trust. Authenticate and authorize every request regardless of origin.
  Verify across all NIST domains: identity, device, network, application workload, data, visibility/analytics,
  governance
- Assume breach — treat all traffic (including internal) as potentially malicious. Focus on internal monitoring,
  session-based auth, limiting lateral movement
- Just-in-time access — elevated permissions are temporary (4-8 hour maximum lifespan) and expire automatically. Static
  elevated permissions accumulate into permission sprawl (~25% growth per quarter without lifecycle management)
- Encrypt in transit (TLS everywhere, no "internal-only" exceptions) and at rest
- Never commit secrets to version control. Use a secrets manager. Rotate on schedule
- Pin dependencies, verify checksums and signatures, scan for vulnerabilities. See
  [`${CLAUDE_SKILL_DIR}/references/security-posture.md`] for supply chain integrity requirements

**Secrets example:**

- Bad: `db_password: "hunter2"` in a YAML file committed to git
- Bad: `ENV DB_PASS=hunter2` baked into a Dockerfile
- Good: `db_password: "{{ vault_db_password }}"` with Ansible Vault
- Good: `password_file: /run/secrets/db_pass` with Docker secrets or SOPS

### Observable

- Every component exposes the four golden signals: latency, traffic, errors, saturation
- Collect all three observability pillars: metrics, logs, and traces. Metrics for alerting and trends, logs for event
  context, traces for distributed request paths
- Monitoring (reactive, predefined thresholds) is necessary but not sufficient. Observability (proactive, infer internal
  state from outputs) is required for distributed systems where failure modes are emergent and unpredictable
- Alert on symptoms (what's broken), not causes (why). Use causes for debugging
- Every alert must be actionable — if the response is "ignore it," delete the alert. Alert fatigue is the primary
  obstacle to fast incident response
- Use distributions and percentiles, not averages. Averages hide tail latency
- Monitor saturation proactively — latency spikes are leading indicators of saturation
- Manage observability configuration as code — dashboards, alerts, SLOs, and notification policies live in Git and
  deploy via CI/CD

### Recoverable

- Every stateful component has a backup strategy with defined RTO and RPO
- Backups are automated, encrypted, stored off-site, and regularly test-restored
- Every change has a defined rollback path before deployment
- Recovery procedures are documented as runbooks with specific commands, not prose
- Validate resilience through chaos engineering — controlled fault injection to verify recovery procedures work before
  real incidents occur

## Deliverable Standards

<deliverable-checklist>
An infrastructure deliverable is not done until all of these are true:

- [ ] **Defined in code** — declarative, version-controlled, reviewed
- [ ] **Idempotent** — second apply produces zero changes
- [ ] **Tested** — static analysis passes, integration verified in test environment
- [ ] **Secrets managed** — no secrets in code or config; injected at runtime
- [ ] **Monitoring in place** — golden signals exposed, alerts configured, dashboard exists
- [ ] **Rollback defined** — documented procedure, tested, with known duration
- [ ] **Backup strategy** — automated backups for stateful components, restore tested
- [ ] **Documented** — topology, access, dependencies, runbooks, recovery procedures
- [ ] **Environment parity** — dev/staging/prod use the same definitions with environment-specific variables.
      Differences are explicit and minimized
- [ ] **Security reviewed** — least privilege, encryption, access control verified
- [ ] **Supply chain verified** — dependencies pinned, checksums validated, images signed where applicable,
      vulnerability scanning in CI/CD
- [ ] **Compliance enforced** — policy-as-code checks pass in CI/CD pipeline; organizational policies (naming, tagging,
      allowed regions) are automated
- [ ] **Drift detection active** — continuous monitoring for configuration drift with alerting or auto-remediation
- [ ] **Deprovisioning defined** — teardown procedure exists, handles dependencies in correct order, verified to leave
      no orphaned resources </deliverable-checklist>

## Change Management

### Before Deploying

- Review the plan diff — what will be created, modified, destroyed
- Verify rollback path exists and is documented
- Confirm monitoring will detect problems during rollout
- Assess blast radius — what breaks if this change fails?

**Blast radius example:**

- Bad: "Should be fine, it's just a config change" — deployed to all nodes simultaneously
- Good: "This modifies the load balancer config. Failure affects all inbound traffic. Deploy to canary first, verify
  health for 10 minutes, then roll to remaining nodes"

### Deployment Strategy Selection

- **Default:** Canary for critical infrastructure, rolling for routine changes
- **Blue-green:** When mixed-version state is unacceptable
- **Progressive delivery:** Combine canary with automated analysis — query metrics during rollout and auto-promote or
  auto-rollback based on SLI thresholds
- **Never:** All-at-once to production. Gradual rollout always

### After Deploying

- Verify the change produced the expected result
- Confirm monitoring shows healthy state
- Watch for delayed effects (connection pool exhaustion, cache warming, DNS propagation)
- Document any deviations from the plan

See [`${CLAUDE_SKILL_DIR}/references/change-management.md`] for strategy comparison tables and rollback requirements.

## Drift Management

Drift — divergence between declared state and actual state — is the single most common source of deployment failures.
Less than one-third of organizations continuously monitor for drift; the rest discover it during outages.

**Sources of drift:** manual changes ("quick fixes" via CLI/console), failed partial applies, external system changes,
provider API updates, auto-scalers and controllers modifying resources legitimately.

**Detection approaches by tool type:**

- **Stateful tools** (Terraform) — compare state file against live infrastructure to detect additions, modifications,
  and deletions
- **Stateless tools** (Ansible) — can only verify items in current playbook; cannot detect removed resources. Requires
  explicit `absent` declarations for cleanup
- **GitOps reconciliation** (Flux, Argo CD) — pull-based agents continuously compare desired state in Git against live
  cluster state. Auto-remediate or alert

**Drift example:**

- Bad: "The load balancer stopped working after deploy" — someone added a firewall rule via the console last week; it
  wasn't in code; the deploy overwrote it
- Good: Drift detection caught the manual rule within hours, team codified it, and the next deploy included it

**Reconciliation safety:** Configure exclusion lists before enabling auto-sync. Controllers (HPA, cert-manager,
Crossplane) legitimately modify resources — auto- remediating those changes creates reconciliation loops that
destabilize the cluster. Start with detection + alerting, then enable auto-remediation after confidence in exclusion
lists is established.

## Environment Parity

Three gaps to close between development and production:

- **Time gap** — deploy to staging immediately after code review, not days later
- **Personnel gap** — the people who write infrastructure code also deploy it
- **Tools gap** — same backing services, same OS, same versions across environments

Unavoidable differences (scale, domain names, credentials) are handled through environment-specific variables, not
through separate code paths. If dev and prod use different infrastructure definitions, they will diverge.

**Parity example:**

- Bad: dev uses SQLite, staging uses MySQL, prod uses PostgreSQL — "they're all SQL"
- Good: all environments use PostgreSQL with the same major version; only connection strings and replica counts differ
  via environment variables

**Indicators of parity problems:**

- Production-only bugs that cannot be reproduced in lower environments
- Extended MTTR because engineers spend time identifying environment differences rather than fixing the actual issue
- High change failure rates and deployment toil from manual environment verification
- Deployments are treated as risky events rather than routine operations

**Preventing drift:** Use IaC to provision all environments from the same definitions. Use containerization to package
applications with their dependencies. Use continuous drift detection (state file comparison or GitOps reconciliation) to
catch divergence before it causes incidents. Treat environments as immutable — replace rather than patch. The four
pillars of parity: standardization, immutability, automation, observability.

## Testing Requirements

### Minimum Testing Bar

Every infrastructure change must pass:

1. **Static analysis** — linting, security scanning, policy-as-code checks. Run on every commit. Tools: `tflint`,
   `checkov`, `ansible-lint`, `trivy`, `kics`
2. **Idempotency verification** — apply twice, confirm zero changes on second run
3. **Plan review** — human review of the plan diff before apply

### Recommended Testing

- **Integration tests** — deploy to ephemeral environment, verify behavior, destroy
- **Rollback tests** — deploy N+1, roll back to N, verify correct state
- **Destruction tests** — verify teardown is clean, no orphaned resources
- **Chaos tests** — inject controlled failures to validate resilience and recovery procedures. Start small (kill a
  process), increase scope gradually (network partition, node failure). See
  [`${CLAUDE_SKILL_DIR}/references/disaster-recovery.md`]

### IaC Quality Indicators

Watch for these signals of degrading infrastructure code quality:

- Security smells — hardcoded secrets, overly permissive IAM, insecure defaults
- Rising change frequency without corresponding test coverage
- Linter profile below "production" level (for Ansible: `ansible-lint` profiles progress through min → basic → moderate
  → safety → shared → production)
- Non-idempotent applies — second run shows diffs

## Incident Response

**Every alert with a rote, algorithmic response must be automated.** If the response to a page is always the same steps,
that response is a candidate for automated remediation.

**Blameless postmortems:** Focus on system flaws, not human error. "What went wrong" not "who caused it." Document:
timeline, root cause, contributing factors, action items to prevent recurrence. Every postmortem produces concrete
action items — not just "be more careful."

**Toil management:** Toil is operational work that is manual, repetitive, automatable, tactical, without enduring value,
and grows linearly with service size. Target: less than 50% of time on toil. If a team exceeds this, step back and
automate. Use SLOs to make data-driven decisions — ignore certain operational tasks if doing so does not consume the
error budget.

**Self-service reduces toil:** Move 80-90% of routine requests to self-service via web forms, scripts, APIs, or pull
requests to configuration files. Reserve human handling for edge cases while automating the common path.

See [`${CLAUDE_SKILL_DIR}/references/testing.md`] for runbook automation maturity levels and incident response patterns.

## Documentation Standards

Infrastructure documentation is part of the deliverable. Undocumented infrastructure is a liability — it becomes opaque
to everyone except the person who built it, and eventually to them too.

**Every infrastructure component must have:**

- Topology diagram — what exists, how it connects, what depends on what
- Access information — how to reach it, who has access, what credentials are needed (not the credentials themselves)
- Dependencies — upstream, downstream, external services
- Runbooks — step-by-step operational procedures with copy-pasteable commands
- Monitoring — what's watched, where dashboards are, what alerts exist and what they mean
- Recovery procedures — per-component DR procedures with RTO/RPO targets

**Runbooks are specific commands, not prose.** Every step must be executable without interpretation:

- Bad: "Restart the service and check that it's working"
- Good: `systemctl restart caddy && curl -f http://localhost:80/health`
- Bad: "Check the database is healthy"
- Good: `psql -h localhost -U app -c "SELECT 1" && echo "DB OK" || echo "DB FAIL"`

**Runbook automation maturity:** Start with manual runbooks. Once a procedure is validated through repeated execution,
convert to semi-automated (scripts with human oversight at decision points), then fully automated (event-driven, no
human intervention) for rote responses to known alerts. Every automated runbook must produce an audit trail and include
a rollback path. See [`${CLAUDE_SKILL_DIR}/references/testing.md`] for automation patterns and success check
requirements.

## Application

**When writing infrastructure:** Apply all principles silently. Use the deliverable checklist as a completion gate — do
not declare work done until every item is checked. Flag security, observability, or recoverability gaps as blocking
issues, not suggestions.

**When reviewing infrastructure:** Cite the specific principle violated. Show the fix inline — not just what's wrong,
but what correct looks like. Prioritize: security gaps first, then observability gaps, then drift/parity issues, then
documentation gaps.

## Integration

This skill defines the discipline that all infrastructure tool skills assume.

**Workflow:**

1. **DevOps skill** — establish principles, quality standards, security posture
2. **Tool skill** — apply tool-specific conventions and patterns:
   - `ansible` — playbook design, role structure, inventory, vault
   - `containers` — Docker/Podman, Compose, image optimization
   - `proxmox` — VM/LXC provisioning, storage, networking, clustering
   - `unraid` — arrays, Docker, VMs, shares, plugins
   - `networking` — VLANs, firewalls, DNS, reverse proxies, VPN, TLS
3. **DevOps skill** — verify deliverable checklist, documentation, security review

The tool skills handle _how_ to implement. This skill handles _what good looks like_.

IMPORTANT: Before declaring any infrastructure task complete, return to the deliverable checklist above and verify every
item. An unchecked item is an unfinished deliverable.
