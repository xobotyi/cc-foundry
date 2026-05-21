# Dashboard JSON Model

Full schema reference for Grafana dashboard JSON: Classic and V2 Resource models, panel structure, grid positioning, and
the embedded `timepicker`, `templating`, and `annotations` blocks.

## Contents

- [Schema versions](#schema-versions)
- [Classic model: top-level fields](#classic-model-top-level-fields)
- [Panel object](#panel-object)
- [Grid positioning (`gridPos`)](#grid-positioning-gridpos)
- [Time picker (`timepicker`)](#time-picker-timepicker)
- [Templating (`templating.list`)](#templating-templatinglist)
- [Annotations (`annotations.list`)](#annotations-annotationslist)
- [Links (`links`)](#links-links)
- [V2 Resource model](#v2-resource-model)
- [Editing the JSON directly](#editing-the-json-directly)

---

## Schema versions

- **Classic model** — non-Kubernetes resource; default before Grafana v13.0. Used for export/import and the grafana.com
  gallery. Identified by integer `schemaVersion` (incremented on schema-changing Grafana upgrades).
- **V2 Resource model** — Kubernetes-style resource introduced for Observability as Code. Supports advanced layouts,
  conditional rendering, tabs/rows as first-class kinds, and `AdhocVariable`-style filter/group-by elements. Identified
  by `apiVersion: dashboard.grafana.app/v2beta1`, `kind: Dashboard`, `spec:`/`metadata:` blocks.
- Observability as Code works with both versions but is fully compatible with V2.
- Classic-model dashboards can export to either Classic or V2.

## Classic model: top-level fields

Minimal new-dashboard JSON:

```json
{
  "id": null,
  "uid": "cLV5GDCkz",
  "title": "New dashboard",
  "tags": [],
  "timezone": "browser",
  "editable": true,
  "graphTooltip": 1,
  "panels": [],
  "time": { "from": "now-6h", "to": "now" },
  "timepicker": { "refresh_intervals": [] },
  "templating": { "list": [] },
  "annotations": { "list": [] },
  "refresh": "5s",
  "schemaVersion": 17,
  "version": 0,
  "links": []
}
```

- **`id`** — numeric DB-assigned ID; `null` until first save.
- **`uid`** — string identifier (8–40 chars), stable across renames and re-imports. Use for cross-system references.
- **`title`** — dashboard title.
- **`tags`** — string array; drives "with tags" filtering in dashboard links and the dashboard list.
- **`style`** — `dark` or `light`. Legacy; rarely set.
- **`timezone`** — `utc`, `browser`, or any IANA timezone (`America/New_York`).
- **`editable`** — boolean; `false` = read-only in the UI.
- **`graphTooltip`** — shared crosshair/tooltip mode: `0` off (default), `1` shared crosshair, `2` shared crosshair AND
  tooltip.
- **`time`** — default time range; `from`/`to` accept absolute timestamps or relative expressions (`now-6h`, `now/d`).
- **`refresh`** — auto-refresh interval (`5s`, `30s`, `1m`, ...) or empty string to disable.
- **`schemaVersion`** — integer; don't set manually unless writing migration tooling.
- **`version`** — dashboard revision; auto-incremented per save.
- **`panels`** — panel objects. See [Panel object](#panel-object).
- **`templating.list`** — variables. See [Templating](#templating-templatinglist).
- **`annotations.list`** — annotation queries. See [Annotations](#annotations-annotationslist).
- **`links`** — dashboard-level links. See [Links](#links-links).
- **`timepicker`** — refresh-interval and quick-range config. See [Time picker](#time-picker-timepicker).

## Panel object

A panel is the unit of visualization. Fields common to all panels:

```json
{
  "type": "timeseries",
  "title": "Request rate",
  "id": 4,
  "gridPos": { "x": 0, "y": 0, "w": 12, "h": 9 },
  "datasource": { "type": "prometheus", "uid": "prom-uid" },
  "targets": [{ "refId": "A", "expr": "sum(rate(http_requests_total[5m]))" }],
  "fieldConfig": {
    "defaults": { "unit": "reqps", "decimals": 2 },
    "overrides": []
  },
  "options": {},
  "transformations": [],
  "links": [],
  "description": ""
}
```

- **`type`** — panel plugin ID: `timeseries`, `stat`, `gauge`, `bargauge`, `barchart`, `histogram`, `heatmap`,
  `piechart`, `table`, `logs`, `nodeGraph`, `traces`, `flamegraph`, `canvas`, `geomap`, `text`, `news`, `dashlist`,
  `alertlist`, `annolist`, `state-timeline`, `status-history`, `candlestick`, `trend`, `xychart`.
- **`title`** — header text; supports variable interpolation.
- **`id`** — numeric ID, unique within the dashboard.
- **`gridPos`** — layout. See [Grid positioning](#grid-positioning-gridpos).
- **`datasource`** — object with `type` and `uid`. Dashboard-level data source variable:
  `{ "type": "datasource", "uid": "${DS_VAR}" }`.
- **`targets`** — queries; each has a `refId` (`A`, `B`, ...) and data-source-specific fields (`expr` for Prometheus,
  `query`/`rawSql` for SQL).
- **`fieldConfig.defaults`** — standard options applied to all fields: `unit`, `min`, `max`, `decimals`, `displayName`,
  `color`, `mappings`, `thresholds`, `links`, `noValue`.
- **`fieldConfig.overrides`** — array of `{ matcher, properties }` rules. See `panel-options.md`.
- **`options`** — visualization-specific options (legend mode, tooltip mode, color scheme, orientation, etc.).
- **`transformations`** — ordered transformation specs applied after queries return. See `transformations.md`.
- **`links`** — panel links (header icon). For data links and click actions, use `fieldConfig.defaults.links`.
- **`description`** — markdown-rendered tooltip shown next to the panel title.
- **`repeat`** / **`repeatDirection`** / **`maxPerRow`** — panel repetition. See `variables.md`.
- **`pluginVersion`** — panel plugin version; set automatically.

### Special panel types

- **Row** (`"type": "row"`) — Classic-model grouping. Holds a `panels` array of children when collapsed.
- **Text** (`"type": "text"`) — renders markdown/HTML; uses `options.content` and `options.mode` (`markdown` | `html`).
- **Library panel** — `libraryPanel: { uid, name }` block replacing inline options/targets. See
  [Library panels](#library-panels-classic).

### Library panels (classic)

Library panel reference replaces inline panel config:

```json
{
  "id": 7,
  "gridPos": { "x": 0, "y": 0, "w": 12, "h": 8 },
  "libraryPanel": {
    "uid": "abc-123",
    "name": "Request rate"
  }
}
```

Library panel edits propagate to every dashboard using it. Unlinking restores inline config and breaks the binding.

## Grid positioning (`gridPos`)

24-column grid; each grid-height unit is 30 pixels.

- **`x`** — 0–23, column position.
- **`y`** — 0+, row position (grid-height units).
- **`w`** — 1–24, panel width in columns.
- **`h`** — 1+, panel height in grid-height units.

Negative gravity pulls panels upward into empty space above. Layout uses **Custom** (manual `gridPos`) or **Auto grid**
(uniform sizing via `Min column width`, `Max columns`, `Row height`, `Fill screen`).

## Time picker (`timepicker`)

```json
{
  "collapse": false,
  "enable": true,
  "hidden": false,
  "now": true,
  "nowDelay": "",
  "quick_ranges": [
    { "display": "Last 6 hours", "from": "now-6h", "to": "now" },
    { "display": "Last 7 days", "from": "now-7d", "to": "now" }
  ],
  "refresh_intervals": ["5s", "10s", "30s", "1m", "5m", "15m", "30m", "1h", "2h", "1d"]
}
```

- **`hidden`** — `true` hides the time picker.
- **`nowDelay`** — duration string (`30s`, `1m`); shifts `now` backward to compensate for data-aggregation lag and avoid
  trailing nulls.
- **`quick_ranges`** — custom presets in the time picker dropdown.
- **`refresh_intervals`** — interval options in the refresh dropdown.

## Templating (`templating.list`)

Each entry is a variable definition. Common fields:

```json
{
  "type": "query",
  "name": "env",
  "label": "Environment",
  "datasource": { "type": "prometheus", "uid": "prom-uid" },
  "query": "label_values(up, env)",
  "regex": "",
  "refresh": 1,
  "sort": 0,
  "multi": true,
  "includeAll": true,
  "allValue": ".*",
  "current": { "text": "prod", "value": "prod", "selected": true },
  "options": [],
  "hide": 0,
  "skipUrlSync": false,
  "description": ""
}
```

- **`type`** — `query`, `custom`, `textbox`, `constant`, `datasource`, `interval`, `adhoc` (Filters / Filter and Group
  by), `system` (built-in `__auto_interval_*` etc.), `groupby` (V2).
- **`refresh`** — `0` never (only at save), `1` on dashboard load, `2` on time-range change. Use `2` only when the
  variable query depends on time.
- **`sort`** — `0` disabled, `1` alphabetical asc, `2` alphabetical desc, `3` numerical asc, `4` numerical desc, `5`
  alphabetical case-insensitive asc, `6` alphabetical case-insensitive desc.
- **`hide`** — `0` name + value, `1` value only, `2` hidden.
- **`skipUrlSync`** — `true` omits the value from URL as `var-<name>=...`. Constants default to `true`.
- **`allValue`** — replacement string for "All"; blank concatenates all values.
- **Full variable type catalogue and configuration:** see `variables.md`.

## Annotations (`annotations.list`)

```json
{
  "name": "Deployments",
  "datasource": { "type": "prometheus", "uid": "prom-uid" },
  "enable": true,
  "hide": false,
  "iconColor": "rgba(255, 96, 96, 1)",
  "type": "tags",
  "tags": ["deploy"],
  "matchAny": false,
  "filter": { "exclude": false, "ids": [3, 8] },
  "target": { "limit": 100, "matchAny": false, "tags": [], "type": "dashboard" }
}
```

- Built-in **`-- Grafana --`** annotation query (`name: "Annotations & Alerts"`) is always present and fetches manual
  annotations and alert state changes.
- **`filter`** — restricts which panels show this annotation: `ids` lists panel IDs; `exclude` toggles between "selected
  panels" and "all panels except".
- **Annotation queries and time regions:** see `annotations-links.md`.

## Links (`links`)

Dashboard-level links shown above the dashboard (or in the controls menu when `showInControlsMenu: true`).

```json
{
  "type": "dashboards",
  "title": "Service dashboards",
  "tags": ["service"],
  "asDropdown": true,
  "keepTime": true,
  "includeVars": true,
  "targetBlank": false,
  "showInControlsMenu": false
}
```

- **`type: "dashboards"`** — discover by tags; `tags` is required.
- **`type: "link"`** — fixed URL; uses `url`, `tooltip`, `icon` instead of `tags`/`asDropdown`.
- **`keepTime`** — append `?from=...&to=...` matching the current time range.
- **`includeVars`** — append `var-<name>=...` per template variable. Place `includeVars` before any explicit
  `var-<name>` in custom URLs to preserve current selections.
- **Full link semantics, panel links, data links:** see `annotations-links.md`.

## V2 Resource model

V2 uses a Kubernetes-style envelope (`apiVersion: dashboard.grafana.app/v2beta1`, `kind: Dashboard`, `metadata`/`spec`).
Full schema published as Swagger at `https://play.grafana.org/swagger?api=dashboard.grafana.app-v2beta1`; sub-page
references in this section point at the v12.1 documentation set (most recent fully-published copy).

### `spec` top-level fields

```json
{
  "annotations": [],
  "cursorSync": "Off",
  "editable": true,
  "elements": {},
  "layout": {
    "kind": "GridLayout",
    "spec": { "items": [] }
  },
  "links": [],
  "liveNow": false,
  "preload": false,
  "tags": [],
  "timeSettings": {
    "autoRefresh": "",
    "autoRefreshIntervals": ["5s", "10s", "30s", "1m", "5m", "15m", "30m", "1h", "2h", "1d"],
    "fiscalYearStartMonth": 0,
    "from": "now-6h",
    "hideTimepicker": false,
    "timezone": "browser",
    "to": "now"
  },
  "title": "",
  "variables": []
}
```

Top-level `spec` fields (per v12.1 Observability-as-Code schema-v2 reference):

- **`annotations`** — array of `AnnotationQuery` kinds. See [Annotations](#annotations-v2).
- **`cursorSync`** — `Off` (default), `Crosshair`, or `Tooltip`. Replaces Classic `graphTooltip` (`0`/`1`/`2`).
- **`editable`** — boolean; `false` = read-only.
- **`elements`** — map of panel-key → element kind. Kinds: `PanelKind`, `LibraryPanelKind`. Layout references elements
  by key.
- **`layout`** — dashboard layout. Kinds: `GridLayoutKind`, `AutoGridLayoutKind`, `RowsLayoutKind`, `TabsLayoutKind`.
  See [Layout kinds](#layout-kinds).
- **`links`** — references to other dashboards or external websites. See [Links](#links-v2).
- **`liveNow`** — boolean; `true` redraws panels at an interval matching pixel width.
- **`preload`** — boolean; `true` loads all panels at load time.
- **`tags`** — tag strings.
- **`timeSettings`** — time settings. Fields: `autoRefresh`, `autoRefreshIntervals`, `fiscalYearStartMonth` (0-based;
  `0` = January), `from`, `hideTimepicker`, `timezone`, `to`.
- **`title`** — dashboard title.
- **`variables`** — configured template variables. See [Variable kinds](#variable-kinds).

### Layout kinds

`GridLayout` — absolute placement. Items are `GridLayoutItem` (single panel placement, possibly repeated) or
`GridLayoutRow` (collapsible row holding nested items):

```json
{
  "kind": "GridLayout",
  "spec": {
    "items": [
      {
        "kind": "GridLayoutItem",
        "spec": {
          "element": {},
          "height": 0,
          "width": 0,
          "x": 0,
          "y": 0
        }
      },
      {
        "kind": "GridLayoutRow",
        "spec": {
          "collapsed": false,
          "elements": [],
          "title": "",
          "y": 0
        }
      }
    ]
  }
}
```

`GridLayoutItemSpec` fields:

- **`x`**, **`y`** — integer position on the dashboard grid.
- **`width`**, **`height`** — item size. (V2 layout-schema doc says "in pixels"; Classic uses 24-column × 30px grid
  units. Treat V2's unit as authoritative per docs but verify against the live Grafana instance when porting Classic
  dashboards.)
- **`element`** — `ElementReference` pointing at a panel key in `dashboard.spec.elements`.
- **`repeat?`** — `RepeatOptions`. Fields: `mode: "variable"`, `value: <string>`, optional `direction: "h" | "v"`,
  optional `maxPerRow: <integer>`.

`GridLayoutRowSpec` fields:

- **`y`** — row position. Child elements' `y` is relative to the row's `y`.
- **`collapsed`** — boolean.
- **`title`** — row title.
- **`elements`** — `GridLayoutItemKind` array.
- **`repeat?`** — `RowRepeatOptions` with `mode: "variable"`, `value: <string>` (no direction or maxPerRow).

`AutoGridLayout` — uniform-grid placement; columns and rows auto-sized:

```json
{
  "kind": "AutoGridLayout",
  "spec": {
    "columnWidthMode": "standard",
    "fillScreen": false,
    "items": [{ "kind": "AutoGridLayoutItem", "spec": { "element": {} } }],
    "maxColumnCount": 3,
    "rowHeightMode": "standard"
  }
}
```

`AutoGridLayoutSpec` fields:

- **`columnWidthMode`** — `narrow`, `standard` (default), `wide`, or `custom`.
- **`columnWidth?`** — number; used with `custom` mode.
- **`rowHeightMode`** — `short`, `standard` (default), `tall`, or `custom`.
- **`rowHeight?`** — number; used with `custom` mode.
- **`maxColumnCount?`** — number (default `3`).
- **`fillScreen?`** — boolean (default `false`).
- **`items`** — array of `AutoGridLayoutItemKind`.

`AutoGridLayoutItemSpec` fields:

- **`element`** — `ElementReference` to a panel key.
- **`repeat?`** — `AutoGridRepeatOptions` (`mode: "variable"`, `value: <string>`).
- **`conditionalRendering?`** — `ConditionalRenderingGroupKind`.

`RowsLayout` — vertical stack of rows; each row carries its own nested layout:

```json
{
  "kind": "RowsLayout",
  "spec": {
    "rows": [
      {
        "kind": "RowsLayoutRow",
        "spec": {
          "layout": { "kind": "GridLayout", "spec": {} },
          "title": ""
        }
      }
    ]
  }
}
```

`RowsLayoutRowSpec` fields:

- **`title?`** — row title.
- **`collapse`** — boolean.
- **`hideHeader?`** — boolean; hides row header.
- **`fullScreen?`** — boolean; row takes full screen.
- **`conditionalRendering?`** — `ConditionalRenderingGroupKind`.
- **`repeat?`** — `RowRepeatOptions` (`mode: "variable"`, `value: <string>`).
- **`layout`** — nested layout kind: `GridLayoutKind`, `RowsLayoutKind`, `AutoGridLayoutKind`, or `TabsLayoutKind`.

`TabsLayout` — horizontal tabs; each tab carries its own nested layout:

```json
{
  "kind": "TabsLayout",
  "spec": {
    "tabs": [
      {
        "kind": "TabsLayoutTab",
        "spec": {
          "layout": { "kind": "GridLayout", "spec": {} },
          "title": "New tab"
        }
      }
    ]
  }
}
```

`TabsLayoutTabSpec` fields:

- **`title?`** — tab title.
- **`layout`** — nested layout kind (any of the four).
- **`conditionalRendering?`** — `ConditionalRenderingGroupKind`.

### Conditional rendering

`AutoGridLayoutItem`, `RowsLayoutRow`, and `TabsLayoutTab` may carry a `ConditionalRenderingGroupKind` to hide or show
the element based on variables, data, or time-range size.

`ConditionalRenderingGroupSpec` fields:

- **`visibility`** — `show` or `hide`.
- **`condition`** — `and` or `or` (combinator over `items`).
- **`items`**:
  - `ConditionalRenderingVariableKind` — spec fields `variable: <string>`, `operator: "equals" | "notEquals"`,
    `value: <string>`.
  - `ConditionalRenderingDataKind` — spec field `value: <bool>` (data present / absent).
  - `ConditionalRenderingTimeRangeSizeKind` — spec field `value: <string>` (duration).

### `PanelKind` (element)

```json
{
  "kind": "Panel",
  "spec": {
    "data": {
      "kind": "QueryGroup",
      "spec": {
        "queries": [],
        "transformations": [],
        "queryOptions": {}
      }
    },
    "description": "",
    "id": 0,
    "links": [],
    "title": "",
    "vizConfig": { "kind": "", "spec": {} },
    "transparent": false
  }
}
```

- **`data.kind: "QueryGroup"`** — wraps `queries` (`PanelQueryKind[]`), `transformations` (`TransformationKind[]`),
  `queryOptions` (`QueryOptionsSpec`).
- **`PanelQueryKind.spec`** — `query` (`DataQueryKind { kind, spec }`) and optional `datasource` (`DataSourceRef`
  `{ type, uid }`).
- **`TransformationKind`** — `kind` is the transformation ID; `spec` is `DataTransformerConfig` (`id`, `disabled?`,
  `filter?` (`MatcherConfig`), `topic?` (`series` | `annotations` | `alertStates`), `options`).
- **`QueryOptionsSpec`** — `timeFrom`, `maxDataPoints`, `timeShift`, `queryCachingTTL`, `interval`, `cacheTimeout`,
  `hideTimeOverride`.
- **`vizConfig.spec`** — `pluginVersion`, `options`, `fieldConfig`.

### `LibraryPanelKind` (element)

```json
{
  "kind": "LibraryPanel",
  "spec": {
    "id": 0,
    "libraryPanel": { "name": "", "uid": "" },
    "title": ""
  }
}
```

### Variable kinds

All variable kinds share the envelope `{ "kind": "...", "spec": { ... } }`. Shared enums across applicable kinds (per
v12.1 variables-schema reference):

- **`hide`** — `dontHide`, `hideLabel`, `hideVariable`.
- **`refresh`** — `never`, `onDashboardLoad`, `onTimeChanged`.
- **`sort`** — `disabled`, `alphabeticalAsc`, `alphabeticalDesc`, `numericalAsc`, `numericalDesc`,
  `alphabeticalCaseInsensitiveAsc`, `alphabeticalCaseInsensitiveDesc`, `naturalAsc`, `naturalDesc`.

Default-JSON snippets below show fields in each kind's default rendering. All variable kinds also accept `label` and
`description` as common optional fields.

`QueryVariableKind`:

```json
{
  "kind": "QueryVariable",
  "spec": {
    "current": { "text": "", "value": "" },
    "hide": "dontHide",
    "includeAll": false,
    "multi": false,
    "name": "",
    "options": [],
    "query": {},
    "refresh": "never",
    "regex": "",
    "skipUrlSync": false,
    "sort": "disabled"
  }
}
```

`CustomVariableKind`:

```json
{
  "kind": "CustomVariable",
  "spec": {
    "current": {},
    "hide": "dontHide",
    "includeAll": false,
    "multi": false,
    "name": "",
    "options": [],
    "query": "",
    "skipUrlSync": false
  }
}
```

`TextVariableKind`:

```json
{
  "kind": "TextVariable",
  "spec": {
    "current": { "text": "", "value": "" },
    "hide": "dontHide",
    "name": "",
    "query": "",
    "skipUrlSync": false
  }
}
```

`ConstantVariableKind` (defaults `hide: "hideVariable"`, `skipUrlSync: true`):

```json
{
  "kind": "ConstantVariable",
  "spec": {
    "current": { "text": "", "value": "" },
    "hide": "hideVariable",
    "name": "",
    "query": "",
    "skipUrlSync": true
  }
}
```

`DatasourceVariableKind`:

```json
{
  "kind": "DatasourceVariable",
  "spec": {
    "current": { "text": "", "value": "" },
    "hide": "dontHide",
    "includeAll": false,
    "multi": false,
    "name": "",
    "options": [],
    "pluginId": "",
    "refresh": "never",
    "regex": "",
    "skipUrlSync": false
  }
}
```

`IntervalVariableKind`:

```json
{
  "kind": "IntervalVariable",
  "spec": {
    "auto": false,
    "auto_count": 0,
    "auto_min": "",
    "current": { "text": "", "value": "" },
    "hide": "dontHide",
    "name": "",
    "options": [],
    "query": "",
    "refresh": "never",
    "skipUrlSync": false
  }
}
```

`AdhocVariableKind` (Filter / Filter and Group by). Per the v12.1 variables-schema, the spec also accepts `datasource`,
`current`, `label`, and `description`. Default JSON shape:

```json
{
  "kind": "AdhocVariable",
  "spec": {
    "baseFilters": [],
    "defaultKeys": [],
    "filters": [],
    "hide": "dontHide",
    "name": "",
    "skipUrlSync": false
  }
}
```

- **`baseFilters`** — always-applied filters; not shown in the UI.
- **`defaultKeys`** — pre-populated key dimensions.
- **`datasource`** — `DataSourceRef`.
- **`filters`**, **`current`**, **`label`**, **`description`** — optional.

`GroupByVariableKind` (Prometheus, Loki — appends a dashboard-wide grouping dimension):

```json
{
  "kind": "GroupByVariable",
  "spec": {
    "current": { "text": [""], "value": [""] },
    "datasource": {},
    "hide": "dontHide",
    "multi": false,
    "name": "",
    "options": [],
    "skipUrlSync": false
  }
}
```

### Annotations (V2) {#annotations-v2}

Default JSON per the v12.1 annotations-schema reference:

```json
"annotations": [
  {
    "kind": "AnnotationQuery",
    "spec": {
      "builtIn": false,
      "datasource": { "type": "", "uid": "" },
      "enable": false,
      "hide": false,
      "iconColor": "",
      "name": ""
    }
  }
]
```

`AnnotationQuerySpec` fields:

- **`datasource`** — `DataSourceRef`.
- **`query`** — `DataQueryKind` (`{ kind, spec }`).
- **`enable`** — boolean.
- **`hide`** — boolean.
- **`iconColor`** — string.
- **`name`** — string.
- **`builtIn`** — boolean (default `false`).
- **`filter`** — `AnnotationPanelFilter`. Fields: `exclude?` (boolean, default `false`; toggles between "Selected
  panels" and "All panels except"), `ids` (panel IDs).
- **`options`** — data-source-specific extra properties.

### Links (V2) {#links-v2}

Default JSON per the v12.1 links-schema reference:

```json
"links": [
  {
    "asDropdown": false,
    "icon": "",
    "includeVars": false,
    "keepTime": false,
    "tags": [],
    "targetBlank": false,
    "title": "",
    "tooltip": "",
    "type": "link"
  }
]
```

- **`type`** — `dashboards` (reference another dashboard, filtered by `tags`) or `link` (external URL via `url`).
- **`title`** — display text.
- **`icon`** — icon identifier.
- **`tooltip`** — hover text.
- **`url`** — destination URL; required when `type` is `link`.
- **`tags`** — filter linked dashboards by tag; empty = all.
- **`asDropdown`** — collapse multiple links into a dropdown (default `false`).
- **`targetBlank`** — open in new tab (default `false`).
- **`includeVars`** — append current template variable values as query parameters (default `false`).
- **`keepTime`** — preserve current time range as query parameters (default `false`).

### Key differences from Classic

- **Kinds, not flat objects.** Every variable, layout container, element, and annotation has `kind` + `spec`.
- **Layout is explicit.** Classic uses absolute `gridPos`; V2 supports `GridLayout`, `AutoGridLayout`, `RowsLayout`,
  `TabsLayout`, with rows and tabs as first-class containers that can nest a layout.
- **Elements are referenced, not embedded.** Panels live in `spec.elements` (keyed map); layouts reference them by key.
- **`hide` is a string enum** (`dontHide` / `hideLabel` / `hideVariable`) instead of integer codes.
- **`Filters` (ad-hoc) splits into two kinds:** `AdhocVariable` for filtering, `GroupByVariable` for dimension rollup;
  Classic uses one `AdhocVariable` with mode toggles.
- **No `templating.list`/`annotations.list` wrappers.** V2 uses flat `variables` and `annotations` arrays.
- **`cursorSync`** replaces `graphTooltip` with string values (`Off`, `Crosshair`, `Tooltip`).
- **Conditional rendering** — `AutoGridLayoutItem`, `RowsLayoutRow`, `TabsLayoutTab` may carry a
  `ConditionalRenderingGroupKind` (`condition: "and" | "or"` over variable, data-presence, time-range-size rules).
  `GridLayoutItem` does not.

Prefer V2 for new dashboards authored as code. Prefer Classic when interoperating with the grafana.com gallery or older
provisioning pipelines that haven't migrated.

## Editing the JSON directly

Grafana UI: **Edit → Dashboard options → Settings → JSON Model**.

- `schemaVersion`, `version`, `id` are managed by Grafana; don't edit unless writing migrations.
- Saving from the JSON Model tab triggers schema migration if `schemaVersion` is behind.
- Version history keeps the last 20 saves by default; see `manage-dashboard-version-history` for restore semantics.
