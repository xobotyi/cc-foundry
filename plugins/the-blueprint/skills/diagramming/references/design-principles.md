# Visual Design Principles for Diagrams

Principles that make diagrams readable and aesthetically coherent. These are format-agnostic — they apply whether
generating Excalidraw JSON or Mermaid text.

## Gestalt Principles

Human perception organizes visual elements into patterns. These principles explain _why_ certain layouts feel clear and
others feel chaotic.

- **Uniform connectedness** (strongest) — elements connected by lines or enclosed in a common region are perceived as a
  group. Use frames/containers to group related components. Use arrows to show relationships.
- **Proximity** — elements close together are perceived as related. Group related nodes tightly; separate unrelated
  groups with whitespace. Minimum 2x the intra-group spacing between groups.
- **Similarity** — elements sharing color, shape, or size are perceived as related. Color is a stronger grouping signal
  than shape. Use consistent shapes for the same concept type (all databases are cylinders, all services are
  rectangles).
- **Good continuation** — the eye follows smooth, continuous paths. Avoid sharp direction changes in arrows. Use elbow
  (orthogonal) connectors instead of arbitrary diagonal lines.
- **Figure-ground** — negative space (whitespace) allows the brain to distinguish focus elements from background.
  Crowded diagrams fail because figure-ground separation collapses.
- **Closure** — the brain completes incomplete patterns. Dashed boundaries suggest logical grouping without visual
  heaviness.

## Layout Rules

### Grid System

- Align all elements to a virtual grid
- Use **multiples of 50px** for spacing in coordinate-based formats (Excalidraw): 50, 100, 150, 200
- Standard gaps:
  - Horizontal between elements: **200–300px**
  - Vertical between rows: **100–150px**
  - Between groups: **2x the intra-group gap** (minimum 300px)

### Flow Direction

- **Top-to-bottom** for hierarchies, decision trees, inheritance
- **Left-to-right** for processes, timelines, data flow, sequences
- Maintain **consistent direction** within a single diagram — never mix flow directions for the same type of
  relationship
- Place the most important element at the **top or center**

### Reading Order

- Follow **top-left to bottom-right** natural reading order
- Title in the top-left corner
- Legend (if needed) in the bottom-right
- Annotations and notes at the periphery, not between main elements

### Whitespace

- **60% background/whitespace, 30% primary content, 10% highlights** (the 60-30-10 rule applied to diagram canvas)
- Whitespace is not wasted space — it provides cognitive breathing room
- When in doubt, add more space between elements, not less
- Leave margins around the entire diagram (minimum 50px from any element to the conceptual canvas edge)

## Color

### Semantic Color Palette

Assign meaning to colors and use them consistently. This palette works for both light and dark backgrounds:

- **Blue** — information, input, user-facing: background `#a5d8ff`, stroke `#1971c2`
- **Green** — success, output, data stores: background `#b2f2bb`, stroke `#2f9e44`
- **Yellow** — warning, decisions, processing: background `#ffec99`, stroke `#f08c00`
- **Red** — error, danger, critical path: background `#ffc9c9`, stroke `#e03131`
- **Purple** — external systems, storage, special: background `#d0bfff`, stroke `#9c36b5`
- **Gray** — neutral, disabled, annotations: background `#e9ecef`, stroke `#868e96`

### Color Rules

- **Maximum 2–3 accent colors** per diagram. More creates visual noise.
- Use color to encode meaning (tier, status, domain) — not decoration.
- **Monochromatic schemes** for formal/professional diagrams: all shapes `#e9ecef` background with `#1e1e1e` stroke,
  highlight important items with `#a5d8ff`.
- Pair colors for accessibility: red with teal, green with magenta (accommodates red-green color blindness).
- Background fill should be light/muted; stroke should be saturated. Never use saturated fills — they overwhelm text.

## Typography

### Font Size by Purpose

- Main titles: **28–36px**
- Section headers: **24px**
- Box labels: **20px**
- Descriptions: **16px**
- Notes/annotations: **14px** (minimum for readability)
- Fine print: **12px** (use sparingly)

### Font Rules

- **Minimum font size: 14px** for any text that must be read
- Use **sentence case** for labels and descriptions
- Use **bold or all-caps** sparingly — only for main titles or critical labels
- Keep labels concise — if a label needs more than 5 words, the element needs decomposition
- Horizontal text only — never rotate text in diagrams (exception: axis labels at -45° when space-constrained)

### Font Families (Excalidraw-specific)

- `fontFamily: 1` (Virgil/Excalifont) — hand-drawn, casual. Use only for brainstorming/informal.
- `fontFamily: 2` (Helvetica/Nunito) — clean, professional. **Default for technical documentation.**
- `fontFamily: 3` (Cascadia) — monospace. Use for code snippets, technical identifiers, API names.
- `fontFamily: 5` (Excalifont) — the newer Excalidraw default. Acceptable for mixed-mode diagrams.

## Arrows and Edges

- **Prefer orthogonal (elbow) arrows** — 90-degree routing creates clean, professional diagrams
- **Minimize crossings** — edge crossings are the #1 readability killer. Rearrange nodes to reduce crossings before
  accepting any layout.
- **Bind arrows to shapes** — in Excalidraw, always bind arrows to element edges so they update when elements move
- **Label arrows** when the relationship isn't obvious from context — protocols (HTTP, gRPC), cardinality (1:N), actions
  (creates, reads)
- **Arrow style encodes meaning:**
  - Solid arrow — primary flow, main sequence
  - Dashed arrow — response, return, optional path
  - Dotted arrow — reference, dependency, weak association
  - No arrowhead (plain line) — association, grouping

## Complexity Budgets

Diagrams become unreadable past these thresholds. When a diagram exceeds its budget, split it.

- **Flowcharts:** 3–10 steps recommended, 15 maximum
- **Architecture diagrams:** 5–12 components recommended, 20 maximum
- **Relationship/ER diagrams:** 3–8 entities recommended, 12 maximum
- **Mind maps:** 4–6 main branches, 2–4 sub-topics per branch
- **Sequence diagrams:** 3–6 participants, 10–15 messages per diagram
- **General rule:** if the diagram has more than **20 elements** (nodes + significant labels), split it

### Splitting Strategy

When splitting a diagram:

1. Create a **high-level overview** showing major groups as single nodes
2. Create **detail diagrams** for each group
3. Use consistent naming and color coding across all diagrams in the set
4. Reference detail diagrams from the overview ("see detail: Authentication Flow")

## Anti-Patterns

- **Rainbow diagrams** — every element a different color with no semantic meaning
- **Spaghetti arrows** — arrows crossing everywhere because nodes weren't arranged to minimize crossings
- **Text walls** — long descriptions inside diagram elements instead of concise labels
- **Orphan elements** — nodes with no connections (if they're not connected, why are they in the diagram?)
- **Inconsistent shapes** — same concept type rendered as different shapes in different parts of the diagram
- **Missing legend** — using color/shape coding without explaining what the codes mean
- **Crowded layouts** — elements jammed together with no whitespace, making group boundaries invisible

## Tufte's Data-Ink Principle

Maximize the ratio of meaningful content to visual noise:

- Remove decorative borders, heavy grid lines, and redundant labels
- If an element can be removed without losing information, remove it
- Prefer subtle visual cues (light background tint) over heavy ones (thick borders, drop shadows)
- Every visual element should encode information — position, color, shape, size, connection should all mean something
