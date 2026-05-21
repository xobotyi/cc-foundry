---
name: alerting
description: >-
  Grafana unified alerting: rule types, evaluation lifecycle, state transitions, notification policies, contact points,
  silences, mute timings, recording rules, and alert/notification templates. Invoke whenever task involves any
  interaction with Grafana alerting — creating or editing alert rules, configuring contact points and routing,
  templating annotations or notifications, debugging alert state, or reviewing alerting configuration.
---

# Grafana Alerting

Alert on symptoms, route to the right team, suppress noise without losing signal. Grafana unified alerting splits the
job in two halves: a **rule evaluator** raises alert instances; an **Alertmanager** turns them into notifications. Get
the split right at design time to avoid notification storms, missed pages, and silent failures.

## References

- **Rule evaluation** — [`${CLAUDE_SKILL_DIR}/references/rule-evaluation.md`] Rule types (Grafana-managed vs
  data-source-managed), evaluation groups, pending period, keep firing for, full state lifecycle, No Data / Error
  configuration, `grafana_state_reason` annotation, worked example
- **Notification routing** — [`${CLAUDE_SKILL_DIR}/references/notification-routing.md`] Alertmanager architecture,
  contact points, policy tree, routing algorithm, inheritance, label matchers, grouping/timing, silences, mute timings,
  inhibition rules, worked routing example
- **Templates** — [`${CLAUDE_SKILL_DIR}/references/templates.md`] Annotation/label templates vs notification templates,
  Go `text/template` essentials, available variables (`$labels`, `$values`, `.Alerts`), notification data shape,
  built-in functions (collection, data, template, time), worked examples
- **Data-source-managed rules** — [`${CLAUDE_SKILL_DIR}/references/recording-rules.md`] Mimir/Loki/Prometheus alert and
  recording rules: prerequisites, UI workflow, YAML rule shape, namespaces and groups, sequential evaluation pattern,
  restrictions vs Grafana-managed, naming, alerting-on-recorded-metrics alignment, Loki rule files + lokitool, Mimir
  managed rules

## Alert rule design

### Choose the rule type

- **Grafana-managed** (default) — multi-data-source queries, server-side expressions (reduce, math, threshold, classic),
  images in notifications, No Data / Error state handling, multi-dimensional alerts
- **Data source-managed** — Prometheus-compatible (Mimir, Loki, Prometheus). Rules stored in the data source. Use when
  rules must live alongside data (multi-tenant Mimir/Loki) or for Prometheus migration

### Alert on symptoms, not causes

- **Online-serving** — alert on high error rate, high latency, request availability
- **Offline processing** — alert on slow throughput, stuck queues, missing heartbeat timestamps
- **Batch jobs** — alert when job has not succeeded recently enough (≥ 2× normal cycle)
- **Capacity** — alert when resource exhaustion is imminent

Page on user-visible impact at one point in the stack. Don't page on a slow sub-component if overall user latency is
fine — use dashboards to localize causes after a page fires. Remove alerts with no actionable response.

### Set evaluation parameters intentionally

- **Evaluation interval** — match query cost and incident response speed. Common: `30s`–`5m`.
- **Pending period** — long enough to absorb transient breaches, short enough to fire before the user notices. Usually
  3–10× the evaluation interval.
- **Keep firing for** — non-zero only when flapping is a real problem. Defers resolved notifications.
- **Sequential evaluation** when an alert depends on a recording rule in the same group.

### Configure No Data and Error explicitly

Grafana-managed rules control what happens when the query returns no data or fails. Don't accept the default silently —
pick one:

- **Set No Data / Error** (default) — creates synthetic `DatasourceNoData` / `DatasourceError` alerts with labels
  `alertname`, `datasource_uid`, `rulename`. Route through dedicated notification policies.
- **Set Alerting** — treat as a fire. Use when no-data means broken instrumentation that itself is the alert.
- **Set Normal** — treat as healthy. Use only when no-data is expected.
- **Keep last state** — preserve previous state. Mitigates transient data source flakiness; risks missing real outages
  if the data source stays down.

Synthetic alerts have **different labels** than the original rule's alerts. Silences, mute timings, and policies that
match the original by labels won't match synthetic alerts without explicit `alertname` matchers.

### Multi-dimensional alerts

One rule generates one alert instance per series returned by the query. Different instances of the same rule can be in
different states simultaneously. Plan label cardinality before deploying — high cardinality multiplies notifications.

## State lifecycle

Six states for any alert instance:

- **Normal** — no condition met
- **Pending** — condition met, pending period not elapsed
- **Alerting** — condition met past the pending period (notifications routed)
- **Recovering** — was Alerting, condition no longer met, keep-firing-for not elapsed
- **No Data** — query returned no series past the pending period (Grafana-managed only)
- **Error** — query failed past the pending period (Grafana-managed only)

Only two transitions emit notifications:

- → **Alerting** (entering firing)
- → **Normal** marked Resolved (leaving firing via Recovering or directly)

If a rule is modified (except annotations / evaluation interval / internal fields), all instances reset to Normal and
re-evaluate on the next cycle. Templated labels that change value orphan the previous instance as stale.

## Notification routing

### Contact points

Notification destinations. One contact point may have multiple receivers (integrations: `email`, `slack`, `pagerduty`,
`opsgenie`, `webhook`, etc.).

- Receiver type and settings determine the integration
- Put secrets in `secure_settings` (encrypted at rest), config in `settings`
- Use `disableResolveMessage: true` on receivers that shouldn't get resolved notifications

### Policy tree

The policy tree decides which contact point handles each alert, how alerts are grouped, and when notifications are sent.

- Single tree per Alertmanager — provisioning overwrites it entirely
- Root is the **default policy**: matches all alerts, has a contact point, no matchers, no mute timings
- Each non-root policy has zero or more **label matchers**: `=`, `!=`, `=~`, `!~` (multiple combine with AND)
- Routing is top-down, deepest-match-wins. Once a policy matches, siblings are skipped unless **Continue matching
  subsequent sibling nodes** is enabled.
- Children **inherit** contact point, grouping, and timing from their parent. Override per child as needed.
- Mute timings are **not inherited** — declare on every level that needs them.

### Grouping and timing

- `group_by` — labels that partition alerts into notification groups. `['...']` disables grouping. Default groups by
  alert rule.
- `group_wait` — first-notification delay for a new group (default `30s`)
- `group_interval` — delay before sending a follow-up for the same group when it changes (default `5m`)
- `repeat_interval` — delay before re-sending an unchanged group (default `4h`)

Keep `repeat_interval` ≥ `group_interval` to avoid re-notification collisions.

### Silences vs mute timings

- **Silence** — fixed start/end time, label matchers. For incident-specific or maintenance-window suppression.
  Auto-deleted 5 days after expiry. Cannot be deleted before expiry; only Unsilenced (ends immediately).
- **Mute timing** — recurring time intervals attached to a notification policy. For predictable schedules (weekends,
  after-hours). Shape: `times`, `weekdays`, `months`, `years`, `days_of_month`, `location`.

Silences don't stop rule evaluation — only notification creation. The alert still appears in the UI and history.

## Templates

Two kinds. Don't confuse them — variables and scope differ.

### Annotation and label templates (alert rule level)

Inline Go template expressions in the rule's `annotations` and `labels` maps. Evaluated each rule evaluation, per alert
instance.

- `$labels` — alert's label set
- `$values` — query/expression values keyed by refId (e.g., `$values.A.Value`)
- `$value` — value of the condition expression
- Visible in the Grafana UI, alert history, **and** notifications

### Notification templates (Alertmanager level)

Reusable `{{ define "name" }}...{{ end }}` blocks in a notification template group. Referenced from contact point fields
as `{{ template "name" . }}`. Evaluated at notification time with the group context.

- `.Alerts`, `.Alerts.Firing`, `.Alerts.Resolved` — alert arrays
- `.GroupLabels`, `.CommonLabels`, `.CommonAnnotations` — group-level KV maps
- `.Status`, `.Receiver`, `.ExternalURL`, `.GroupKey`
- Per-alert: `.Labels`, `.Annotations`, `.StartsAt`, `.EndsAt`, `.Status`, `.Fingerprint`
- Grafana-managed-only per-alert fields: `.DashboardURL`, `.PanelURL`, `.SilenceURL`, `.Values`, `.ValueString`,
  `.OrgID`

### Rule of thumb

- Must appear in the Grafana UI (alert state, history) and notifications → **annotation**
- Affects routing (severity, team) → **label**
- Formatting for one specific contact point → **notification template**

Never template a label with a query _value_ — the value change creates a new alert instance and orphans the previous one
as stale. Templating labels with mapped/bucketed query values (e.g., severity tiers) is safe.

## Recording rules

Pre-compute frequently used or expensive queries; write the result as a new time series.

- Naming convention: `level:metric:operations` (e.g., `job:http_requests:rate5m`). Colons are reserved for recording
  rules.
- Single value per evaluation — use an instant query or a range query + Reduce expression
- Alert-on-recorded-metric: align the alert's evaluation interval with the recording rule's interval. Mismatches produce
  stale evaluations.
- Use `_over_time` instant queries (`max_over_time(my_metric[5m])`) instead of range + Reduce when feasible — alerts run
  as instant queries anyway.
- Aggregate ratios correctly: record numerator and denominator separately, divide at query time. Never average a ratio.

For Loki, rule files use Prometheus-compatible YAML and the Loki ruler writes recorded metrics to a remote-write
endpoint. Manage with `lokitool` (or Cortex predecessor for Loki < 3.1).

## Application

When **designing** an alert rule:

- Choose Grafana-managed unless data-source-managed is required
- Alert on user-visible symptoms
- Set pending period to 3–10× the evaluation interval
- Configure No Data / Error explicitly — don't accept defaults silently
- Keep label cardinality bounded; templated labels never use query values
- If a recording rule exists for the expression, alert against the recorded metric (align intervals)

When **designing** notification routing:

- Default policy has a fallback contact point and matches everything
- One policy per team/responsibility tier; child policies refine within a team
- Use `group_by` to bundle related alerts; avoid `['...']` except for very-low-volume rules
- Add explicit `alertname=DatasourceError` / `DatasourceNoData` policies so synthetic alerts don't fall through
- Mute timings on every level that needs them (no inheritance)

When **writing** templates:

- Annotations for descriptive info, labels for routing, notification templates for per-channel formatting
- Use `$labels` / `$values` directly in annotation/label templates (don't rely on `.`)
- Use whitespace stripping (`{{-` / `-}}`) in multi-line ranges to avoid blank-line output
- Don't override default template names (`__subject`, `default.title`, `default.message`) unintentionally

When **reviewing** alerting configuration:

- Cite the specific issue and the fix inline (e.g., "rule X pending period 0 — set to 3m to absorb scrape jitter")
- Check synthetic No Data / Error alerts have a routing destination
- Check label cardinality from templated labels is bounded
- Check the policy tree's default has a contact point (otherwise provisioning fails)
- Check `repeat_interval ≥ group_interval`

## Integration

The **provisioning** skill (sibling) governs how to _deploy_ these resources (file provisioning, HTTP API, Terraform,
gcx). This skill governs _what_ the resources should contain and _how_ they behave at runtime.

The **prometheus**, **logsql/metricsql** language skills cover the _query expressions_ used inside alert rules. This
skill covers everything around the query — state, routing, templates.

The **dashboards** skill (sibling) covers panel configuration; this skill does not. Link dashboard URLs from alerts via
the Dashboard UID / Panel ID annotations and the `.DashboardURL` / `.PanelURL` notification template fields.
