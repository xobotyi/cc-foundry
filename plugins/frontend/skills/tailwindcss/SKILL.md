---
name: tailwindcss
description: >-
  Tailwind CSS v4 utility-first discipline: CSS-first configuration, design
  tokens via @theme, and principled class composition. Invoke whenever task
  involves any interaction with Tailwind CSS — writing, reviewing, refactoring,
  debugging, or understanding utility classes, theme configuration, custom
  utilities, dark mode, or Tailwind integration with frameworks.
---

# Tailwind CSS v4

**Utility classes are the default. Custom CSS is the escape hatch.**

<prerequisite>
**Tailwind builds on CSS fundamentals.** Before writing or reviewing
Tailwind code, invoke the `css` skill to load specificity, box model,
and layout knowledge.

```
Skill(frontend:css)
```

Skip only for trivial class additions where no CSS reasoning is needed.
</prerequisite>

Tailwind CSS uses CSS-first configuration: design tokens live in `@theme`,
custom utilities use `@utility`, and there is no JavaScript configuration
file. Constrain yourself to the design system; break out only with intention.

## Entry Point and Installation

1. Single import: `@import "tailwindcss";` — provides preflight reset, theme
   variables, and all utilities. No `@tailwind base/components/utilities` (v3 syntax)
2. Vite: install `@tailwindcss/vite` plugin. PostCSS: install `@tailwindcss/postcss`.
   CLI: `npx @tailwindcss/cli -i input.css -o output.css`
3. No `tailwind.config.js` in v4 — all configuration lives in CSS via `@theme`
4. Remove `postcss-import` and `autoprefixer` — v4 handles both internally
5. Do not use Sass, Less, or Stylus with Tailwind v4 — Tailwind is the
   preprocessor (handles `@import`, nesting, variables, vendor prefixes)

## Theme Configuration (`@theme`)

### Core Rules

1. `@theme` defines design tokens that generate utility classes — not equivalent
   to `:root`. Use `@theme` for values needing utilities; use `:root` for CSS
   variables that only need `var()` access
2. `@theme` must be top-level (not nested under selectors or media queries)
3. All `@theme` values compile to `:root { }` CSS vars in output
4. Only used CSS vars are emitted by default
5. Semantic token names: `--color-primary`, `--color-surface` — not
   `--color-blue-500` or `--color-gray-100`
6. OKLCH for custom colors: `oklch(0.72 0.11 178)` — perceptually uniform,
   works with CSS `color-mix()`

### `@theme` Options

| Option | Behavior |
|--------|----------|
| `@theme { }` | Default: only emit used vars |
| `@theme static { }` | Always emit all vars |
| `@theme inline { }` | Inline `var()` references into utility output |

Use `@theme inline` when a token references another variable — prevents
CSS variable resolution failures in the cascade.

### Namespace → Utility Mapping

| Namespace | Generated utilities |
|-----------|---------------------|
| `--color-*` | `bg-*`, `text-*`, `border-*`, `ring-*`, `fill-*`, `stroke-*`, etc. |
| `--font-*` | `font-*` (family) |
| `--text-*` | `text-*` (size) |
| `--font-weight-*` | `font-*` (weight) |
| `--tracking-*` | `tracking-*` |
| `--leading-*` | `leading-*` |
| `--breakpoint-*` | Responsive variants: `sm:*`, `md:*` |
| `--container-*` | Container query variants: `@sm:*`, and `max-w-*` |
| `--spacing-*` or `--spacing` | `px-*`, `py-*`, `m-*`, `w-*`, `h-*`, etc. |
| `--radius-*` | `rounded-*` |
| `--shadow-*` / `--inset-shadow-*` | `shadow-*` / `inset-shadow-*` |
| `--blur-*` | `blur-*` |
| `--ease-*` | `ease-*` |
| `--animate-*` | `animate-*` |

Breakpoints generate variants, not utilities. Colors generate multiple
utility families from a single namespace.

### Extending, Replacing, Resetting

- **Extend:** Add new tokens alongside defaults — just declare new vars in `@theme`
- **Override:** Redeclare a default var to change its value
- **Reset namespace:** `--color-*: initial` removes all defaults in that namespace
- **Reset everything:** `--*: initial` for fully custom theme
- **Disable specific colors:** `--color-lime-*: initial`

### Colors

- 22 color families x 11 steps (50-950) plus `black` and `white`
- Every `--color-*` token generates utilities across `bg-*`, `text-*`,
  `border-*`, `ring-*`, `fill-*`, `stroke-*`, etc.
- Opacity modifier: `bg-sky-500/50` — per-property, not whole-element
- `--alpha()` for CSS opacity: compiles to `color-mix(in oklab, ...)`
- Never use `bg-opacity-*` (removed in v4) — always `bg-color/opacity`

### Sharing Themes

Put `@theme` in a standalone CSS file and `@import` it after `@import "tailwindcss"`.

## Class Authoring

### Fundamental Rules

1. **Complete class names only.** Never concatenate or interpolate —
   `text-red-600` yes, `` `text-${color}-600` `` never. Tailwind scans
   source files as plain text
2. Map dynamic values to static class string lookups
3. **Prettier plugin for ordering.** Install `prettier-plugin-tailwindcss` —
   do not manually sort classes
4. **CSS variable shorthand:** `bg-(--brand-color)` — parenthesis syntax
   auto-wraps in `var()`. Do not use `bg-[var(--brand)]` (v3 verbose form)
5. **Modifiers stack left-to-right** (v4): `dark:lg:hover:bg-indigo-600`.
   v3 was right-to-left — reverse stacking order when migrating
6. **Arbitrary values for one-offs only.** Repeated values belong in `@theme`
7. **Important suffix:** `bg-red-500!` — the `!` goes at end, after all modifiers
8. **Conflict resolution:** Last class in the generated stylesheet wins, not last
   in the HTML attribute. Don't rely on attribute order — use conditional rendering
9. **Underscores = spaces** in arbitrary values: `grid-cols-[1fr_500px_2fr]`.
   Escape for literal underscore: `content-['hello\_world']`
10. **Type hints** for ambiguous CSS vars: `text-(length:--my-var)` for font-size,
    `text-(color:--my-var)` for text color

### Responsive Breakpoints (Mobile-First)

Unprefixed = all sizes. Prefix = that breakpoint **and up**.

| Prefix | Min-width | Prefix | Min-width |
|--------|-----------|--------|-----------|
| `sm:`  | 40rem (640px) | `xl:`  | 80rem (1280px) |
| `md:`  | 48rem (768px) | `2xl:` | 96rem (1536px) |
| `lg:`  | 64rem (1024px) | | |

- Don't use `sm:` to mean "mobile only" — it means 640px and up
- Unprefixed for mobile base, override at breakpoints
- Range targeting: `md:max-xl:flex` (only between md and xl)
- Arbitrary breakpoints: `min-[900px]:grid-cols-3`
- Custom breakpoints: define in `@theme { --breakpoint-xs: 30rem; }`

### Container Queries

- `@container` on parent, `@md:flex-row` on children
- Named containers: `@container/main` + `@sm/main:flex-col`
- Sizes range `@3xs` (16rem) through `@7xl` (80rem)
- Arbitrary: `@min-[475px]:flex-row`
- Customize via `--container-*` in `@theme`

### State Variants

- **Pseudo-classes:** `hover:`, `focus:`, `active:`, `visited:`, `focus-visible:`,
  `focus-within:`, `disabled:`, `required:`, `invalid:`, `checked:`, `read-only:`,
  `indeterminate:`, `first:`, `last:`, `odd:`, `even:`, `empty:`
- **Conditional:** `has-checked:` (element has checked descendant),
  `not-focus:` (element is NOT focused)
- **Group** (style children based on parent): `group` on parent,
  `group-hover:text-white` on child. Named groups: `group/item` +
  `group-hover/item:visible` for nested disambiguation
- **In-*:** Like group but without marking the parent: `in-focus:opacity-100`
- **Peer** (style based on preceding sibling): `peer` on sibling,
  `peer-invalid:visible` on target. Named peers for disambiguation
- **has-* variant:** `has-checked:bg-indigo-50`, `group-has-[a]:block`,
  `peer-has-checked:ring-2`

### Dark Mode

1. Default is `prefers-color-scheme` media query — `dark:` works without config
2. Manual toggle via `@custom-variant dark (&:where(.dark, .dark *));`
3. Data attribute: `@custom-variant dark (&:where([data-theme=dark],
   [data-theme=dark] *));`
4. **Prevent FOUC:** Theme-detection script must be inline in `<head>`,
   never in a deferred bundle
5. `color-scheme` for native UI: `scheme-light dark:scheme-dark` on `<html>`
   matches scrollbars and form controls to active theme

## Custom Utilities and Variants

### `@utility`

1. Custom utilities are inserted into the `utilities` layer automatically and
   support all variants (`hover:`, `focus:`, `lg:`, etc.)
2. Simple: `@utility content-auto { content-visibility: auto; }`
3. Complex with nesting:
   `@utility scrollbar-hidden { &::-webkit-scrollbar { display: none; } }`
4. Functional (accepts argument): use wildcard `@utility tab-*` with `--value()`
5. `--value()` resolution modes: `--value(--ns-*)` (theme key), `--value(integer)`
   (bare value), `--value([integer])` (arbitrary value), `--value("inherit")`
   (literal)
6. Multiple modes: `--value(--tab-size-*, integer, [integer])`
7. `--modifier()` reads the modifier portion (`text-lg/tight`)
8. Negative values: register separate `-utility-*` form
9. Prefer `@utility` and `@custom-variant` over JS plugins for new code

### `@custom-variant`

1. Shorthand:
   `@custom-variant theme-midnight (&:where([data-theme="midnight"] *));`
2. Block form with `@slot` for multiple rules or media queries
3. Override built-in `dark` variant for class-based toggling

### Other Directives

- **`@variant`:** Apply variants in custom CSS:
  `@variant dark { background: black; }`
- **`@apply`:** Compose utilities into custom CSS — last resort only. Place in
  `@layer components`. Single-element patterns only
- **`@reference`:** Import theme context in Vue/Svelte `<style>` blocks or CSS
  Modules without duplicating output CSS
- **`@plugin`:** Load JS plugins. CSS-native `@utility`/`@custom-variant`
  preferred
- **`@layer` precedence:** `base` < `components` < `utilities`. Utilities
  always win
- **`@source`:** Register additional scan paths, exclude paths, safelist with
  `@source inline()` using brace expansion

### Build-Time Functions

- `--alpha(var(--color-lime-300) / 50%)` → `color-mix(in oklab, ...)`
- `--spacing(4)` → `calc(var(--spacing) * 4)` — also valid in arbitrary values
- `theme()` is deprecated — use `var(--color-red-500)` instead

## Content Detection (`@source`)

1. Auto-scans all project files except `.gitignore`d, `node_modules`, binaries,
   CSS files, lock files
2. `@source "../node_modules/@my-company/ui-lib"` for external packages
3. `@source not "../src/legacy"` to exclude directories
4. `@source inline("underline")` for safelisting (brace expansion supported)
5. `@source not inline(...)` to explicitly exclude from generation
6. `@import "tailwindcss" source(none)` disables auto-detection entirely
7. `@import "tailwindcss" source("../src")` sets base scan path

## Component Extraction

1. **Template components over `@apply`.** In React/Vue/Svelte, extract a
   component. In server templates, extract a partial. `@apply` is the last resort
2. `@apply` only for single-element patterns — multi-element structures belong
   in template components
3. Place `@apply`-based classes in `@layer components` so utilities can override
4. Acceptable `@apply` uses: third-party library overrides, legacy HTML you
   don't control

## Layout

Use flex for 1D flow, grid for 2D placement. `gap` over margin hacks.

- `sr-only` for visually hidden, screen-reader accessible; `not-sr-only` to
  reverse. `hidden` removes from flow; `invisible` keeps space
- `absolute inset-0` (fill parent), `sticky top-0 z-10` (sticky header)
- `flex-1` (grow/shrink, ignore initial), `flex-auto` (respect initial),
  `flex-none` (fixed size)
- Grid: `grid-cols-<n>`, `col-span-<n>`, `col-span-full`, `grid-flow-dense`
- Gap: `gap-<n>`, `gap-x-<n>`, `gap-y-<n>` — works in both flex and grid
- `isolate` creates a new stacking context without `z-index`

See `references/layout.md` for full display, position, flexbox, grid,
alignment, order, and visibility utility catalogs.

## Sizing and Spacing

`--spacing` drives all spacing utilities. 1 unit = 0.25rem (4px).
Customize: `@theme { --spacing: 4px; }`.

### Key Patterns

- Width/height: `w-<n>`, `h-<n>` (spacing scale), `w-<fraction>` (percentage),
  `w-full`, `w-screen`, `w-dvw`, `h-dvh`. `size-<n>` sets both
- Min/max: `min-w-*`, `max-w-*`, `min-h-*`, `max-h-*`
- Padding: `p-*` (all), `px-*`/`py-*`, `ps-*`/`pe-*` (logical)
- Margin: same prefixes plus `auto` and negatives (`-mt-4`).
  `mx-auto` centers block elements
- Prefer `gap-*` with flex/grid over `space-x-<n>` / `space-y-<n>`

### Borders

- Width: `border`, `border-<n>`, per-side (`border-t`, `border-s`/`border-e`)
- **v4 default is `currentColor`** (v3 was `gray-200`) — always specify color
- Divide: `divide-x-<n>`, `divide-y-<n>`, `divide-{color}` between children

### Border Radius

**v4 scale shift:** `rounded` without suffix maps to `xs` size (was `md` in v3).
Per-side, per-corner, and logical variants (`rounded-s-*`, `rounded-ss-*`)
available. See `references/sizing-and-spacing.md` for the full scale table.

### Outlines and Box Model

- `outline-hidden` over `outline-none` — preserves outlines in forced-colors mode
- Focus pattern: `focus:outline-2 focus:outline-offset-2 focus:outline-sky-500`
- `box-border` (default), `box-content`; `overflow-auto`, `overflow-clip`
- `overscroll-contain` prevents scroll chaining

See `references/sizing-and-spacing.md` for the full spacing scale, width/height
keywords, container scale, viewport units, and box model details.

## Typography

### Key Rules

- Family: `font-sans`, `font-serif`, `font-mono`. Custom via `--font-*` in
  `@theme`
- Size: `text-xs` through `text-9xl` — each sets both `font-size` and default
  `line-height`. Override inline: `text-sm/6`, `text-lg/loose`
- Weight: `font-thin` (100) through `font-black` (900)
- `tabular-nums` for tables/pricing — composable, reset with `normal-nums`
- Prefer `text-start`/`text-end` over `text-left`/`text-right` for i18n
- `text-balance` for headings, `text-pretty` to prevent orphans in body text
- `truncate` for single-line overflow; `line-clamp-<n>` for multi-line
- Text shadow (v4 new): `text-shadow-sm` through `text-shadow-lg`

See `references/typography.md` for full font properties, text spacing,
styling, decoration, and text layout utility catalogs.

## Backgrounds and Effects

### Key v4 Changes

- **Gradient syntax:** `bg-linear-to-r` (not `bg-gradient-to-r`), `bg-radial`,
  `bg-conic`. Default interpolation is **oklab**
- **Shadow scale shifted by one step from v3.** `shadow-sm` in v3 =
  `shadow-xs` in v4
- **Ring default:** 1px currentColor (v3 was 3px blue) — use `ring-3` for
  thick rings
- Opacity modifier: `bg-{color}/{opacity}` — never `bg-opacity-*`

### SVG and Media

- `fill-current` inherits parent text color — idiomatic for icon components
- `object-cover` + explicit dimensions for images
- `aspect-square` (1/1), `aspect-video` (16/9), `aspect-3/2`

See `references/backgrounds-and-effects.md` for full gradient, shadow, ring,
filter, backdrop, and mask utility catalogs.

## Transforms and Animations

- Use specific transitions: `transition-colors`, `transition-transform`,
  `transition-opacity` — **never** `transition-all`
- Compose transforms freely: `rotate-45 scale-110 translate-x-4`
- Custom animations: define `--animate-*` and `@keyframes` in `@theme`
- 3D transforms: parent needs `transform-3d` for `translate-z-*`
- Backdrop blur for frosted glass: `backdrop-blur-sm bg-white/30`

See `references/transforms-and-animations.md` for full transition, animation,
2D/3D transform, filter, and mask utility catalogs.

## Motion and Accessibility

1. **Respect reduced motion.** Gate animations with `motion-safe:` or disable
   with `motion-reduce:transition-none`
2. `sr-only` / `not-sr-only` for screen reader accessibility
3. `forced-color-adjust-none` only for elements where forced colors destroys
   essential visual information — always include `sr-only` text label
4. `forced-colors:` variant for styles only in forced colors mode
5. Add `role="list"` on unstyled lists — VoiceOver doesn't announce
   `list-style: none` elements as lists

## Framework Integration

### Preflight

- Extends reset: headings unstyled, lists have no bullets, images are
  `display: block`
- **v4 changes:** buttons default `cursor: default`, placeholder is text color
  at 50% opacity
- Disable by importing `tailwindcss/theme.css` and
  `tailwindcss/utilities.css` individually

### CSS Modules / SFC `<style>`

Each module is processed separately — causes slower builds and missing `@theme`
context. Use `@reference "../app.css"` in `<style>` blocks, or prefer CSS
variables directly: `background-color: var(--color-blue-500)`.

### Class Binding

- **React:** `clsx` for conditional composition, `cva` for variant APIs,
  `cn` = `twMerge(clsx(...))` for className overrides
- **Vue:** `:class="{ 'bg-indigo-600': primary }"` or array with `cn()`
- **Svelte 5:** `class={cn("rounded-md", primary && "bg-indigo-600", className)}`

## Application

When **writing** Tailwind CSS:
- Apply all conventions silently — don't narrate rules being followed.
- Use utilities directly in markup. Reach for custom CSS only when
  utilities are insufficient.
- If an existing codebase contradicts a convention, follow the codebase
  and flag the divergence once.

When **reviewing** Tailwind CSS:
- Cite the specific violation and show the fix inline.
- Don't lecture — state what's wrong and how to fix it.

## References

| File | Contents |
|------|----------|
| `references/theme-configuration.md` | Theme tokens, `@theme` options, namespace mapping, color system |
| `references/class-authoring.md` | Class composition, variants, dark mode, breakpoints |
| `references/custom-utilities-and-variants.md` | `@utility`, `@custom-variant`, directives, `@source` |
| `references/layout.md` | Display, position, flexbox, grid, alignment, order utilities |
| `references/sizing-and-spacing.md` | Spacing scale, width/height, padding/margin, borders, box model |
| `references/typography.md` | Font properties, text spacing, styling, decoration, layout |
| `references/backgrounds-and-effects.md` | Gradients, shadows, rings, opacity, SVG, filters |
| `references/transforms-and-animations.md` | Transitions, animations, 2D/3D transforms, masks |
| `references/framework-integration.md` | Preflight, CSS Modules, class binding (React, Vue, Svelte) |

## Integration

The CSS skill is a prerequisite — it provides specificity, box model, and layout
knowledge that Tailwind abstracts but does not replace. Framework skills handle
class binding in each framework.

**Utility classes are the default. When in doubt, keep configuration in
`@theme` and styling in markup.**
