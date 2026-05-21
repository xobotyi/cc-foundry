# File Provisioning

YAML configuration files in `provisioning/` directories that Grafana reads at startup. Resources are created, updated,
or deleted based on file contents. Not available in Grafana Cloud.

## Contents

- [Directory layout](#directory-layout)
- [Environment variable interpolation](#environment-variable-interpolation)
- [Datasources](#datasources)
- [Dashboards](#dashboards)
- [Plugins](#plugins)
- [Alerting](#alerting)
- [Reload behavior](#reload-behavior)
- [UI edits to provisioned resources](#ui-edits-to-provisioned-resources)
- [Common pitfalls](#common-pitfalls)

---

## Directory layout

The `provisioning` directory is configured via `grafana.ini`'s `[paths] provisioning` setting (default
`<WORKING_DIR>/conf/provisioning`). Subdirectories:

```
provisioning/
├── datasources/        # *.yaml — data source configurations
├── dashboards/         # *.yaml — dashboard provider configurations (NOT dashboards themselves)
├── plugins/            # *.yaml — plugin app configurations
└── alerting/           # *.yaml or *.json — alert rules, contact points, policies, templates, mute timings
```

Dashboard JSON files live elsewhere (typically `/var/lib/grafana/dashboards/`) and the `dashboards/*.yaml` files point
to them.

## Environment variable interpolation

All provisioning YAML files support `$VAR` and `${VAR}` substitution.

- Only for configuration **values** — not for keys or structural parts of the file
- Not for the dashboard JSON definition files (only the dashboard provider YAML)
- Replacement order: `${VAR}` first, then `$VAR`
- Use `$$` to escape a literal `$` (e.g., `Pa$$sw0rd` → `Pa$sw0rd`)
- Prefer `$VAR` syntax when the value itself contains `$` to avoid greedy variable boundary issues (`${PASSWORD}` will
  stop at the next `$` and treat the rest as another variable)

## Datasources

Configuration file shape (`provisioning/datasources/*.yaml`):

```yaml
apiVersion: 1

deleteDatasources:
  - name: OldGraphite
    orgId: 1

prune: true   # auto-delete provisioned datasources removed from this file

datasources:
  - name: Graphite              # required, unique per org
    type: graphite              # required
    access: proxy               # proxy (Server) or direct (Browser); most plugins require proxy
    orgId: 1
    uid: my_unique_uid          # if omitted, Grafana generates one
    url: http://localhost:8080
    user:
    database:
    basicAuth: false
    basicAuthUser:
    withCredentials:
    isDefault: false            # one default per org
    jsonData:                   # plugin-specific settings
      graphiteVersion: '1.1'
      tlsAuth: true
    secureJsonData:             # encrypted-at-rest settings
      password: $DB_PASSWORD
      tlsCACert: '...'
    version: 1                  # increment when updating from external systems
    editable: false             # disable UI editing
```

### Required fields

- `name`, `type`, `access` required
- For HTTP-based data sources (Prometheus, Loki, Elasticsearch, etc.), `url` is effectively required
- Authentication-specific fields depend on data source type (see `jsonData` and `secureJsonData` tables in upstream
  docs)

### Deletion semantics

- `deleteDatasources` runs **before** `datasources` insertions/updates in the same file
- `prune: true` auto-removes any datasource previously provisioned by this file but missing from the current file
  (including when the whole file is deleted)
- Without `prune`, removed entries persist in the database

### Multiple Grafana instances

When multiple Grafana instances share a database, set the `version` field and increment it on each change. Grafana only
updates datasources whose version is ≤ the provisioning file's version. Prevents older config copies from overwriting
newer ones on simultaneous restarts.

### Common `jsonData` keys

- TLS: `tlsAuth`, `tlsAuthWithCACert`, `tlsSkipVerify`, `serverName`
- HTTP: `httpMethod`, `timeout`, `keepCookies`, `customQueryParameters`
- Prometheus: `prometheusVersion`, `prometheusType` (Prometheus/Cortex/Mimir/Thanos), `manageAlerts`, `alertmanagerUid`,
  `cacheLevel`, `httpMethod`, `incrementalQuerying`
- Loki/Prometheus: `manageAlerts`, `alertmanagerUid`
- Elasticsearch: `timeField`, `interval`, `logMessageField`, `logLevelField`, `maxConcurrentShardRequests`
- AWS (Elasticsearch/Prometheus/CloudWatch): `sigV4Auth`, `sigV4Region`, `sigV4AssumeRoleArn`, `authType`,
  `defaultRegion`, `assumeRoleArn`, `externalId`
- SQL (MySQL/PostgreSQL/MSSQL): `maxOpenConns`, `maxIdleConns`, `connMaxLifetime`, `sslmode`, `tlsConfigurationMethod`
- PostgreSQL: `postgresVersion`, `timescaledb`

### Common `secureJsonData` keys

- `password`, `basicAuthPassword`, `tlsCACert`, `tlsClientCert`, `tlsClientKey`
- `accessKey`, `secretKey` (CloudWatch)
- `sigV4AccessKey`, `sigV4SecretKey`

### Custom HTTP headers

```yaml
datasources:
  - name: APIBackend
    jsonData:
      httpHeaderName1: 'X-Tenant'
      httpHeaderName2: 'Authorization'
    secureJsonData:
      httpHeaderValue1: 'team-platform'
      httpHeaderValue2: 'Bearer ${API_TOKEN}'
```

Pair `httpHeaderName<N>` in `jsonData` with `httpHeaderValue<N>` in `secureJsonData`.

## Dashboards

Two layers: a **provider** YAML configures how Grafana discovers dashboard files; dashboard files are JSON.

### Provider YAML (`provisioning/dashboards/*.yaml`)

```yaml
apiVersion: 1

providers:
  - name: 'team-platform'              # required, unique
    orgId: 1
    folder: ''                         # Grafana folder name; '' = root
    folderUid: ''                      # autogenerated if empty
    type: file                         # only 'file' is supported
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: false              # allow UI edits to provisioned dashboards
    options:
      path: /var/lib/grafana/dashboards
      foldersFromFilesStructure: false  # true → use subdir names as Grafana folders
```

### Dashboard JSON

Either the legacy schema or the new Kubernetes-style resource format.

Legacy:

```json
{
  "dashboard": {
    "uid": "example-dashboard",
    "title": "Production Overview",
    "schemaVersion": 16,
    "version": 0
  },
  "folderUid": "monitoring-folder",
  "overwrite": true
}
```

Kubernetes-style (required for dashboards v2 / dynamic dashboards):

```json
{
  "kind": "Dashboard",
  "apiVersion": "dashboard.grafana.app/v1",
  "metadata": {
    "name": "dashboard-uid"
  },
  "spec": {
    "title": "Dashboard title",
    "panels": [...]
  }
}
```

### `foldersFromFilesStructure`

When `true`, the directory hierarchy maps to Grafana folder structure:

```
/etc/dashboards
├── server/
│   ├── common_dashboard.json
│   └── network_dashboard.json
└── application/
    ├── requests_dashboard.json
    └── resources_dashboard.json
```

Creates `server` and `application` folders. **Nested folders not supported.** Must unset `folder` and `folderUid` when
using this option.

### UID stability

Always set `uid` (legacy) or `metadata.name` (Kubernetes). Keeps dashboard URLs stable across instances and
re-provisioning. Same UID + same instance → update existing. Don't reuse the same `title` within a folder or the same
`uid` within an instance.

### Detect updates

- `updateIntervalSeconds > 10` — Grafana polls the path
- `updateIntervalSeconds ≤ 10` — Grafana watches the filesystem for events (may not work over Docker bind mounts or some
  network filesystems — fall back to polling by setting > 10)

## Plugins

```yaml
apiVersion: 1

apps:
  - type: raintank-worldping-app    # plugin identifier
    org_id: 1                       # or org_name
    disabled: false
    jsonData:
      key: value
    secureJsonData:
      key: value
```

Provisions plugin _configurations_, not the plugins themselves. Install the plugin first.

## Alerting

`provisioning/alerting/*.yaml` or `*.json`. The same file can contain any combination of resources.

### Alert rules

```yaml
apiVersion: 1

groups:
  - orgId: 1
    name: my_rule_group           # required
    folder: my_first_folder       # required, folder name (will be created if missing)
    interval: 60s                 # required, evaluation interval
    rules:
      - uid: my_id_1              # required, ≤ 40 chars, [a-zA-Z0-9_-]
        title: my_first_rule      # required
        condition: A              # required, refId of the final expression
        data:                     # required, query / expression objects
          - refId: A
            datasourceUid: '__expr__'
            model:
              ...
        dashboardUid: my_dashboard  # optional, links rule to a dashboard
        panelId: 123                # optional, links to a specific panel
        noDataState: Alerting       # NoData | Alerting | OK, default NoData
        execErrState: Alerting      # Error | Alerting | OK, default Alerting
        for: 60s                    # required, pending period
        annotations:
          some_key: some_value
        labels:
          team: sre_team_1
```

Delete rules in a separate `deleteRules` section by `uid`:

```yaml
apiVersion: 1
deleteRules:
  - orgId: 1
    uid: my_id_1
```

### Contact points

```yaml
apiVersion: 1

contactPoints:
  - orgId: 1
    name: cp_1
    receivers:
      - uid: first_uid
        type: prometheus-alertmanager
        disableResolveMessage: false
        settings:
          url: http://test:9000
        # secure_settings: encrypted at rest
        # secureSettings:
        #   password: ${PAGERDUTY_TOKEN}
```

Delete via `deleteContactPoints`:

```yaml
apiVersion: 1
deleteContactPoints:
  - orgId: 1
    uid: first_uid
```

### Notification template groups

```yaml
apiVersion: 1

templates:
  - orgId: 1
    name: my_first_template
    template: |
      {{ define "my_first_template" }}
        Custom notification message
      {{ end }}
```

Delete via `deleteTemplates` (by `name`).

### Notification policies

The entire policy tree is one resource. Provisioning **overwrites the whole tree**.

```yaml
apiVersion: 1

policies:
  - orgId: 1
    receiver: grafana-default       # required, default contact point
    group_by: ['...']
    matchers:                       # Prometheus-style strings
      - alertname = Watchdog
      - severity =~ "warning|critical"
    object_matchers:                # Grafana object form (use when label has special chars)
      - ['alertname', '=', 'CPUUsage']
    mute_time_intervals:
      - abc                          # not inherited by children
    group_wait: 30s
    group_interval: 5m
    repeat_interval: 4h
    routes:                          # nested child policies
      - receiver: another-receiver
        matchers: [...]
```

Reset to default tree:

```yaml
apiVersion: 1
resetPolicies:
  - 1   # orgId
```

### Mute timings

```yaml
apiVersion: 1

muteTimes:
  - orgId: 1
    name: mti_1
    time_intervals:
      - times:
          - start_time: '06:00'
            end_time: '23:59'
        location: 'UTC'
        weekdays: ['monday:wednesday', 'saturday', 'sunday']
        months: ['1:3', 'may:august', 'december']
        years: ['2020:2022', '2030']
        days_of_month: ['1:5', '-3:-1']
```

Delete via `deleteMuteTimes` (by `name`).

### Alerting variable interpolation exceptions

Provisioning replaces `$VAR` in most fields, but **not** in:

- `groups[].rules[].annotations`
- `groups[].rules[].relativeTimeRange`
- `groups[].rules[].data.model`
- `muteTimes[].name`
- `muteTimes[].time_intervals[]`
- `templates[].name`
- `templates[].template`

Escape unintended substitutions with `$$variable` → `$variable`.

## Reload behavior

Provisioning runs at Grafana startup. To re-run at runtime:

- **Admin API** — `POST /api/admin/provisioning/{datasources,dashboards,plugins,alerting,...}/reload` (requires admin
  permissions and a matching reload endpoint per resource type)
- **Restart** — full restart applies all changes

Dashboard files have their own poll/watch loop independent of provisioning reload.

## UI edits to provisioned resources

Default: UI edits to provisioned resources are blocked or warned against.

- **Datasources** — `editable: false` disables UI edits
- **Dashboards** — `allowUiUpdates: true` lets users save changes to the database. The next provisioning run overwrites
  database changes with the file contents (Grafana ignores the dashboard JSON `version` field). With
  `disableDeletion: false`, removing the file deletes the dashboard from the database.
- **Alerting** — provisioned resources can't be edited in the UI like manual resources. Use the `disable_provenance`
  flag (Terraform) or unlock via the API to allow edits.

## Common pitfalls

- Partial notification policy tree — provisioning replaces the entire tree including unrelated branches
- Missing `mute_time_intervals` on child policies — not inherited from parent
- `${PASSWORD}` syntax with a password containing `$` — switch to `$PASSWORD` or escape with `$$`
- `updateIntervalSeconds: 5` over a Docker bind mount that doesn't propagate inotify events — dashboards appear stuck
  until restart; raise above 10 to force polling
- `version: 1` on a datasource without bumping on subsequent file changes — older instances silently win
- Reusing dashboard `title` within a folder or `uid` within an instance — inconsistent behavior
- Provisioning a plugin's `apps:` config before installing the plugin
- Environment variables inside dashboard JSON files — only the provider YAML supports interpolation
