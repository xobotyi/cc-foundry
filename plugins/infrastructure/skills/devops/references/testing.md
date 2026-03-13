# Infrastructure Testing

Testing strategies for infrastructure code, adapted from the software testing pyramid to infrastructure-as-code
realities.

## The Infrastructure Testing Pyramid

Faster, cheaper tests form the base. Slower, more expensive tests at the top. Run all layers, but weight toward the
base.

### Layer 1: Static Analysis (Base)

Analyze IaC code without deploying anything. Catches syntax errors, style violations, security misconfigurations, and
policy violations early.

- **Syntax validation** — `terraform validate`, `ansible-lint`, `yamllint`
- **Linting** — enforce style consistency and catch common mistakes. For Ansible, `ansible-lint` profiles progress
  through quality levels: `min` (syntax only) → `basic` (best practices) → `moderate` (formatting, FQCN, idempotency) →
  `safety` (permissions, `no_log`) → `shared` (documentation) → `production` (reliability + maintainability). Target
  `production` for any code managing real infrastructure
- **Security scanning** — `tfsec`, `checkov`, `trivy`, `kics` — scan for known misconfigurations (open security groups,
  unencrypted storage, public endpoints). Research identifies 62 categories of security smells across IaC tools — static
  analysis catches the most common (hardcoded secrets, overly permissive IAM, insecure defaults)
- **Policy as code** — Open Policy Agent (OPA), Kyverno CLI, HashiCorp Sentinel, Pulumi CrossGuard — enforce
  organizational policies (naming conventions, required tags, allowed regions, container registry restrictions)

**Run on every commit.** Static analysis is fast and cheap. No reason to skip it. Integrate policy checks as pre-merge
validation in CI pipelines — catch violations during the PR, not after deployment.

### Layer 2: Unit Tests

Test individual modules or roles in isolation without deploying real infrastructure. Use mocks to simulate provider
responses.

- Test that a Terraform module produces the expected plan output
- Test that an Ansible role sets the expected variables and tasks
- Test configuration generation logic (templates, variable interpolation)
- Verify resource properties match expectations before deployment

**Fast feedback loop.** Unit tests run in seconds. Use them during development for rapid iteration.

### Layer 3: Integration Tests

Deploy real infrastructure to a test environment and verify it works. The most valuable but most expensive layer.

- Deploy to an ephemeral environment (dedicated test account/project)
- Verify resources are created with correct properties
- Test connectivity between components (can service A reach service B?)
- Validate that deployed infrastructure serves its intended purpose
- **Always destroy test infrastructure after tests complete**

**Run on pull requests and before releases.** Too expensive for every commit. Too important to skip before deployment.

### Layer 4: End-to-End Tests (Top)

Test the complete system under realistic conditions. Performance testing, load testing, failure injection.

- Full stack deployment matching production topology
- Load testing to verify capacity and identify bottlenecks
- Chaos testing to verify resilience (kill nodes, partition networks)
- DR testing to verify recovery procedures work

**Run periodically and before major releases.** Expensive in both time and infrastructure cost. Schedule regularly,
don't defer indefinitely.

## Testing Principles

- **Test the plan, not just the apply.** Review what Terraform/Pulumi will do before it does it. The plan diff is the
  first integration test.
- **Test idempotency explicitly.** Apply configuration twice. The second apply must produce zero changes. If it doesn't,
  the configuration is not idempotent.
- **Test destruction.** Verify that teardown is clean. Resources left behind after destroy are cost leaks and security
  risks.
- **Test rollback.** Deploy version N+1, then roll back to version N. Verify the system works correctly after rollback.
  Note: rollbacks for stateful resources (database schemas, persistent volumes, rotated secrets) require special
  handling — reverting a Git commit does not always revert data-layer changes cleanly.
- **Test with realistic data.** Test environments with trivial data miss problems that only appear at realistic scale or
  with realistic data patterns.

## IaC Quality Metrics

**Metrics that correlate with operational reliability:**

- **Security smell density** — count of detected security smells per module. Track trend over time; rising density
  indicates accumulating technical debt
- **Linter compliance level** — which quality profile the code passes cleanly. `production` profile for Ansible includes
  reliability and maintainability rules beyond basic syntax
- **Idempotency pass rate** — percentage of applies that produce zero changes on second run. Target: 100%
- **Change frequency vs test coverage** — high churn without corresponding tests is a leading indicator of defects
  (product-based features better identify misconfigurations than process metrics alone)
- **Drift detection rate** — how often actual state diverges from declared state. Less than one-third of organizations
  continuously monitor drift

**Complexity metrics for IaC:** Cyclomatic complexity and maintainability index can identify overly complex modules, but
their effectiveness varies significantly across tools. Standardize which tool measures complexity and automate checks in
CI/CD.

## Runbook Format

Runbooks are the primary operational documentation artifact. Structure every runbook with these sections:

- **Trigger condition** — what alert or event initiates this runbook
- **Pre-conditions** — what must be true before starting
- **Step-by-step commands** — copy-pasteable, not prose descriptions
- **Verification steps** — how to confirm success at each stage (success checks)
- **Expected duration** — how long each step and the overall procedure takes
- **Rollback procedure** — what to do if a step fails
- **Escalation contacts** — who to reach when the runbook isn't enough
- **Owner** — who maintains this runbook and is responsible for keeping it current

For the full list of required documentation per infrastructure component, see the Documentation Standards section in the
parent skill.

## Runbook Automation Maturity

Runbooks exist on a spectrum from fully manual to fully automated. Target higher maturity levels for repetitive,
high-frequency procedures.

| Level               | Description                                                | When to use                                    |
| ------------------- | ---------------------------------------------------------- | ---------------------------------------------- |
| **Manual**          | Procedural documentation, human executes every step        | Novel or rare procedures, initial drafts       |
| **Semi-automated**  | Executable scripts with human oversight at decision points | Procedures with judgment calls or approvals    |
| **Fully automated** | Event-driven execution, no human intervention              | Rote responses to known alerts, scaling events |

**Automation patterns:**

- **Event-driven triggers** — monitoring detects a condition (e.g., pod in error state), triggers remediation script
  automatically
- **GitOps reconciliation** — desired state in Git, drift auto-corrected by reconciliation agents
- **Self-service workflows** — operational tasks exposed as on-demand executable code through internal platforms or CLI
  tools
- **CI/CD integration** — runbook steps embedded directly in the deployment pipeline
- **Alert-to-runbook linking** — monitoring alerts automatically present the corresponding runbook with pre-filled
  commands to the on-call engineer

**Success checks and permission gates.** Automated runbooks must enforce validation before allowing actions. Use
RBAC-scoped groups to control who can trigger which runbooks. Every automated execution produces an audit trail for
post-execution review.

**Centralized runbook repository.** Store all runbooks in a unified, version-controlled repository organized by service
domain. Tag by severity, function (networking, database, CI/CD), and environment (staging, production). Organizations
implementing centralized runbook libraries report 35% reduction in MTTR.

**Start manual, then automate.** Write the manual runbook first. Run it several times to identify failure modes and edge
cases. Only then convert to automation — automating an untested procedure automates its bugs. Test runbooks during chaos
engineering drills to validate they are current and effective.

## Incident Response Patterns

**Closed-loop automated remediation:** Detection triggers codified response via orchestration tools (StackStorm,
Rundeck, Temporal). Pattern:

1. Monitoring detects anomaly or threshold breach
2. Decision gate: Is automated remediation safe? (check error budget, safety flags)
3. Execute remediation: rollback, scale, toggle feature flag, clear cache
4. Validate: monitor SLIs for defined period (typically 5 minutes)
5. If within thresholds → mark resolved; otherwise → escalate to human
6. Post-incident: record automation event, review in next postmortem

**Safety requirements for automated remediation:**

- **Idempotence** — automation must run safely multiple times without side effects
- **Safety constraints** — do not auto-remediate during known high-risk periods (traffic spikes, maintenance windows)
  without human override
- **Rollback path** — every automated action includes a reversal mechanism
- **Human override** — ability to abort automatic flow and revert to manual mode
- **Audit logs** — record what triggered remediation, what actions were taken, why
