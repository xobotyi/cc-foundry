---
name: css
description: >-
  CSS conventions, layout systems, and modern patterns: predictable styles
  through low specificity and explicit cascade control. Invoke whenever task
  involves any interaction with CSS code — writing, reviewing, refactoring,
  debugging, or understanding stylesheets, SCSS, layout, or responsive design.
---

# CSS

**Predictability is the highest CSS virtue. If your styles require `!important`
to work, restructure the cascade.**

CSS rewards explicit, low-specificity selectors and intentional cascade
ordering. Prefer boring, readable patterns over clever one-liners.

## References

| Topic | Reference | Contents |
|-------|-----------|----------|
| Layout | `references/layout.md` | Flex shorthand values, grid details (subgrid, implicit rows, alignment), layout patterns |
| Modern CSS | `references/modern-css.md` | Extended modern CSS patterns and examples |
| SCSS | `references/scss.md` | `@forward` patterns, module configuration, built-in modules, file organization |
| Responsive | `references/responsive.md` | Extended responsive design patterns and examples |
| Methodologies | `references/methodologies.md` | Methodology patterns and architecture details |

## Selectors and Specificity

1. Single class selectors by default — keep specificity flat at 0-1-0
2. Never use ID selectors for styling — IDs are for anchors and JS hooks
3. Never qualify classes with elements — `.error` not `div.error`
4. Max nesting depth: 3 levels — deeper nesting couples CSS to DOM structure
5. Avoid `!important` — use cascade layers or restructure selectors instead;
   only valid use is in a low-priority reset layer for truly essential styles
6. Use `:where()` to zero-out specificity when needed —
   `:where(.card) .title` has 0-0-1 specificity
7. Use `:is()` with awareness — it takes the highest specificity of its arguments
8. Flatten nested selectors in SCSS — ability to nest does not mean you should

## Layout Systems

### Choosing Flexbox vs Grid

| Use Case | System |
|----------|--------|
| One-dimensional flow (row or column) | Flexbox |
| Two-dimensional layout (rows AND columns) | Grid |
| Content-driven sizing | Flexbox |
| Layout-driven sizing | Grid |
| Component internals (nav items, card content) | Flexbox |
| Page-level structure, complex arrangements | Grid |
| Items need to wrap naturally | Flexbox |
| Precise placement on named lines/areas | Grid |

Both work together — a grid item can be a flex container and vice versa.

### Flexbox

- Always use the `flex` shorthand — it sets intelligent defaults.
  See `references/layout.md` for the full shorthand value table
- `flex-flow: row wrap` combines `flex-direction` and `flex-wrap`
- Use `flex-wrap` with a `flex` basis for responsive layouts without media queries:
  `flex: 1 1 300px` wraps items when they can't maintain 300px minimum
- Centering: `display: flex; align-items: center; justify-content: center`
  or `margin: auto` on a flex child
- `gap` over margin hacks — works in both flexbox and grid
- Avoid `justify-content: space-between` with wrap — causes orphan gaps;
  prefer `gap` + `flex-wrap`

### CSS Grid

- `repeat(auto-fit, minmax(250px, 1fr))` is the canonical responsive grid — no media
  queries needed
- Prefer `auto-fit` over `auto-fill` — `auto-fit` expands columns to fill space;
  `auto-fill` keeps empty tracks
- Use named grid areas for page-level layouts — they auto-create named lines
- Never hardcode `px` widths on grid items — use `fr`, `minmax()`, or `auto`
- `grid-auto-flow: dense` fills visual holes — use carefully, it breaks
  visual/source order alignment (a11y concern)
- Never use `order` in ways that break logical reading order
- See `references/layout.md` for subgrid, implicit rows, alignment shorthands,
  and negative line numbers

### General Layout Rules

1. Never use `float` for layout — floats are for wrapping text around images
2. Intrinsic sizing first — use `flex-wrap`, `min()`, `max()`, `clamp()` before
   reaching for media queries
3. `gap` over margin hacks in both flexbox and grid

## CSS Nesting

1. Use `&` for pseudo-classes/elements and compound selectors —
   `&:hover`, `&::before`, `&.active`
2. Omit `&` for descendant selectors — `.card { .title {} }` works
3. `&` is required when the nested selector starts with a type selector —
   `& p {}` not `p {}`
4. Nesting at-rules (`@media`, `@supports`, `@container`) nest directly inside rules
5. Specificity: `:is()` wrapping applies in nesting — be aware that specificity
   may differ from the equivalent unnested selector
6. Max depth: 3 levels — same rule as flat CSS

## Cascade Layers (`@layer`)

1. Declare all layers at the top of the stylesheet in a single statement:
   `@layer reset, defaults, themes, components, utilities;`
2. First declared = lowest priority; un-layered styles always beat layered styles
3. `!important` reverses layer order — `!important` in the lowest layer wins over
   `!important` in higher layers
4. Import third-party CSS into sub-layers:
   `@import url('vendor.css') layer(vendor.bootstrap);`
5. Use `revert-layer` to roll back to the previous layer's value
6. `!important` in low layers is intentional — it means "this style is essential,
   don't override"
7. Don't create layers per-component — layers manage cascade priority between
   categories (reset vs component vs utility), not scope
8. Nested layers: `@layer components { @layer buttons, cards; }` —
   access via `@layer components.buttons`
9. Anonymous layers (`@layer { }`) can't be appended to later

## Container Queries

1. Define containment: `container-type: inline-size` on the wrapper
2. Name containers for targeting: `container: card / inline-size`
3. Query by name: `@container card (width > 400px) { }`
4. Unnamed queries hit the nearest ancestor container

### Container Query Units

| Unit | Meaning |
|------|---------|
| `cqw` / `cqh` | 1% of container width / height |
| `cqi` / `cqb` | 1% of container inline / block size |
| `cqmin` / `cqmax` | Smaller / larger of `cqi` or `cqb` |

Use `cqi` instead of `vw` for container-scoped fluid values:
`font-size: clamp(1rem, 2.5cqi + 0.5rem, 2rem)`

## Responsive Design

### Responsive Hierarchy

Design from the inside out — use the right tool for each level:

| Level | Tool | When |
|-------|------|------|
| Content-driven | Flexbox wrapping, `min()`/`max()`/`clamp()` | Always — baseline |
| Container-driven | Container queries, `cqi`/`cqw` units | Component adapts to parent |
| Viewport-driven | Media queries, `vw`/`vh`/`dvh` | Page-level layout changes |
| User preference | `prefers-*` media queries | Color scheme, motion, contrast |

### Core Rules

1. Mobile-first — default styles for small screens, enhance upward
2. Content-driven breakpoints — let content decide, not device sizes
3. `rem` for breakpoints: `@media (width >= 45rem)` not `(min-width: 768px)`
4. Use modern range syntax: `@media (768px <= width < 1024px)`
5. Logical properties for layout: `margin-inline-start` not `margin-left`
6. Container queries for component-level adaptation; media queries only for
   viewport-dependent elements (nav, header)
7. Respect user preferences: `prefers-reduced-motion`, `prefers-color-scheme`,
   `prefers-contrast`
8. Single container max-width pattern: `width: min(100% - 2rem, 75rem);
   margin-inline: auto` — avoid multiple `max-width` values at different breakpoints

### Fluid Sizing

- `clamp(min, preferred, max)` for fonts, spacing, and container widths
- Build a fluid type scale with custom properties:
  `--step-0: clamp(1rem, 0.5rem + 1.5vw, 1.25rem)`
- Never use `vw` alone for font size — it blows up on large screens;
  always pair with `clamp()` and `rem`
- Use `cqi` instead of `vw` for container-scoped fluid values

### Logical Properties

Use logical properties for layout-sensitive values (margins, padding, borders,
text alignment, positioning offsets). Physical properties are fine for visual
effects not affected by writing direction (e.g., box-shadow offsets).

| Physical | Logical |
|----------|---------|
| `left` / `right` | `inline-start` / `inline-end` |
| `top` / `bottom` | `block-start` / `block-end` |
| `width` / `height` | `inline-size` / `block-size` |
| `margin-left` | `margin-inline-start` |
| `padding-top` | `padding-block-start` |
| `text-align: left` | `text-align: start` |

Shorthands: `margin-block: 1rem 2rem` (block-start, block-end);
`margin-inline: auto` (both inline directions).

### User Preference Queries

1. Color scheme: declare `color-scheme: light dark` on `:root` and use
   `@media (prefers-color-scheme: dark)` for overrides
2. Reduced motion: either remove motion in `prefers-reduced-motion: reduce` or
   add motion only in `prefers-reduced-motion: no-preference` (progressive
   enhancement approach)
3. High contrast: `@media (prefers-contrast: more)`
4. Interaction: `@media (hover: hover)` for hover effects on capable devices;
   `@media (pointer: coarse)` for touch targets (min 44px)

### Responsive Images

- `img { max-width: 100%; height: auto; display: block; }`
- Use `aspect-ratio` + `object-fit: cover` for hero images

## The `:has()` Selector

Select elements based on descendants or siblings — the "parent selector."

1. Anchor to specific elements, not `body`, `:root`, or `*` — broad anchors
   force expensive re-evaluation on every DOM change
2. Use direct child (`>`) or sibling (`+`, `~`) combinators inside `:has()`
   to limit traversal scope
3. Cannot nest `:has()` inside `:has()`
4. Pseudo-elements are not valid inside `:has()`
5. `.layout:has(> .sidebar-open)` (good) not `body:has(.sidebar-open)` (bad)

## Custom Properties

1. Define design tokens on `:root` — scope overrides to components
2. Semantic naming: `--color-text-primary` not `--dark-gray`
3. Use kebab-case; prefix with category: `--color-`, `--spacing-`, `--font-`
4. Provide fallbacks for component-level variables:
   `var(--button-bg, var(--color-primary))`
5. Custom properties are case-sensitive — `--my-color` differs from `--My-Color`
6. Custom properties inherit by default (unlike most CSS properties)
7. Use `@property` for typed, animatable custom properties — enables type checking
   (invalid values fall back to `initial-value`), controlled inheritance
   (`inherits: false`), and transitions on custom properties

## View Transitions

1. `view-transition-name` must be unique per page at transition time
2. Keep transitions short — 200-400ms for UI, longer for page-level
3. Always respect `prefers-reduced-motion: reduce` for view transitions
4. Same-document (SPA): `document.startViewTransition(() => { /* update DOM */ })`
5. Cross-document (MPA): `@view-transition { navigation: auto; }`
6. Named transitions target specific elements via `::view-transition-group(name)`

## Box Model and Sizing

1. Always set `box-sizing: border-box` globally via reset
2. `rem` for font sizes and breakpoints — respects user preferences
3. `em` for component-relative spacing (padding that scales with font size)
4. Fluid sizing with `clamp()` — replace manual breakpoint ladders
5. `aspect-ratio` over padding hacks for maintaining proportions
6. No units on zero values — `margin: 0` not `margin: 0px`
   (except where required: `flex: 0 0 0px`)
7. Leading zero on decimals: `opacity: 0.5` not `opacity: .5`
8. Shorthand hex where possible: `#ebc` not `#eebbcc`

## SCSS / Dart Sass

### Module System

1. `@use` and `@forward` only — `@import` is deprecated (Dart Sass 1.80.0),
   removed in 3.0.0
2. `@use` must appear before any rules except `@forward`
3. Namespace defaults to the last component of the URL (without extension)
4. Members are scoped to the loading file — not globally available
5. Each module loaded exactly once — no duplicate CSS output
6. Namespace access: `variables.$primary` not global `$primary`
7. No-namespace `@use 'variables' as *` — use sparingly, only for own files
8. `math.div()` for division — the `/` operator is deprecated
9. Prefix private members with `-` or `_`
10. Prefer mixins over `@extend` — more predictable output; `@extend` produces
    unexpected selectors and doesn't work across media queries
11. Max nesting: 3 levels

`@forward` re-exports modules, supports prefixing and visibility control.
Module configuration uses `!default` variables and `@use ... with ()`.
See `references/scss.md` for `@forward` patterns, configuration passthrough,
built-in module usage, and file organization conventions.

### Migration

Use the official migrator: `sass-migrator module --migrate-deps entrypoint.scss`.
For built-in functions only: `sass-migrator module --built-in-only entrypoint.scss`.

## CSS Methodologies

### BEM (Block Element Modifier)

1. Blocks are standalone components: `.card`, `.nav`, `.form`
2. Elements are parts of a block (double underscore): `.card__title`, `.card__image`
3. Modifiers are variations (double hyphen): `.card--featured`, `.card__title--bold`
4. Never nest elements: `.card__header__title` is wrong — flatten to `.card__title`
   or create a new block
5. Modifiers don't exist alone — always pair with base class:
   `class="card card--featured"`
6. Use BEM in team projects, large codebases, projects without scoped styles
7. Skip BEM when using CSS Modules, utility-first CSS, or small projects

### CSS Modules

1. Use simple, descriptive class names — scoping eliminates conflict risk
2. One module per component
3. Compose shared styles: `composes: resetButton from './shared.module.css'`
4. Global escape hatch: `:global(.utility-class)` when needed
5. Pair with custom properties for theming (variables aren't scoped)

### Architecture (ITCSS)

Organize styles by specificity, low to high: Settings → Tools → Generic →
Elements → Objects → Components → Utilities. Maps naturally to cascade layers:
`@layer settings, generic, elements, objects, components, utilities;`

## Formatting

1. 2-space indentation, no tabs
2. One declaration per line
3. Semicolon after every declaration including the last
4. Space after colon: `color: red` not `color:red`
5. Opening brace on same line as selector
6. Blank line between rules
7. Lowercase everything (selectors, properties, values, hex colors)
8. Single quotes for attribute selectors and font names
9. Group declarations by category: layout → box model → typography →
   visual → interaction

## Application

When **writing** CSS:
- Apply all conventions silently — don't narrate each rule being followed.
- Use intrinsic sizing and fluid techniques before media queries.
- If an existing codebase contradicts a convention, follow the codebase and
  flag the divergence once.

When **reviewing** CSS:
- Cite the specific violation and show the fix inline.
- Don't lecture or quote the rule — state what's wrong and how to fix it.

```
Bad review comment:
  "According to CSS best practices, you should avoid using ID selectors
   for styling because they have high specificity."

Good review comment:
  "`#header` -> `.header` -- IDs create specificity 1-0-0, difficult to override."
```

## Integration

The coding skill governs workflow; this skill governs CSS implementation
choices. For SCSS, this single skill covers both CSS and SCSS conventions.

**Predictability is the highest CSS virtue. When in doubt, keep specificity low
and cascade explicit.**
