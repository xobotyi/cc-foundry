# Event-Driven Ansible (EDA)

Event-Driven Ansible is the "Automation Decisions" component of AAP. It listens to external event or alert sources and
triggers automated responses via rulebooks, replacing manual or scheduled intervention with real-time, condition-based
automation.

## Core Concepts

EDA operates through four components:

- **Event sources** -- third-party data about changing conditions (monitoring alerts, log events, webhook payloads)
- **Rulebooks** -- YAML definitions that specify which events to watch and how to respond (analogous to playbooks for
  event-driven logic)
- **EDA controller** -- the decision engine that receives events, evaluates rulebook conditions, and dispatches actions
- **Automation controller** -- executes the actual remediation (playbooks, workflows) when the EDA controller triggers
  an action

## Rulebook Structure

Rulebooks are YAML files organized into rulesets. Each ruleset contains sources, rules, and conditions. Store rulebooks
in Git repositories at `/extensions/eda/rulebooks` within a collection structure.

```yaml
---
- name: Respond to monitoring alerts
  hosts: all
  sources:
    - name: webhook_listener
      ansible.eda.webhook:
        host: 0.0.0.0
        port: 5000
      filters:
        - json_filter:
            include_keys: ["alert_name", "severity", "host"]
            exclude_keys: ["*_url", "_links"]

  rules:
    - name: Remediate critical disk alerts
      condition: >-
        event.alert_name == "DiskSpaceCritical"
        and event.severity == "critical"
      action:
        run_job_template:
          name: disk-cleanup
          organization: ops-team
          job_args:
            extra_vars:
              target_host: "{{ event.host }}"

    - name: Log low-severity alerts
      condition: event.severity == "warning"
      action:
        debug:
          msg: "Warning received: {{ event.alert_name }} on {{ event.host }}"
```

### Event Sources

Supported sources for the web-based EDA controller:

- `alertmanager` -- Prometheus Alertmanager
- `aws_cloudtrail` -- AWS CloudTrail events
- `aws_sqs_queue` -- AWS SQS messages
- `azure_service_bus` -- Azure Service Bus messages
- `kafka` -- Apache Kafka topics
- `pg_listener` -- PostgreSQL LISTEN/NOTIFY
- `webhook` -- HTTP webhook endpoint

Sources are Python plugins distributed via Ansible Content Collections (primarily `ansible.eda`). The CLI
(`ansible-rulebook`) supports additional local-only sources.

### Conditions

Conditions are the `when` logic evaluated against incoming event payloads. A rule triggers only when the event data
matches the condition's structure and values exactly.

```yaml
# Simple equality
condition: event.alert_name == "HighCPU"

# Compound conditions
condition: >-
  event.severity == "critical"
  and event.source == "prometheus"

# Nested field access (dot notation)
condition: event.payload.status == "firing"
```

Event payload keys can only contain letters, numbers, and underscores. Use the `dashes_to_underscores` filter if sources
send keys with dashes.

### Actions

- `run_job_template` -- launch a playbook via automation controller (most common production action)
- `run_workflow_template` -- execute a multi-step workflow
- `run_playbook` -- direct execution (CLI only, not supported in controller)
- `run_module` -- execute a single module
- `set_fact` / `post_event` -- share data within the rule engine or trigger subsequent rules
- `debug` / `print_event` -- troubleshooting event payloads
- `shutdown` -- stop the rulebook activation
- `none` -- explicitly do nothing (useful for conditional suppression)

### Event Filters

Filters preprocess event data before conditions evaluate it. Chain filters sequentially:

```yaml
sources:
  - name: azure_events
    ansible.eda.azure_service_bus:
      conn_str: "{{ connection_str }}"
      queue_name: "{{ queue_name }}"
    filters:
      - json_filter:
          include_keys: ["clone_url"]
          exclude_keys: ["*_url", "_links", "base", "sender"]
      - dashes_to_underscores:
```

Built-in filters:

- `json_filter` -- include/exclude keys from the event payload
- `dashes_to_underscores` -- normalize key names
- `ansible.eda.insert_hosts_to_meta` -- inject host info for ansible-rulebook targeting
- `ansible.eda.normalize_keys` -- convert non-alphanumeric key characters to underscores

Use filters to prevent the rule engine from being overwhelmed by unnecessary event data.

## Decision Environments

Decision environments are container images for running rulebooks -- analogous to execution environments for playbooks.
They package the `ansible.eda` collection, event source plugins, and dependencies.

```bash
# Build a custom decision environment
ansible-builder build --tag my-decision-env:latest -f decision-environment.yml
```

## Integration Patterns

### Webhooks vs Event Streams vs Kafka

- **Webhooks** -- simple, low-to-moderate volume (hundreds to thousands/day). Minimal setup. Events lost if receiver is
  down. No ordering guarantees.
- **Event Streams** (AAP 2.5+) -- production-grade webhook enhancement. Single endpoint routes to multiple rulebook
  activations. Supports credential integration (HashiCorp Vault, CyberArk). Use for horizontal scaling of activations.
- **Kafka** -- high-volume, mission-critical (thousands to millions/day). Persistent storage, event replay, strong
  ordering within partitions. Requires Kafka infrastructure.

### Event Streams

Event Streams simplify webhook-based integrations for production:

- Route a single endpoint to multiple rulebook activations
- Deliver events to horizontally-scaled activations
- Integrate external secret managers for credential security
- Use **Test mode** to validate connectivity and inspect payloads before enabling production forwarding

When creating event streams, explicitly define HTTP headers to avoid unintentional exposure of sensitive information.

## Performance and Scaling

### Memory Management

Each rulebook activation container has a **200 MB default memory limit**. At 4 CPU / 16 GB RAM, a single activation
cannot handle more than ~150,000 events/minute at this limit. High event volumes cause OOM kills (status code 137).

Increase the memory limit in EDA controller settings when:

- Event volume exceeds 150K events/minute per activation
- Multiple activations run in parallel (memory is shared)

### Horizontal Scaling

AAP 2.5+ supports multi-node EDA deployments:

- **API nodes** -- handle user requests (UI/API interactions)
- **Worker nodes** -- execute rulebook activations and background tasks

Scale each type independently. Use separate API and worker nodes instead of hybrid nodes for efficient resource
allocation. The number of API nodes correlates to user count; worker nodes correlate to activation count.

## Security

- Use **credentials** instead of `extra_vars` for sensitive data (passwords, API keys)
- Attach **vault credentials** to rulebook activations for vaulted variables
- Avoid `eda` or `ansible` as variable key names -- conflicts with internal system variables
- Event Streams support external secret management (HashiCorp Vault, CyberArk) for credential injection

## Troubleshooting

### Log Tracking Identifiers

EDA includes three tracking IDs for tracing events across services:

- `rid` (X-REQUEST-ID) -- tracks HTTP requests from platform gateway through the EDA lifecycle. In response headers and
  log entries.
- `tid` (Log Tracking ID) -- tracks activation lifecycle from creation through completion, persists across restarts.
  Found in activation-related logs and the History tab.
- `aiid` (Activation Instance ID) -- identifies logs for a single execution instance. Found in activation logs.

### Common Issues

- **Actions not triggering** -- verify `when` conditions match exact event payload structure and values. Check YAML
  indentation. Validate action configuration (correct `run_job_template` name and arguments).
- **Activation failing with 137** -- container OOM. Increase memory limit or reduce event volume per activation.
- **Events not arriving** -- check event source compatibility (web controller vs CLI-only). Verify network connectivity
  and credentials. Use event stream Test mode to diagnose.
