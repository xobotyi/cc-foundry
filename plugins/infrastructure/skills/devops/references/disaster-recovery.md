# Disaster Recovery and Backup

Every stateful component needs a backup strategy and tested restore procedure. An untested backup is not a backup.

## Recovery Objectives

**RTO (Recovery Time Objective)** — maximum acceptable time from disaster to restored service. Determines the speed of
your recovery mechanism: cold standby (hours), warm standby (minutes), hot standby (seconds).

**RPO (Recovery Point Objective)** — maximum acceptable data loss measured in time. An RPO of 1 hour means you can lose
up to 1 hour of data. Determines backup frequency: daily backups = 24-hour RPO maximum.

**Set RTO and RPO per component, not per system.** A system's database may need a 15-minute RPO while its configuration
can tolerate a 24-hour RPO. Over-engineering recovery for non-critical components wastes resources.

**Determine targets from business impact, not technical preference.** Factors that drive RTO/RPO decisions:

- Business impact — if the system's failure halts organizational productivity, targets must be aggressive
- SLA obligations — contractual availability guarantees create hard recovery deadlines; breaches incur monetary
  penalties
- Regulatory requirements — some industries mandate specific recovery capabilities (e.g., financial services require
  adequate DR methods for system stability)
- Cost trade-off — each additional "nine" of recovery speed costs roughly 10x more. Engineer to the right level, not the
  maximum level

## Service Tiering

Categorize services by criticality to determine the appropriate recovery architecture. Different tiers justify different
infrastructure costs and complexity.

| Tier                  | Criticality            | Recovery Architecture         | RTO Target | Cost           |
| --------------------- | ---------------------- | ----------------------------- | ---------- | -------------- |
| 1 — Mission-critical  | Revenue/safety impact  | Hot standby or shared active  | Minutes    | High (near 2x) |
| 2 — Business-critical | Significant disruption | Warm standby                  | < 1 hour   | Medium         |
| 3 — Important         | Productivity impact    | Cold standby with IaC rebuild | < 4 hours  | Low            |
| 4 — Non-critical      | Minimal impact         | Restore from backup           | < 24 hours | Minimal        |

**Architecture trade-offs:**

- **Hot standby / shared active** — continuously synchronized secondary system, near-zero RTO/RPO, but near-double
  infrastructure cost
- **Warm standby** — secondary system running but not serving traffic, requires catch-up on failover
- **Cold standby** — infrastructure built from scratch during disaster using IaC, lowest cost but highest RTO. Modern
  IaC tools can achieve ~15-minute rebuilds for stateless web tiers
- **Stateless vs stateful** — stateless tiers (web, presentation) can be rebuilt quickly from IaC definitions. Stateful
  tiers (databases, search) drive the actual RPO requirements and need frequent backups

## Backup Principles

- **Automate backups.** Manual backups don't happen. Automate the schedule, the execution, and the verification.
- **Test restores regularly.** A backup that has never been restored is an assumption, not a guarantee. Schedule restore
  tests — monthly at minimum. Document the restore procedure and time it.
- **Store backups off-site.** Backups on the same system, same rack, or same site as the primary data are not disaster
  recovery — they're convenience copies. Use geographic separation.
- **Encrypt backups.** Backup data has the same confidentiality requirements as live data. Encrypt at rest. Manage
  encryption keys separately from the backup storage.
- **Version backups.** Retain multiple backup generations. A corrupted primary that gets backed up overwrites the only
  good copy if you keep only one generation.
- **Monitor backup success.** Alert on backup failures. A silently failing backup job is worse than no backup — it
  creates false confidence.

## Disaster Recovery Planning

**Identify failure scenarios.** For each component, enumerate what can fail:

- Hardware failure (disk, node, rack, site)
- Data corruption (application bug, human error, malicious action)
- Network partition
- Provider outage
- Security breach requiring rebuild

**Define recovery procedures per scenario.** Different failures need different responses. A disk failure recovers from
replica; data corruption recovers from backup; a security breach may require full rebuild from known-good state.

**Document dependencies.** Recovery order matters. You cannot restore an application before its database is available.
Map the dependency chain and document the correct recovery sequence.

**Runbook format for DR procedures:**

- Pre-conditions — what must be true before starting
- Step-by-step procedure — specific commands, not general guidance
- Verification — how to confirm each step succeeded
- Expected duration — how long each step takes
- Escalation — who to contact if a step fails
- Post-recovery validation — how to confirm the system is fully operational

## Testing

**Tabletop exercises.** Walk through disaster scenarios with the team. Identify gaps in procedures without touching
production. Low cost, high value.

**Controlled failover tests.** Deliberately fail a component and recover. Start with non-production environments.
Graduate to production during maintenance windows with the team prepared.

**Chaos engineering.** Inject failures in production to validate resilience. A disciplined, proactive method of
identifying weaknesses — not creating chaos for its own sake. Shifts teams from reactive "fix-it-when-it-breaks" to
proactive "break-it-to-improve-it."

### Chaos Engineering Approaches

**Chaos as code.** Define experiments in JSON/YAML, making them repeatable, versionable, and integrable into CI/CD
pipelines. Treat chaos experiments with the same rigor as application code.

**Progressive scope escalation:**

1. Start with single-process failures (kill a container, restart a service)
2. Progress to network simulation (latency injection, bandwidth limits, connection drops)
3. Graduate to node-level failures (kill nodes, partition networks)
4. Full system exercises only when confidence in recovery is high

**Platform-specific fault injection:**

- Kubernetes-native: LitmusChaos, Chaos Mesh — inject pod failures, network delays, stress tests into microservices
- Cloud-managed: AWS Fault Injection Simulator, Azure Chaos Studio — native fault injection within cloud ecosystems
- Network simulation: ToxiProxy (TCP proxy for latency/bandwidth/connection issues), Blockade (network partitions for
  Docker containers)

**Game days and resilience drills.** Interactive exercises where teams "attack" their own infrastructure to validate
self-healing, auto-scaling, and recovery procedures. Test runbooks during chaos drills to ensure they are current and
effective.

**Chaos engineering safety requirements:**

- Define hypothesis before the experiment ("we expect the system to continue serving requests within SLO when X fails")
- Set clear blast radius boundaries
- Have a kill switch to abort experiments immediately
- Start in non-production; graduate to production only with high confidence
- Document findings and update runbooks based on results
