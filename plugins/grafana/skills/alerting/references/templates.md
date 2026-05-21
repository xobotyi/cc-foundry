# Templates

Annotation/label templates (alert rule templates) and notification templates. Both use Go `text/template` but with
different available variables and scope.

## Contents

- [Two template types](#two-template-types)
- [Go template language essentials](#go-template-language-essentials)
- [Annotation and label templates](#annotation-and-label-templates)
- [Notification templates](#notification-templates)
- [Notification template data](#notification-template-data)
- [Built-in functions](#built-in-functions)
- [Worked examples](#worked-examples)

---

## Two template types

| Aspect             | Annotation/label templates                         | Notification templates                                |
| ------------------ | -------------------------------------------------- | ----------------------------------------------------- |
| Scope              | Single alert instance                              | Group of alerts in one notification                   |
| Defined in         | Alert rule (`annotations`, `labels` map fields)    | Notification template group resource                  |
| Dot (`.`)          | All alert data (use `$labels`/`$values` directly)  | Notification Data (alert group)                       |
| Reusable templates | No — each annotation/label is an inline expression | Yes — `{{ define }}` blocks reusable across receivers |
| Evaluated when     | Alert fires (each evaluation)                      | Notification is sent                                  |
| Affects state      | Yes — label templates change the alert's identity  | No — purely cosmetic                                  |
| Visible where      | Alert state UI, alert history, notifications       | Notifications only                                    |

When information must be visible in the Grafana UI and alert history, put it in annotations (rule-level). When it only
needs to appear in the notification message, put it in a notification template.

## Go template language essentials

Both template types use [`text/template`](https://pkg.go.dev/text/template) syntax.

- `{{ ... }}` — emit value
- `{{ if cond }}...{{ else }}...{{ end }}` — conditional
- `{{ range $array }}...{{ end }}` — iterate; dot inside is the current element
- `{{ range $i, $v := $array }}...{{ end }}` — iterate with index
- `{{ with $expr }}...{{ end }}` — like `if` but rebinds dot to `$expr`
- `{{ define "name" }}...{{ end }}` — define a sub-template
- `{{ template "name" . }}` — execute a sub-template with the given context
- `{{- ... -}}` — strip whitespace and newlines on either side
- `{{/* comment */}}` — comment

Comparison: `eq`, `ne`, `lt`, `le`, `gt`, `ge`. Logical: `and`, `or`, `not`. Loop control: `break`, `continue`.

## Annotation and label templates

Inline expressions in the alert rule's `annotations` and `labels` maps.

### Available variables

- `$labels` — alert's label set (map of strings)
- `$values` — values of expressions in the alert rule, keyed by query/expression `refId`
- `$value` — convenience for the value of the alert condition (the final expression)
- `.` — same as the rule context (prefer `$labels` / `$values`)

Access patterns:

- `{{ $labels.instance }}` or `{{ index $labels "instance" }}` — label by name
- `{{ $values.A.Value }}` — numeric value of expression `A`
- `{{ index $values "A" }}` — alternative access

### Templating labels — caution

Labels uniquely identify alert instances. Changing a label's value changes the instance identity.

- If a templated label's value changes between evaluations, the previous instance becomes **stale** (transitions to
  Normal with `grafana_state_reason=MissingSeries`) and a new instance is created
- Avoid templating labels with query _values_ (use annotations instead)
- Templating labels with query _labels_ (mapping or transforming existing labels) or bucketed classifications (severity
  tiers — `critical` / `warning` / `info`) is safe

### Annotations vs labels — what goes where

- **Annotation** — descriptive data that varies across notifications without affecting identity (summary, description,
  runbook URL, dashboard link, value at fire time)
- **Label** — routing dimensions and identifying tags (severity, team, service, environment) — keep cardinality low

## Notification templates

Reusable blocks in a **notification template group** resource. Each group has a `name` and `template` body holding one
or more `{{ define "name" }}...{{ end }}` blocks.

- Reference templates from contact-point fields via `{{ template "name" . }}`
- Templates evaluate at notification time with the notification data as context
- Avoid duplicate template names — Grafana doesn't error on collisions, behavior is unspecified

### Standard template names to avoid overriding

- `__subject` — default subject
- `__text_values_list`
- `__text_alert_list`
- `default.title`
- `default.message`

Call these inside custom templates via `tmpl.Exec "default.title" .` to compose new templates over the defaults.

## Notification template data

At the top of a notification template, dot (`.`) contains:

- `.Receiver` (string) — contact point name
- `.Status` (string) — `firing` if any alert is firing, otherwise `resolved`
- `.Alerts` (`[]Alert`) — all alerts (firing + resolved) in this notification
- `.Alerts.Firing` (`[]Alert`) — firing-only alerts
- `.Alerts.Resolved` (`[]Alert`) — resolved-only alerts
- `.GroupLabels` (`KV`) — labels that grouped these alerts
- `.CommonLabels` (`KV`) — labels common to every alert in the group
- `.CommonAnnotations` (`KV`) — annotations common to every alert
- `.ExternalURL` (string) — link to the Grafana / Alertmanager that sent the notification
- `.GroupKey` (string) — identifier of this alert group
- `.TruncatedAlerts` (integer) — count of alerts dropped from `.Alerts` due to truncation (Webhook and OnCall only)

### Alert object

Each entry in `.Alerts` has:

- `.Status` (string) — `firing` or `resolved`
- `.Labels` (`KV`) — alert labels (includes all label types, but only labels used in the condition for query labels)
- `.Annotations` (`KV`) — alert annotations (rendered annotation templates)
- `.StartsAt` (Time) — alert started
- `.EndsAt` (Time) — alert ended (or a future timeout while firing)
- `.GeneratorURL` (string) — link back to the alert source
- `.Fingerprint` (string) — stable unique identifier

Grafana-managed alerts add:

- `.DashboardURL` — dashboard link (requires Dashboard UID annotation)
- `.PanelURL` — panel link (requires Panel ID annotation)
- `.SilenceURL` — pre-filled silence creation link
- `.Values` (`KV`) — values of expressions used in the rule
- `.ValueString` — string with labels + value of each reduced expression
- `.OrgID` — organization that owns the alert

### KV methods

`KV` represents a map of string keys to string values.

- `.KEY` — direct access (e.g., `.Labels.severity`)
- `.SortedPairs` — sorted list of `{Name, Value}` pairs
- `.Names` — list of keys
- `.Values` — list of values
- `.Remove (stringSlice "key1" "key2")` — copy with keys removed

## Built-in functions

### Text functions

- `title` — capitalize first letter of each word
- `toUpper`, `toLower` — case conversion
- `trimSpace` — strip leading/trailing whitespace
- `match pattern text` — regex match (boolean)
- `reReplaceAll pattern replacement text` — regex replace
- `join sep slice` — string join
- `safeHtml str` — mark string as HTML-safe (skip auto-escaping)
- `stringSlice s1 s2 ...` — build a string slice

### Time functions

- `date format time` — format a Time using Go layout (e.g., `"2006-01-02 15:04:05 MST"`)
- `tz "Europe/Paris" time` — convert to timezone
- `time.Now` — current local time
- `Time` values support `.Year`, `.Month`, `.Day`, `.Hour`, `.Minute`, `.Second`, `.Unix`, `.UnixMilli`, `.Add`,
  `.AddDate`, `.Sub`, `.UTC`, `.Format`

### Collection functions (`coll.*`)

- `coll.Dict key1 val1 key2 val2 ...` — build a map (odd args get empty-string value)
- `coll.Slice ...args` — build a slice
- `coll.Append value list` — return new list with value appended

### Data functions (`data.*`)

- `data.JSON jsonString` — parse JSON string into an object
- `data.ToJSON obj` — serialize to compact JSON
- `data.ToJSONPretty indent obj` — serialize to indented JSON

### Template functions (`tmpl.*`)

- `tmpl.Exec name [context]` — execute a named template, return its rendered string
- `tmpl.Inline templateString context` — render a string as a template

## Worked examples

### Annotation summary with query value

```
CPU usage for {{ $labels.instance }} has exceeded 80% ({{ $values.A.Value }}) for the last 5 minutes.
```

### Label template — severity tiers from query value

```
{{ if (gt $values.A.Value 90.0) -}}
critical
{{ else if (gt $values.A.Value 80.0) -}}
high
{{ else if (gt $values.A.Value 60.0) -}}
medium
{{ else -}}
low
{{- end }}
```

### Notification subject — counts and group labels

```
{{ define "custom.title" -}}
[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .GroupLabels.SortedPairs.Values | join " " }}
{{- end }}
```

### Notification body — per-alert summary

```
{{ define "alert.detail" }}
- Summary: {{ .Annotations.summary }}
- Status: {{ .Status }}
- Started: {{ .StartsAt | date "15:04:05 MST" }}
{{- if eq .Status "resolved" }}
- Ended: {{ .EndsAt | date "15:04:05 MST" }}
{{- end }}
- Runbook: {{ .Annotations.runbook_url }}
{{ end }}

{{ define "custom.body" }}
{{ len .Alerts.Firing }} firing, {{ len .Alerts.Resolved }} resolved
{{ range .Alerts -}}{{ template "alert.detail" . }}{{- end }}
{{ end }}
```

### Webhook JSON payload

```
{{ define "webhook.payload" -}}
{{ coll.Dict
  "status" .Status
  "alerts" (tmpl.Exec "webhook.alerts" .Alerts | data.JSON)
  "groupKey" .GroupKey
  "externalURL" .ExternalURL
  | data.ToJSONPretty "  " }}
{{- end }}

{{ define "webhook.alerts" -}}
{{ $out := coll.Slice -}}
{{ range . -}}
{{ $out = coll.Append (coll.Dict "status" .Status "labels" .Labels "startsAt" .StartsAt) $out -}}
{{ end -}}
{{ $out | data.ToJSON -}}
{{ end }}
```

## Common template pitfalls

- Templating labels with continuously varying values — creates stale instances every evaluation
- Missing whitespace stripping (`{{-` / `-}}`) — multi-line ranges introduce blank lines
- Accessing `.Annotations` for unrendered annotations — `.Annotations` holds the rendered template result, not the
  source
- Defining a template named `default.title` — silently shadows the built-in
- Calling `.DashboardURL` / `.PanelURL` on data-source-managed alerts — Grafana-managed only
- Iterating `.Alerts` without checking `.Status` — firing and resolved alerts share the list
