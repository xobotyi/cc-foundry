# Notification Routing

Contact points, the notification policy tree, grouping, silences, mute timings, and label matchers.

## Contents

- [Architecture](#architecture)
- [Contact points](#contact-points)
- [Notification policy tree](#notification-policy-tree)
- [Routing algorithm](#routing-algorithm)
- [Inheritance](#inheritance)
- [Label matchers](#label-matchers)
- [Grouping and timing](#grouping-and-timing)
- [Silences](#silences)
- [Mute timings](#mute-timings)
- [Inhibition rules](#inhibition-rules)
- [Worked routing example](#worked-routing-example)

---

## Architecture

Grafana Alerting follows the Prometheus split: a **rule evaluator** raises alert instances; an **Alertmanager** turns
them into notifications.

- Each Alertmanager owns its own resources: contact points, templates, policies, silences, mute timings
- Resources cannot be shared across Alertmanagers
- Default deployment uses the built-in Grafana Alertmanager
- External Alertmanagers can be configured via the data source UI; switch via the **Choose Alertmanager** dropdown

## Contact points

Notification destinations.

- One contact point can have multiple **receivers** (integrations)
- Each receiver has a `type` (e.g., `email`, `slack`, `pagerduty`, `webhook`) and type-specific `settings`
- Mute receivers from resolved notifications via `disableResolveMessage: true`
- Secrets (tokens, passwords) go in `secure_settings` (encrypted at rest)
- Contact points reference notification templates via `{{ template "name" . }}` in message fields

Common types: `email`, `slack`, `pagerduty`, `opsgenie`, `webhook`, `teams`, `discord`, `telegram`,
`prometheus-alertmanager`, `googlechat`, `sensugo`, `mqtt`, `victorops`, `dingding`, `kafka`, `line`, `pushover`,
`threema`, `sensu`.

## Notification policy tree

The policy tree decides which contact point handles each alert, how alerts are grouped, and when notifications are sent.

- Single tree resource per Alertmanager — provisioning overwrites it entirely (existing in-UI policies are replaced)
- Root is the **default notification policy** and matches every alert
- Each non-root policy has zero or more **label matchers** narrowing what it handles
- Child policies inherit from their parent (contact point, grouping, timing)
- Sibling order matters — tree evaluates top-down

### Default policy invariants

- Matches all alert instances (no matchers allowed)
- Must specify a contact point — if no child matches, the default handles the alert
- No mute timings (mute timings are not inherited)
- Safety net: no alert is silently lost

## Routing algorithm

For each alert instance:

1. Start at the default policy
2. Evaluate child policies in display order
3. If a child policy's matchers match the alert's labels, recurse into its children
4. Recurse until no child matches — the **deepest matching policy** handles the alert
5. Once a matching policy is found, siblings at the same level are skipped — unless **Continue matching subsequent
   sibling nodes** is enabled on the matched policy (siblings then also handle the alert, producing multiple
   notifications)

If alerts use multiple labels for routing, the corresponding labels must appear in policy matchers — otherwise the
matcher won't fire and the alert falls back to the parent.

## Inheritance

A child policy inherits from its parent unless overridden:

- Contact point
- Grouping (`group_by`, override grouping toggle)
- Timing (group wait, group interval, repeat interval — override general timings toggle)

Mute timings are **not** inherited — declare them on every level that needs them.

## Label matchers

Three parts: **label name**, **operator**, **value**.

- `=` — exact equality
- `!=` — exact inequality
- `=~` — regex match
- `!~` — regex non-match

Multiple matchers combine with AND. To match the absence of a label, use `label=""` or `label!~.+`.

Two equivalent matcher syntaxes in provisioning files:

- **Prometheus-style strings** (`matchers`): `["alertname = Watchdog", "severity =~ \"warning|critical\""]`
- **Grafana object form** (`object_matchers`):
  `[["alertname", "=", "CPUUsage"], ["severity", "=~", "warning|critical"]]`

Use `object_matchers` when label names or values contain spaces, commas, or other characters the Prometheus parser
rejects.

## Grouping and timing

A single notification can bundle many alerts — grouping controls how.

- `group_by` — labels partitioning alerts into groups. `['...']` disables grouping (one notification per alert). Empty
  list groups everything together.
- `group_wait` — delay before sending the first notification for a new group, giving late-arriving alerts a chance to
  join. Default `30s`. Keep small (seconds to a few minutes).
- `group_interval` — delay before sending a follow-up when the group changes (new alerts arrive, alerts resolve).
  Default `5m`. Keep moderate (minutes).
- `repeat_interval` — delay before resending an unchanged group. Default `4h`. Keep long (hours).

The receiving contact point sees one notification with `.Alerts` containing every alert in the group. Use templating
(see `${CLAUDE_SKILL_DIR}/references/templates.md`) to render group content.

## Silences

Silences stop notifications for matching alerts during a fixed time window. They don't stop rule evaluation or alert
state changes — only notification creation.

- Match alerts by labels (same matcher syntax as policies)
- **Fixed start and end time** (mandatory)
- Cannot be permanently deleted before expiry — only **Unsilenced** (ends them immediately)
- Expired silences auto-delete after 5 days (retention not configurable)
- Belong to a specific Alertmanager
- Limits: `alertmanager_max_silences_count` (default 0 = unlimited), `alertmanager_max_silence_size_bytes` (default 0 =
  unlimited)

### Rule-specific silences

Created via the **Silence notifications** UI action on a specific rule. Include matcher `__alert_rule_uid__=<uid>` so
they affect only that rule.

## Mute timings

Mute timings define **recurring** time windows during which notifications are suppressed. Unlike silences:

- Attach to notification policies (each policy lists one or more mute timing names)
- Use cron-like time interval definitions that repeat indefinitely
- **Not inherited** from parent to child policy
- Cannot be applied to the default policy

Time interval shape (Prometheus-compatible):

- `times` — array of `start_time`/`end_time` pairs in 24-hour `HH:MM`
- `weekdays` — names or ranges (`monday`, `monday:wednesday`)
- `months` — names, numbers, or ranges (`1`, `january`, `january:march`)
- `years` — numbers or ranges (`2026`, `2026:2027`)
- `days_of_month` — numbers or ranges (`1:5`, `-3:-1` counts from end of month)
- `location` — IANA timezone (e.g., `UTC`, `Europe/Paris`)

Choose silences for incident-specific or maintenance-window suppression; mute timings for recurring schedules (weekends,
after-hours).

## Inhibition rules

Suppress notifications for **target** alerts when a related **source** alert is already firing. Use to silence
downstream alerts when an upstream root cause is already alerting.

- Defined separately from policies (Alertmanager configuration)
- Match source and target by labels; equal-by labels enforce that source/target share label values

## Worked routing example

Tree shape:

```
default                                          (contact: slack-default)
  ├─ team=security                               (contact: pagerduty-secops)
  ├─ team=platform, severity=~"critical|warning" (contact: pagerduty-platform)
  │   └─ severity=critical                       (contact: pagerduty-platform-oncall)
  └─ team=app                                    (contact: app-team-slack)
```

Routing an alert with labels `{team=platform, severity=critical, service=auth}`:

1. Default matches — descend
2. `team=security` does not match — skip
3. `team=platform, severity=~"critical|warning"` matches — descend
4. `severity=critical` matches — descend
5. No children of the critical policy — **pagerduty-platform-oncall** handles it
6. Sibling `team=app` is not evaluated (continue matching not enabled)

Inheritance: the critical-severity policy uses `pagerduty-platform-oncall` (explicit). Its grouping and timing inherit
from its parent unless overridden.

## Common routing pitfalls

- Missing default contact point — provisioning fails
- Missing `mute_time_intervals` on a child policy that needs it (no inheritance)
- `group_by: ['...']` everywhere — defeats grouping, floods notifications
- `repeat_interval` shorter than `group_interval` — re-notifications collide
- Provisioning a partial policy tree — overwrites the entire tree including unrelated branches
- Routing `DatasourceNoData` / `DatasourceError` through the same policy as the original alert — synthetic alerts have
  different labels and fall through to the default
