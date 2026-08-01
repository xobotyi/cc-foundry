# Dashboard JSON surgery

Recipes for editing dashboard JSON files with `jq` — map, extract, mutate, splice, validate — without loading the file
into context. Dashboard files run thousands of lines (Node Exporter Full: ~15,500); reading one whole or rewriting one
wholesale wastes context and invites wrong-panel edits among dozens of near-identical `fieldConfig` blocks.

All recipes verified with jq 1.7 against a Classic `schemaVersion: 41` dashboard.

## Contents

- [The row-nesting trap](#the-row-nesting-trap)
- [Mapping a dashboard](#mapping-a-dashboard)
- [Editing](#editing)
- [Validation](#validation)
- [V2 Resource dashboards](#v2-resource-dashboards)
- [Live instances](#live-instances)

---

## The row-nesting trap

Where a panel lives in Classic schema depends on the state of its row:

- **Expanded row** (`"collapsed": false`) — the row's own `panels` array is **empty**; its children are top-level
  siblings that follow the row object in the dashboard's `.panels` array.
- **Collapsed row** (`"collapsed": true`) — children are nested inside the row's `panels` array.

Both states coexist in one dashboard. Any recipe that only walks `.panels[]` silently misses every panel inside a
collapsed row. The canonical path expression covering every panel at both levels:

```
(.panels[], .panels[].panels[]?)
```

Valid as a query, as an assignment target, and inside `del()`. All recipes below build on it.

## Mapping a dashboard

Never read a dashboard file to "see what's in it" — ask jq.

Structure overview — counts and identity in one shot:

```bash
jq '{title, uid, schemaVersion,
     panels: (.panels | length),
     nested: ([.panels[].panels? // [] | length] | add),
     variables: [.templating.list[].name],
     annotations: (.annotations.list | length)}' dash.json
```

Panel inventory — id, type, title for every panel, rows included, in render order:

```bash
jq -r '(.panels[], .panels[].panels[]?) | [.id, .type, .title] | @tsv' dash.json
```

Row layout — which rows exist, their state, and how many panels each nests:

```bash
jq -r '.panels[] | select(.type == "row")
       | [.id, .collapsed, (.panels | length), .title] | @tsv' dash.json
```

Variables — name, type, query:

```bash
jq -r '.templating.list[]
       | [.name, .type, ((.query.query? // .query // "") | tostring)] | @tsv' dash.json
```

Inspect one panel (id from the inventory):

```bash
jq 'first((.panels[], .panels[].panels[]?) | select(.id == 78))' dash.json
```

## Editing

jq cannot edit in place. Write to a temp file and move:

```bash
jq '<filter>' dash.json > dash.json.tmp && mv dash.json.tmp dash.json
```

### Targeted mutation

For a single-field change, mutate the path directly — no extraction needed:

```bash
jq '((.panels[], .panels[].panels[]?) | select(.id == 3)
    | .fieldConfig.defaults.unit) = "reqps"' dash.json
```

Same shape for `gridPos` moves/resizes, title changes, threshold steps, datasource swaps. Select by `.id`, never by
title — titles duplicate across rows.

### Extract → edit → splice

For substantial work on one panel (rewriting queries, restructuring overrides), pull it into a small file, edit that
with normal file tools, splice it back:

```bash
jq 'first((.panels[], .panels[].panels[]?) | select(.id == 3))' dash.json > panel.json
# ... edit panel.json (a few hundred lines at most) ...
jq --slurpfile p panel.json \
   '((.panels[], .panels[].panels[]?) | select(.id == 3)) = $p[0]' dash.json > dash.json.tmp \
   && mv dash.json.tmp dash.json
```

### Add a panel

Write the new panel to its own file (omit `id` and `gridPos`), then append with a computed unique id and a slot below
existing content:

```bash
jq --slurpfile p new-panel.json '
  ([.panels[].id, .panels[].panels[]?.id] | max + 1) as $id
  | ([.panels[].gridPos | .y + .h] | max) as $y
  | .panels += [$p[0] | .id = $id | .gridPos = {h: 8, w: 12, x: 0, y: $y}]
' dash.json
```

Grid geometry: 24 columns wide, `h` in 30px row units, panels sharing `y` render side by side. To place a panel inside a
collapsed row, append to that row's `panels` array instead of the top level.

### Delete a panel

```bash
jq 'del((.panels[], .panels[].panels[]?) | select(.id == 3))' dash.json
```

Deleting a **collapsed** row removes its nested children with it; deleting an **expanded** row leaves its children in
place as ordinary top-level panels (they were siblings all along).

## Validation

Two steps, both mandatory, after every edit:

```bash
jq empty dash.json                                   # 1. syntax
diff <(jq -S . dash.json.bak) <(jq -S . dash.json)   # 2. semantic diff
```

The semantic diff must show **exactly the intended change and nothing else** — a one-line title edit shows one changed
line. Anything extra means the filter matched more than intended; restore the backup and fix the selector. Keep the
pre-edit copy until the diff is verified.

jq round-trips are safe: key order is preserved, output is 2-space indented, numbers keep their literals; a no-op pass
is byte-identical apart from a trailing newline added when missing.

For semantic checks beyond syntax (missing `$__rate_interval`, hardcoded datasources, template-variable hygiene),
[grafana/dashboard-linter](https://github.com/grafana/dashboard-linter) lints Prometheus-backed dashboards:
`dashboard-linter lint dash.json`.

## V2 Resource dashboards

V2 keeps panels in `.spec.elements` — a map keyed by element name — so access is direct and there is no nesting trap:

```bash
# inventory
jq -r '.spec.elements | to_entries[] | [.key, .value.kind, .value.spec.title] | @tsv' dash.json

# targeted mutation
jq '.spec.elements["panel-cpu"].spec.title = "CPU"' dash.json

# extract / splice
jq '.spec.elements["panel-cpu"]' dash.json > element.json
jq --slurpfile e element.json '.spec.elements["panel-cpu"] = $e[0]' dash.json
```

Position lives separately in `.spec.layout`: adding an element requires both the `elements` entry and a layout item
referencing its key; deleting one requires removing both. See `json-model.md` for layout kinds.

## Live instances

When the dashboard lives in a Grafana instance rather than a file: `gcx resources get dashboards -o json` pipes into
every mapping recipe above, and `gcx resources edit <kind>/<uid> -p '<patch>'` applies server-side JSON patches without
a full rewrite — see the `provisioning` skill's gcx reference. If the official Grafana MCP server (`mcp-grafana`) is
available, prefer its context-window tools — `get_dashboard_summary`, `get_dashboard_property` (JSONPath), and the
dashboard patch tool — over fetching full dashboard JSON.
