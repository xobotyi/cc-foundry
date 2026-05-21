# Alert Rule Evaluation

Detailed reference for alert rule types, evaluation mechanics, and the alert instance state lifecycle.

## Contents

- [Alert rule types](#alert-rule-types)
- [Evaluation groups](#evaluation-groups)
- [Pending period](#pending-period)
- [Keep firing for](#keep-firing-for)
- [State lifecycle](#state-lifecycle)
- [No Data and Error states](#no-data-and-error-states)
- [grafana_state_reason annotation](#grafana_state_reason-annotation)
- [Worked evaluation example](#worked-evaluation-example)

---

## Alert rule types

Grafana supports two alert rule types. The choice determines feature availability, query capabilities, and storage
location.

- **Grafana-managed** — recommended. Queries any Grafana data source supported by alerting, including multiple data
  sources in a single rule. Supports server-side expressions (reduce, math, classic conditions, threshold), images in
  notifications, No Data / Error state handling, multi-dimensional alerts. Stored in Grafana database.
- **Data source-managed** — Prometheus-compatible. Only queries Prometheus-based data sources (Mimir, Loki, Prometheus,
  Cortex). Rules stored in the data source. Required when rules must remain co-located with data for multi-tenant
  Mimir/Loki, when data-source-side scaling is needed, or for migration from Prometheus.

Recording rule support follows the same distinction (see `${CLAUDE_SKILL_DIR}/references/recording-rules.md`).

## Evaluation groups

Every alert rule and recording rule belongs to an evaluation group. The group defines the **evaluation interval** — how
often the rule's query runs.

- Common intervals: `10s`, `30s`, `1m`, `5m`, `10m`
- Rules in the same group can be evaluated **sequentially** (rule N waits for rule N-1) or **concurrently**
- Sequential evaluation lets later rules reference earlier rules' results in the same cycle
- Cross-group ordering is not guaranteed
- Recording rule consumers should match or align their evaluation interval to the producer's interval (stale recorded
  metrics combined with long pending periods produce misaligned alerts)

## Pending period

A buffer that prevents transient threshold breaches from firing.

- When the condition is first met, the alert enters **Pending**
- It remains pending while any subsequent evaluation also meets the condition
- After the pending period elapses with the condition continuously met, the alert transitions to **Alerting**
- Set pending period to `0` to skip Pending entirely and fire immediately
- Pending applies to **Alerting**, **No Data**, and **Error** transitions equally

## Keep firing for

Suppresses repeated firing → resolving → firing cycles caused by flapping conditions.

- When the firing condition stops being met, the alert enters **Recovering** (not Normal)
- If the condition fires again during Recovering, the alert returns to Alerting silently (no new notification)
- After the keep-firing-for period elapses without the condition being met, the alert transitions to **Normal
  (Resolved)** and a resolved notification is sent
- Set to `0` to skip Recovering and resolve immediately

## State lifecycle

An alert instance can be in one of these states:

- **Normal** — no condition is met
- **Pending** — a condition (threshold, No Data, or Error) has been met but the pending period has not elapsed
- **Alerting** — the threshold breach persisted through the pending period; notifications routed
- **Recovering** — was firing, condition no longer met, but keep-firing-for has not elapsed
- **No Data** — query returned no data points after the pending period (Grafana-managed only)
- **Error** — query failed or timed out after the pending period (Grafana-managed only)

### Transitions that route notifications

Only two transitions cause notifications to be sent:

- **→ Alerting** (entering the firing state)
- **→ Normal** marked `Resolved` (entering Normal from Alerting or Recovering)

### Reset on rule change

If an alert rule is modified — except annotation, evaluation-interval, or other internal-field-only changes — all
instances reset to **Normal** and re-evaluate on the next cycle. Renaming a templated label produces a new instance (old
one becomes stale).

## No Data and Error states

Supported only for Grafana-managed alert rules. Configuration is per-rule.

### Error state

Triggered when query evaluation fails or times out.

- Default evaluation timeout: `30s` (`evaluation_timeout`)
- Default retry count: `3` (`max_attempts`)
- Honors pending period: `Normal → Pending → Error`
- Default behavior creates a synthetic `DatasourceError` alert with labels `alertname=DatasourceError`,
  `datasource_uid`, `rulename`

### No Data state

Triggered when query runs successfully but returns no series.

- Honors pending period: `Normal → Pending → No Data`
- Default behavior creates a synthetic `DatasourceNoData` alert with the same label shape as DatasourceError

### Configurable behavior per rule

For both "no data" and "error" outcomes, independently choose one of:

- **Set No Data / Error state** (default) — generate the synthetic `DatasourceNoData` / `DatasourceError` alert
- **Set Alerting state** — treat as a threshold breach; original alert instance enters Alerting
- **Set Normal state** — treat as Normal; no alert raised
- **Keep last state** — preserve previous state (mitigates flapping during transient data source issues at the cost of
  missing prolonged outages)

When set to **Alerting** or **Normal**, Grafana preserves the latest known fields under notification `Values`,
substituting `-1` for the unmeasurable measured value.

### Synthetic alerts are independent

`DatasourceNoData` and `DatasourceError` instances have different labels from the original alert. Silences, mute
timings, and policies matching the original by labels may not match these synthetic alerts. Route them explicitly:

- Build a notification policy matching `alertname=DatasourceError` (or `DatasourceNoData`)
- Group by `datasource_uid` to collapse error storms from a single failing data source

If the alert rule sends to a contact point directly (bypassing policies), the synthetic alerts go to the same contact
point.

### Reducing No Data / Error alert volume

- Prefer **Keep last state** when transient data source flakiness is the main cause
- For No Data, widen the query time range — but watch for evaluation timeouts on the wider range
- Increase the pending period to suppress short outages
- Use a dedicated notification policy with `alertname=DatasourceError` grouping
- Adjust `evaluation_timeout` / `max_attempts` as a last resort (affects all rules)

## grafana_state_reason annotation

Added to the notification payload whenever the evaluation outcome differs from the visible alert state. Use it to
explain unexpected transitions.

- `No Data` — no-data handling routed to a non-No-Data state (e.g., Normal)
- `Error` — error handling routed to a non-Error state
- `Paused` — rule paused
- `RuleDeleted` — rule deleted while instance was firing
- `Updated` — rule modified in a way that resets instances
- `MissingSeries` — stale instance (series disappeared) transitioned Alerting → Normal

## Worked evaluation example

Rule: evaluation interval 30s, pending period 90s, keep firing for 0s.

| Time  | Condition | State           | Pending counter |
| ----- | --------- | --------------- | --------------- |
| 00:30 | not met   | Normal          | —               |
| 01:00 | breached  | Pending         | 0s              |
| 01:30 | breached  | Pending         | 30s             |
| 02:00 | breached  | Pending         | 60s             |
| 02:30 | breached  | Alerting (sent) | 90s             |
| 03:00 | not met   | Resolved (sent) | 120s            |
| 03:30 | not met   | Normal          | 150s            |

If keep-firing-for were `60s`, the Alerting→Normal transition at 03:00 would instead enter Recovering, and the resolved
notification would be deferred until 04:00 (or skipped entirely if the condition fired again during Recovering).

## Common evaluation pitfalls

- Pending period too short — single bad sample fires; use multiples of the evaluation interval
- Evaluation interval longer than pending period — pending may complete in a single evaluation
- Forgetting No Data / Error honors pending — instances disappear briefly during deploys without sending the expected
  DatasourceNoData notification
- Using a recording rule with a long interval (e.g., 1h) as input to an alert with a short pending period — alert
  evaluates against stale recorded data
- Templating labels with query values — every value change creates a new alert instance and orphans the previous one as
  stale
