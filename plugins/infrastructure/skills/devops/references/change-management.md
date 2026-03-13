# Change Management and Release Engineering

Strategies for deploying infrastructure changes safely, with rollback paths and risk management. Synthesized from Google
SRE release engineering and industry practices.

## Deployment Strategies

### Rolling Update

Replace instances incrementally. At any point, some run the old version, some the new.

- **When:** Default for most infrastructure changes. Low-risk, well-tested changes.
- **Rollback:** Stop the rollout, revert remaining instances.
- **Risk:** Mixed versions coexist during rollout — ensure backward compatibility.
- **Capacity:** Requires enough capacity to serve traffic with reduced instance count.

### Blue-Green

Maintain two identical environments. Deploy to the inactive one, then switch traffic.

- **When:** Need instant cutover with zero mixed-version state. Database schema changes that require coordination.
- **Rollback:** Switch traffic back to the original environment. Near-instant.
- **Risk:** Requires 2x infrastructure during transition. Database state must be compatible with both versions.
- **Cost:** High — double the infrastructure footprint.

### Canary

Deploy to a small subset first. Monitor for problems. Expand gradually.

- **When:** High-risk changes, new features, changes with uncertain impact. Changes to critical infrastructure.
- **Rollback:** Remove the canary. Blast radius limited to the canary percentage.
- **Risk:** Canary must receive representative traffic. If the canary only sees edge cases, it won't catch mainstream
  problems (and vice versa).
- **Duration:** Long enough to observe steady-state behavior. Google SRE recommends matching the rollout risk profile to
  the service criticality.

### Progressive Delivery

Canary deployment enhanced with automated analysis. The system queries metrics during rollout and automatically promotes
or rolls back based on predefined thresholds.

- **When:** High-frequency deployments where manual monitoring doesn't scale. Teams with mature SLO-based alerting.
- **Tools:** Argo Rollouts, Flagger (Flux ecosystem), Kargo — query Prometheus metrics during canary and
  auto-promote/rollback based on error rates, latency percentiles, or custom metrics.
- **Advantage:** Removes human bottleneck from deployment approval while maintaining safety. Enables higher deployment
  frequency.

### Selecting a Strategy

| Factor              | Rolling     | Blue-Green            | Canary        | Progressive      |
| ------------------- | ----------- | --------------------- | ------------- | ---------------- |
| Rollback speed      | Minutes     | Seconds               | Seconds       | Seconds          |
| Infrastructure cost | 1x          | 2x                    | ~1x           | ~1x              |
| Mixed versions      | Yes         | No                    | Yes (small %) | Yes (small %)    |
| Risk exposure       | Progressive | All-or-nothing switch | Minimal       | Minimal          |
| Human involvement   | Medium      | Low                   | High          | None (automated) |
| Complexity          | Low         | Medium                | Medium-High   | High             |

**Default to canary for critical infrastructure.** Rolling updates for routine changes. Blue-green when mixed-version
state is unacceptable. Progressive delivery when deployment frequency demands automated analysis.

## Release Engineering Principles (Google SRE)

- **Self-service model.** Teams must be able to release independently without bottlenecks. Automated release processes
  that require minimal human involvement.
- **High velocity.** Frequent releases = fewer changes per release = easier debugging. Some Google teams release hourly
  and select builds based on test results.
- **Hermetic builds.** Builds must be insensitive to the build machine's environment. Depend on known versions of tools
  and libraries. The build process must be self-contained — no external service dependencies.
- **Enforcement and policy.** Gated operations with access control: approving code changes, creating releases,
  deploying, modifying build configuration. Every release produces a report of all included changes.

## Risk Management

**Error budgets drive release velocity.** When the error budget has margin, ship faster. When it's depleted, slow down
and invest in reliability. This removes politics from release decisions — the data decides. When exhausted, implement a
feature freeze (30-day freeze is common) and dedicate resources to reliability fixes.

**Cost of reliability is non-linear.** Each additional "nine" of availability costs roughly 10x more than the previous
one. A user on a 99% reliable network cannot distinguish 99.99% from 99.999% service reliability. Engineer to the right
level, not the maximum level.

**Embrace risk explicitly.** Define the acceptable failure rate. Track it. Use it to make decisions. "Hope is not a
strategy" — base decisions on data, not on politics, fear, or optimism.

**Error budgets govern automation scope:** When budget is healthy (>50% remaining), permit canary deployments with less
manual review. When budget is low, engage stricter controls. Error budgets determine how much automated remediation and
self-healing is permissible.

## Rollback Requirements

Every infrastructure change must have a defined rollback path before deployment:

- **What to roll back** — the specific change, not the entire system
- **How to roll back** — the exact steps or automated process
- **How long rollback takes** — known and documented
- **Who can trigger rollback** — defined and authorized
- **Data implications** — what happens to data created during the change window
- **Verification** — how to confirm rollback was successful

**Stateful rollback caveat:** GitOps rollback (reverting a commit) works cleanly for stateless resources. Stateful
resources (database schemas, CRD versions, persistent volumes, rotated secrets) require explicit rollback procedures —
reverting the Git commit alone does not revert data-layer changes.

## GitOps Rollback

In a GitOps workflow, rollback is a commit revert — the reconciliation controller sees the previous desired state and
reconciles. This provides:

- **Auditability** — every rollback is a tracked Git operation
- **Speed** — revert + reconciliation completes in seconds
- **Consistency** — the system converges to a known-good state automatically

For critical infrastructure where GitOps SLA (e.g., GitHub's 20-minute SLA) is insufficient for emergency response,
maintain a direct rollback path (e.g., kubectl cron job) as an escape hatch. Pragmatic deviation from pure GitOps for
safety-critical operations is acceptable.
