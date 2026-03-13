# Observability and Monitoring

Principles for making infrastructure observable, drawn from Google SRE practices and
industry standards.

## Monitoring vs Observability

Monitoring and observability are related but distinct. Monitoring is reactive — it uses
predefined metrics and thresholds to detect known failure modes after they occur.
Observability is proactive — it allows inferring the internal state of a system from its
outputs to identify and address issues before they impact users, including "unknown
unknowns" that monitoring alone cannot catch.

**When to use each:**
- **Monitoring alone** is sufficient for simple, standalone systems where failure modes
  are well-understood and dashboards with alerts cover the operational needs
- **Observability** is required for distributed systems, microservices, multi-cloud, or
  cloud-native environments where the interaction between components creates emergent
  failure modes that predefined metrics cannot anticipate

In practice, monitoring is a subset of observability. Use both together: monitoring for
real-time alerting on known conditions, observability for root cause analysis and
proactive detection.

## Three Pillars of Observability

The three primary telemetry types that enable observability:

- **Metrics** — quantitative measurements of system behavior over time (CPU usage,
  request rate, error count). Cheap to collect, good for alerting and trend analysis
- **Logs** — timestamped records of discrete events. Provide context for debugging
  specific incidents. Emit to stdout as structured event streams (12-factor)
- **Traces** — records of a request's path through distributed components. Essential
  for understanding latency and failures across service boundaries

Some frameworks extend these to **MELT** (Metrics, Events, Logs, Traces) by adding
events — significant state changes that may not appear in regular log streams.

**Sampling considerations:** Volume reduction through sampling is necessary at scale,
but "sample-before-analysis" strategies risk discarding data before its diagnostic value
is known. Use tail-based sampling (retain traces based on execution characteristics like
latency or error status) rather than head-based sampling (random discard before
execution). Where possible, adopt post-analysis-aware sampling — analyze the full data
stream before making retention decisions. At 2.5% sampling rate, post-analysis-aware
approaches capture 71% of critical traces vs 43% for head-based methods.

## The Four Golden Signals

From Google SRE: if you can only measure four metrics, measure these.

| Signal | What it measures | Example |
|--------|-----------------|---------|
| **Latency** | Time to service a request | HTTP response time, DNS resolution time |
| **Traffic** | Demand on the system | Requests/sec, network I/O, concurrent connections |
| **Errors** | Rate of failed requests | HTTP 5xx rate, failed health checks, timeout rate |
| **Saturation** | How "full" the system is | CPU %, memory %, disk %, queue depth |

**Latency:** Distinguish between successful and failed request latency. A fast error is
still an error. A slow error is worse than a fast error. Track error latency separately.

**Saturation:** Many systems degrade before 100% utilization. Set utilization targets below
the cliff. Latency increases are often a leading indicator of saturation. Monitor the 99th
percentile, not the average — the average hides tail latency problems.

## Service Level Framework

**SLI (Service Level Indicator)** — a quantitative measure of service level. Choose SLIs
based on what users care about, not what's easy to measure. Common SLIs by service type:

- User-facing: availability, latency, throughput
- Storage: latency, availability, durability
- Batch/pipeline: throughput, end-to-end latency
- Infrastructure: resource accessibility, health metrics (CPU, memory, disk I/O)
- All systems: correctness

**Infrastructure vs application SLOs:** Infrastructure SLOs measure resource availability
and health (e.g., "VM reachable via SSH 99.99% of time"). Application SLOs measure user
experience (e.g., "99% of requests < 100ms"). Infrastructure SLOs must be stricter than
application SLOs they support — infrastructure failures cascade to all dependent services.

**SLO (Service Level Objective)** — a target value for an SLI. Structure: SLI <= target.
Example: "99% of GET requests complete in < 100ms."

- Start loose, tighten over time — easier than relaxing an aggressive target
- Use percentiles, not averages — averages hide tail behavior
- Define separate SLOs for different workload classes if needed
- SLOs drive prioritization: if the SLO is met, invest elsewhere
- Use multiple thresholds to capture the long tail (e.g., 90% < 400ms AND 99% < 800ms)
- Never set 100% targets — it prevents innovation and is prohibitively expensive
- Review SLO definitions regularly; 54% of organizations with SLOs never reevaluate them

**Error budget** — the gap between 100% and the SLO. A 99.9% SLO means a 0.1% error
budget. Error budgets provide a shared incentive: as long as budget remains, ship features.
When budget is low, invest in reliability. When exhausted, implement a feature freeze
(30-day freeze is a common policy) and dedicate resources to reliability fixes.

**SLO-driven toil management:** Use SLOs to make data-driven decisions about operational
work. Ignore certain tasks if doing so does not consume the error budget. Organizations
prioritizing SLOs report reduced MTTR (33%) as the top outcome achieved.

## Monitoring Principles

**Symptoms over causes.** Monitor what's broken (symptoms), not why (causes). "HTTP 500
rate is high" is a symptom. "Database connections exhausted" is a cause. Alert on symptoms;
use causes for debugging.

**Every alert must be actionable.** If a page fires and the response is "ignore it," the
alert is noise. Alert fatigue is the primary obstacle to fast incident response at nearly
all organizational levels. Criteria for a valid alert:
- Detects an otherwise undetected condition
- Is urgent and user-visible (or imminently so)
- Requires human intelligence to resolve
- Cannot be safely automated (yet)

**Simplicity over sophistication.** Avoid complex dependency hierarchies and magic
threshold detection. Simple rules that catch real incidents are better than ML-based
anomaly detection that produces false positives. Keep the paging path simple and
comprehensible.

**Use distributions, not averages.** Averages hide tail latency. Collect histogram
buckets and use percentiles (p50, p95, p99, p99.9). A system with 100ms average
latency might have 5% of requests taking 5 seconds.

**Observability as code.** Dashboards, alerts, SLOs, and notification policies should
live in Git and deploy via CI/CD (e.g., Terraform for Grafana, Prometheus rules in
version control). This provides version control, review, rollback, and parity across
environments.

## Common Observability Gaps

Gaps frequently discovered only after an outage:

- **Configuration drift** — manual changes to production not reflected in code. Less
  than one-third of organizations continuously monitor for drift
- **Machine identity blindspots** — ungoverned API keys, certificates, and service
  tokens (IAM teams manage only 44% of machine identities on average)
- **Sampling bias** — critical traces and logs discarded before diagnostic value is
  known, leaving engineers unable to diagnose intermittent failures
- **IaC security misconfigurations** — 63% of cloud security incidents stem from
  misconfigurations discovered only after breach or data exposure
- **Retrospective compliance** — manual, time-lagged compliance assessments that fail
  to keep pace with continuous code changes

## Toil and Automation

From Google SRE's definition, toil is operational work that is:
- Manual (requires human touch)
- Repetitive (done over and over)
- Automatable (a machine could do it)
- Tactical (interrupt-driven, not strategic)
- Without enduring value (system unchanged after completion)
- O(n) with service growth

**Target: <50% of time on toil.** The rest should be engineering work that permanently
improves the system. If toil exceeds this threshold, the team must step back and automate.

**Toil reduction patterns (by impact):**
1. **Self-service interfaces** — move 80-90% of requests to self-service via web forms,
   APIs, scripts, or PRs to configuration files. The "human interface to computing
   resources" pattern is the most common source of toil
2. **Automated remediation** — convert rote incident responses into executable code
   (runbook automation). Links monitoring alerts directly to remediation scripts
3. **GitOps reconciliation** — eliminate manual drift correction through continuous
   pull-based reconciliation
4. **SLO-driven rejection** — use error budgets to make data-driven decisions about
   which operational tasks to defer or eliminate
5. **Snowflake melting** — retool automation to handle edge cases, or modify
   nonconforming resources to match standard expectations. Automation craves conformity

**Automation priority:** If a manual response to an alert is always the same sequence of
steps, that response must be automated. Pages with rote, algorithmic responses are a red
flag indicating insufficient automation.

## DORA Metrics

Five software delivery performance metrics that predict organizational performance:

**Throughput:**
- **Change lead time** — committed to deployed
- **Deployment frequency** — how often you deploy
- **Failed deployment recovery time** — time to recover from a bad deploy

**Stability:**
- **Change fail rate** — ratio of deployments requiring rollback/hotfix
- **Deployment rework rate** — ratio of unplanned deployments from incidents

Key insight: speed and stability are not trade-offs. Top performers excel at both.
These metrics apply regardless of technology stack.

## Incident Response Patterns

**Blameless postmortems.** Focus on system flaws, not human error. Document: timeline,
root cause, contributing factors, action items. Criteria for effective postmortems:
- "Things that went poorly" — no individual blamed
- Root cause focuses on "what" not "who"
- Action items improve the system, not the people
- Explore impact across multiple teams, not just proximate area

**Postmortem triggers:** Error budget depletion, customer-visible outage, manual
intervention required, or monitoring failure (incident detected by humans, not alerts).

**Self-healing automation:** Implement closed-loop remediation where detection triggers
codified runbooks. Pattern: detect anomaly → verify against error budget → execute
automated fix (rollback, scale, toggle feature flag) → monitor SLIs for 5 minutes →
mark resolved or escalate. Every automated action must include a rollback path, audit
log, and human override ("escape hatch").

**Centralized runbook repositories.** Store all runbooks in a unified, version-controlled
repository organized by service domain with tagging by severity and environment.
Organizations implementing centralized runbook libraries report 35% reduction in MTTR.
