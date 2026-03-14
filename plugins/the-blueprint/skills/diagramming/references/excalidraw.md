# Excalidraw Reference

Excalidraw diagrams are JSON files with full control over element position, size, and styling. This makes them ideal for
diagrams requiring precise layout — but it means the agent must handle spatial reasoning explicitly.

## File Structure

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "https://excalidraw.com",
  "elements": [],
  "appState": {
    "viewBackgroundColor": "#ffffff",
    "gridSize": 20
  },
  "files": {}
}
```

- `elements` — array of all diagram elements (shapes, text, arrows)
- `appState` — canvas configuration (background color, grid)
- `files` — image data for embedded images (rarely needed for agent-generated diagrams). **Must always be present** as
  `{}` even if empty — omitting it can cause rendering failures.

Save as `<descriptive-name>.excalidraw`. Open via excalidraw.com (drag-and-drop), VS Code Excalidraw extension, or
Obsidian Excalidraw plugin.

## Required Base Properties

Every element must include these properties or it will not render:

```json
{
  "id": "unique-id",
  "type": "rectangle",
  "x": 100,
  "y": 200,
  "width": 200,
  "height": 100,
  "angle": 0,
  "strokeColor": "#1e1e1e",
  "backgroundColor": "transparent",
  "fillStyle": "solid",
  "strokeWidth": 2,
  "strokeStyle": "solid",
  "roughness": 0,
  "opacity": 100,
  "groupIds": [],
  "frameId": null,
  "index": "a0",
  "isDeleted": false,
  "seed": 1000,
  "version": 1,
  "versionNonce": 100000,
  "updated": 1700000000000,
  "link": null,
  "locked": false,
  "boundElements": null,
  "roundness": { "type": 3 }
}
```

**Property notes:**

- `seed` — random integer for deterministic hand-drawn rendering. Use incrementing integers (1000, 1001, 1002...)
- `version` — always `1` for new diagrams
- `versionNonce` — random integer; use `seed * 100` for simplicity
- `index` — fractional indexing string for z-order: `"a0"`, `"a1"`, ... `"a9"`, `"aA"`, ... `"aZ"`, `"aa"`, `"ab"`, etc.
  Text elements must get higher index values than shapes/arrows to render on top.
- `angle` — rotation in radians. Use `0` unless rotation is needed.
- `link` — URL string that makes elements clickable in the Excalidraw UI. Use for linking nodes to docs or tickets.
- `locked` — prevents accidental edits when `true`
- `groupIds` — array of group ID strings (see Groups section)
- `frameId` — ID of parent frame element, or `null`
- `boundElements` — array of `{ "id": "...", "type": "arrow"|"text" }` referencing arrows or text bound to this element,
  or `null`

## Element Types

### Shapes: rectangle, ellipse, diamond

```json
{
  "type": "rectangle",
  "id": "step-1",
  "x": 100,
  "y": 200,
  "width": 200,
  "height": 100,
  "strokeColor": "#1e1e1e",
  "backgroundColor": "#a5d8ff",
  "fillStyle": "solid",
  "strokeWidth": 2,
  "strokeStyle": "solid",
  "roughness": 0,
  "opacity": 100,
  "roundness": { "type": 3 },
  "boundElements": [
    { "type": "text", "id": "step-1-label" },
    { "id": "arrow-1-to-2", "type": "arrow" }
  ]
}
```

**Roundness by shape type:**

- Rectangle: `{ "type": 3 }` for rounded corners, `null` for sharp corners
- Ellipse: always `null` (never `{ "type": 3 }`)
- Diamond: `{ "type": 2 }` for smooth curves, `null` for sharp

**Shape sizing guidelines:**

- Standard process box: `180x80`
- Diamond (decision): `140x100` — size 1.5x larger than rectangles because the usable interior is smaller (the visible
  diamond touches the midpoints of each side)
- Minimum for shapes with text: `80x60`
- Large container: `160x100+`

### Text Elements

Excalidraw has two text patterns: standalone and bound (container labels). The native format does **not** support a
`label` shorthand property on shapes — that is an MCP/CLI convenience that must be expanded into the two-element pattern
below.

#### Standalone text (titles, annotations)

```json
{
  "type": "text",
  "id": "title-1",
  "x": 100,
  "y": 50,
  "width": 0,
  "height": 0,
  "text": "System Architecture",
  "originalText": "System Architecture",
  "fontSize": 28,
  "fontFamily": 5,
  "textAlign": "left",
  "verticalAlign": "top",
  "strokeColor": "#1e1e1e",
  "backgroundColor": "transparent",
  "containerId": null,
  "lineHeight": 1.25,
  "autoResize": true,
  "roundness": null
}
```

`width: 0, height: 0` is fine — Excalidraw auto-calculates on first render. Both `text` and `originalText` must be
present.

#### Bound text (label inside a shape)

Requires **two elements** linked by a bidirectional binding:

**1. The shape** — lists the text in `boundElements`:

```json
{
  "type": "rectangle",
  "id": "step-1",
  "boundElements": [
    { "type": "text", "id": "step-1-label" }
  ]
}
```

**2. The text element** — references the shape via `containerId`:

```json
{
  "type": "text",
  "id": "step-1-label",
  "x": 120,
  "y": 225,
  "text": "User Service",
  "originalText": "User Service",
  "fontSize": 20,
  "fontFamily": 5,
  "textAlign": "center",
  "verticalAlign": "middle",
  "containerId": "step-1",
  "lineHeight": 1.25,
  "autoResize": true,
  "backgroundColor": "transparent",
  "roundness": null,
  "boundElements": []
}
```

**Critical rules for bound text:**

- `containerId` must match the parent shape's `id`
- Parent shape's `boundElements` must include `{ "type": "text", "id": "<text-id>" }`
- Always set `textAlign: "center"`, `verticalAlign: "middle"` for centered labels
- Always include `originalText`, `lineHeight: 1.25`, `autoResize: true`, `backgroundColor: "transparent"`
- Position `x, y` inside the shape bounds (center it manually: `x = shape.x + (shape.width - textWidth) / 2`)

**Font families:**

- `5` — Excalifont (current default, hand-drawn style — **use this**)
- `1` — Virgil (legacy hand-drawn)
- `2` — Helvetica (clean sans-serif, for formal technical docs)
- `3` — Cascadia (monospace, for code/technical labels)

**Font size guidelines:**

- Titles: `28-36`
- Section headers: `24`
- Box labels: `18-22`
- Body text / descriptions: `16`
- Annotations / notes: `14`

### Arrow and Line

```json
{
  "type": "arrow",
  "id": "arrow-1-to-2",
  "x": 300,
  "y": 250,
  "width": 200,
  "height": 0,
  "points": [[0, 0], [200, 0]],
  "strokeColor": "#1e1e1e",
  "strokeWidth": 2,
  "startArrowhead": null,
  "endArrowhead": "arrow",
  "lastCommittedPoint": null,
  "roundness": { "type": 2 }
}
```

**Points system:**

- `x, y` is the starting position on the canvas
- `points` are `[dx, dy]` offsets relative to `(x, y)`. First point is always `[0, 0]`.
- `width` = max x extent of points, `height` = max y extent of points (bounding box)
- For horizontal: `[[0, 0], [length, 0]]`
- For vertical: `[[0, 0], [0, length]]`
- For L-shaped: `[[0, 0], [dx, 0], [dx, dy]]`
- For smooth curves: use 3+ points with `"roundness": { "type": 2 }`

**Arrowhead options:** `"arrow"` (default), `"triangle"`, `"bar"`, `"dot"`, `null` (no head)

**Arrow style conventions:**

- Solid arrow — primary flow, main sequence
- Dashed arrow — response, return, async, optional
- Dotted arrow — reference, dependency
- No arrowhead (line) — association, grouping
- Thick solid (`strokeWidth: 4`) — critical path

**Lines** use the same structure as arrows but with `startArrowhead: null, endArrowhead: null`. Use
`"roundness": { "type": 2 }` for smooth curves through points.

#### Elbow Arrows

Elbow arrows follow 90-degree angles for clean, professional routing. They use A\* pathfinding to find the shortest
orthogonal path while avoiding connected shapes.

```json
{
  "type": "arrow",
  "id": "elbow-1",
  "elbowed": true,
  "roughness": 0,
  "roundness": null,
  "points": [[0, 0], [100, 0], [100, 150]]
}
```

All three properties are required: `elbowed: true`, `roughness: 0`, `roundness: null`.

### Arrow-to-Shape Binding

The most common failure in agent-generated diagrams is **floating arrows** — arrows that don't move with shapes. This
happens because binding requires a **bidirectional protocol**: both the arrow and each connected shape must reference
each other.

#### Complete binding example

**Shape A (source):**

```json
{
  "id": "shape-a",
  "type": "rectangle",
  "x": 100,
  "y": 200,
  "width": 180,
  "height": 80,
  "boundElements": [
    { "type": "text", "id": "shape-a-label" },
    { "id": "arrow-a-to-b", "type": "arrow" }
  ]
}
```

**Shape B (target):**

```json
{
  "id": "shape-b",
  "type": "rectangle",
  "x": 500,
  "y": 200,
  "width": 180,
  "height": 80,
  "boundElements": [
    { "type": "text", "id": "shape-b-label" },
    { "id": "arrow-a-to-b", "type": "arrow" }
  ]
}
```

**Arrow:**

```json
{
  "id": "arrow-a-to-b",
  "type": "arrow",
  "x": 280,
  "y": 240,
  "width": 220,
  "height": 0,
  "points": [[0, 0], [220, 0]],
  "startBinding": {
    "elementId": "shape-a",
    "focus": 0,
    "gap": 1,
    "fixedPoint": [1, 0.5]
  },
  "endBinding": {
    "elementId": "shape-b",
    "focus": 0,
    "gap": 1,
    "fixedPoint": [0, 0.5]
  },
  "startArrowhead": null,
  "endArrowhead": "arrow",
  "lastCommittedPoint": null
}
```

**Binding properties:**

- `elementId` — ID of the shape to bind to
- `focus` — position along target edge, `-1` to `1` (0 = center)
- `gap` — pixel distance from shape edge (use `1`)
- `fixedPoint` — normalized `[x, y]` anchor on the shape (0-1 range):
  - Right center: `[1, 0.5]`
  - Left center: `[0, 0.5]`
  - Top center: `[0.5, 0]`
  - Bottom center: `[0.5, 1]`

**Arrow positioning for bound arrows:**

- Arrow `x, y` should be at the source shape's edge, not its center
- Right edge: `x = shape.x + shape.width`, `y = shape.y + shape.height / 2`
- Bottom edge: `x = shape.x + shape.width / 2`, `y = shape.y + shape.height`
- Left edge: `x = shape.x`, `y = shape.y + shape.height / 2`
- Top edge: `x = shape.x + shape.width / 2`, `y = shape.y`

**Staggering multiple arrows from the same edge:** spread attachment points at 20%-80% across the edge width to prevent
overlap.

#### Labeled arrows

Arrow labels also use the two-element binding pattern:

```json
{
  "id": "arrow-a-to-b",
  "type": "arrow",
  "boundElements": [{ "type": "text", "id": "arrow-a-to-b-label" }]
}
```

```json
{
  "type": "text",
  "id": "arrow-a-to-b-label",
  "text": "HTTP/REST",
  "originalText": "HTTP/REST",
  "containerId": "arrow-a-to-b",
  "textAlign": "center",
  "verticalAlign": "middle"
}
```

### Frames

Group elements visually with a named frame. Child elements reference the frame via `frameId`.

```json
{
  "type": "frame",
  "id": "frame-backend",
  "x": 80,
  "y": 180,
  "width": 700,
  "height": 300,
  "name": "Backend Services",
  "roughness": 0
}
```

Child elements set `"frameId": "frame-backend"`. Size the frame to contain all children with ~20px padding. Use
`roughness: 0` for frames. Frame elements must appear before their children in the `elements` array for correct
rendering and clipping.

### Groups

Groups logically associate elements so they select together in the UI. Groups don't have their own element entry — they
exist only via `groupIds` references on elements.

```json
{
  "type": "rectangle",
  "id": "service-1",
  "groupIds": ["group-api-layer"]
}
```

- Generate descriptive group IDs: `"group-pipeline"`, `"group-deploy"`
- An element can belong to multiple groups (nested grouping)
- All grouped elements share the same group ID in their `groupIds` array

## Styling Properties

- `strokeColor` — border/line color (hex). Default: `#1e1e1e`
- `backgroundColor` — fill color (hex). Default: `transparent`
- `fillStyle` — `"solid"` (flat, clean), `"hachure"` (diagonal lines, hand-drawn feel), `"cross-hatch"` (good for
  "proposed"/"in-progress"). **Use `"solid"` for professional diagrams.**
- `strokeWidth` — `1` (thin), `2` (normal), `4` (bold)
- `strokeStyle` — `"solid"`, `"dashed"`, `"dotted"`
- `roughness` — `0` (Architect: clean precise lines), `1` (Artist: slight wobble), `2` (Cartoonist: full hand-drawn).
  **Use 0 for technical docs.**
- `opacity` — `0`–`100`. Default: `100`. Use `50` for background/context elements, `25` for ghost/watermark effects.
- `roundness` — `{ "type": 3 }` for rounded rectangle corners. `{ "type": 2 }` for smooth curves on ellipses/diamonds
  and arrows. `null` for sharp corners.

### Color Palette

Use semantic colors consistently. Follow the **60-30-10 rule**: 60% white space, 30% primary accent, 10% secondary
highlights.

| Role             | Background | Stroke    |
| ---------------- | ---------- | --------- |
| Standard / input | `#a5d8ff`  | `#1971c2` |
| Success / data   | `#b2f2bb`  | `#2f9e44` |
| Warning / decide | `#ffec99`  | `#f08c00` |
| Error / danger   | `#ffc9c9`  | `#e03131` |
| External / infra | `#d0bfff`  | `#9c36b5` |
| Neutral / notes  | `#e9ecef`  | `#868e96` |

**Monochromatic scheme** for minimal, professional look: all shapes `#e9ecef` background / `#1e1e1e` stroke, with
`#a5d8ff` for important items.

### Background Zones

For architecture diagrams, use semi-transparent dashed rectangles as visual grouping regions:

```json
{
  "type": "rectangle",
  "id": "zone-backend",
  "opacity": 35,
  "strokeStyle": "dashed",
  "roughness": 0,
  "backgroundColor": "#a5d8ff"
}
```

Declare background zones as the **first** elements in the array so they render behind everything else.

## ID Generation

Use descriptive IDs for readability and debugging:

- Shapes: `"step-1"`, `"decision-valid"`, `"db-users"`
- Arrows: `"arrow-1-to-2"`, `"arrow-api-to-db"`
- Labels: `"step-1-label"`, `"arrow-1-to-2-label"`
- Groups: `"group-pipeline"`, `"group-api-layer"`
- Frames: `"frame-backend"`, `"frame-frontend"`

## Element Ordering (Z-Index)

Elements render in array order. **Always** follow this declaration order:

1. **Background zones** — semi-transparent grouping rectangles
2. **Frames** — named container frames
3. **Shapes** — main nodes and containers
4. **Arrows** — connections between shapes
5. **Text elements** — labels and annotations (always last, renders on top)

This ensures text is never obscured by arrows or shapes.

## Layout Guidelines

### Spacing and Alignment

- **Grid alignment:** position on multiples of 20px (when `gridSize: 20`)
- **Horizontal gap:** 200-300px between related elements
- **Vertical gap:** 100-150px between rows
- **Arrow gap:** 40-60px between connected shapes
- **Canvas margins:** minimum 40-50px from edges
- **Target canvas area:** 0-1200 x 0-800 pixels
- **Frame padding:** ~20px around contained elements

### Complexity Management

Target **under 20 elements** per diagram. If complex, break into:

1. High-level overview (6-8 main components)
2. Detailed sub-diagrams for each subsystem

Recommended maximums by diagram type:

- Flowchart steps: 10-15
- Relationship entities: 8-12
- Mind map branches: 6-8
- Sub-topics per branch: 4-6

## Layout Templates

Pre-computed coordinate patterns for common topologies. Use these as starting points — adjust spacing based on label
lengths and element count.

### Linear Flow (left-to-right)

For processes, pipelines, data flow. Elements spaced 280px apart horizontally (180px box + ~100px gap):

```
Element 1: x=100,  y=200, width=180, height=80
Element 2: x=380,  y=200  (arrow from 1→2)
Element 3: x=660,  y=200  (arrow from 2→3)
Element 4: x=940,  y=200  (arrow from 3→4)
```

Title at `x=100, y=100, fontSize=28`.

### Vertical Flow (top-to-bottom)

For hierarchies, decision trees. Elements spaced 150px apart vertically:

```
Element 1: x=400, y=100
Element 2: x=400, y=300  (arrow from 1→2)
Element 3: x=400, y=500  (arrow from 2→3)
```

### Grid Layout

For relationship diagrams, ER diagrams. Elements arranged in rows and columns:

```
columns = ceil(sqrt(element_count))

Element[i]:
  x = start_x + (i % columns) * 300
  y = start_y + floor(i / columns) * 200
```

Example for 6 elements (3x2 grid):

```
(100, 200)  (400, 200)  (700, 200)
(100, 400)  (400, 400)  (700, 400)
```

### Hub-and-Spoke (radial)

For mind maps, star topologies. Central element with branches radiating outward:

```
Center: x=500, y=400, width=200, height=80

Branch[i]:
  angle = (2pi * i) / branch_count
  x = 500 + 250 * cos(angle)
  y = 400 + 250 * sin(angle)
```

### Tiered Architecture

For system architecture diagrams. Horizontal tiers stacked vertically:

```
Tier 1 (Client):     y=100,  elements at x=200, 500, 800
Tier 2 (API):        y=350,  elements at x=350, 650
Tier 3 (Services):   y=600,  elements at x=200, 500, 800
Tier 4 (Data):       y=850,  elements at x=350, 650
```

Use frames or background zones to group each tier. Vertical arrows between tiers.

### Decision Tree (binary branching)

For flowcharts with yes/no decisions:

```
Decision:      x=400, y=200  (diamond, 140x100)
Yes branch:    x=200, y=400  (arrow labeled "Yes")
No branch:     x=600, y=400  (arrow labeled "No")
```

Each subsequent level doubles width to prevent overlap:

```
Level 0: 1 node at x=400
Level 1: 2 nodes at x=200, x=600 (spread=200)
Level 2: 4 nodes at x=100, x=300, x=500, x=700 (spread=100)
```

## Diagram Type Conventions

### Flowcharts

- Start/end: `ellipse` (with "Start"/"End" labels)
- Process steps: `rectangle` (180x80)
- Decisions: `diamond` (140x100, label arrows "Yes"/"No")
- Flow direction: top-to-bottom or left-to-right
- Solid arrows for primary flow, dashed for return/optional paths

### Architecture Diagrams

- Services/components: `rectangle` with labels
- Databases: `rectangle` with green background (`#b2f2bb`)
- External systems: `rectangle` with purple background (`#d0bfff`)
- Group related services with frames or background zones
- Label arrows with protocols: HTTP, gRPC, SQL, AMQP
- Include a legend if using 3+ colors

### Sequence Diagrams

- Participants: `rectangle` at top, evenly spaced horizontally (250px apart)
- Lifelines: vertical dashed `line` from each participant
- Messages: horizontal `arrow` between lifelines
- Number messages in order
- Responses: dashed arrows going back
- Time flows top-to-bottom (messages 80px apart vertically)

### Entity Relationship Diagrams

- Entities: `rectangle` with entity name as label
- Include key fields as text elements below the entity name
- Relationships: `arrow` or `line` between entities
- Label with cardinality (1:N, M:N) and relationship name
- Use grid layout for entities
- Cardinality notation: `1`, `N`/`*`, `0..1`, `1..*`

## Validation Checklist

Before delivering a diagram, verify:

- [ ] All elements have unique IDs
- [ ] Every element has ALL required base properties (`angle`, `strokeStyle`, `opacity`, `groupIds`, `frameId`, `index`,
      `isDeleted`, `seed`, `version`, `versionNonce`, `updated`, `link`, `locked`)
- [ ] `index` values are assigned in order with text elements getting higher values than shapes/arrows
- [ ] Top-level JSON includes `"files": {}`
- [ ] Shapes with text use `boundElements` + separate text element with `containerId`
- [ ] Text elements inside containers have `containerId`, `originalText`, `lineHeight: 1.25`, `autoResize: true`,
      `roundness: null`, `backgroundColor: "transparent"`
- [ ] Arrows use `startBinding`/`endBinding` with `elementId`, `focus`, `gap` when connecting shapes
- [ ] Arrow elements include `lastCommittedPoint: null`, `startArrowhead: null`, `endArrowhead: "arrow"`
- [ ] Connected shapes list the arrow in their `boundElements` arrays
- [ ] Element order: zones/frames -> shapes -> arrows -> text elements
- [ ] Ellipses use `roundness: null` (not `{ "type": 3 }`)
- [ ] Coordinates prevent overlapping (check spacing)
- [ ] Text is readable (font size 16+)
- [ ] Colors follow consistent scheme
- [ ] File is valid JSON
- [ ] Element count is under 20 for clarity
