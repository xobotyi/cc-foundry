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

## Route to Reference

| Situation | Reference |
|-----------|-----------|
| `@theme`, design tokens, namespaces, colors, dark mode, `@source` | [theme-configuration.md](references/theme-configuration.md) |
| `@utility`, `@custom-variant`, `@plugin`, `@reference`, `@apply` | [custom-utilities-and-variants.md](references/custom-utilities-and-variants.md) |
| Class ordering, modifiers, arbitrary values, state variants | [class-authoring.md](references/class-authoring.md) |
| Vite/PostCSS setup, Prettier, class binding (React/Vue/Svelte) | [framework-integration.md](references/framework-integration.md) |
| Flexbox, grid, display, position, alignment, visibility | [layout.md](references/layout.md) |
| Width, height, padding, margin, borders, outlines, overflow | [sizing-and-spacing.md](references/sizing-and-spacing.md) |
| Font properties, text styling, text layout, lists | [typography.md](references/typography.md) |
| Backgrounds, gradients, shadows, opacity, SVG, interactivity | [backgrounds-and-effects.md](references/backgrounds-and-effects.md) |
| Transforms, transitions, animations, filters, masks, scroll snap | [transforms-and-animations.md](references/transforms-and-animations.md) |

Read the relevant reference before writing code in that area.

## Core Conventions

<conventions>

### Entry Point

```css
@import "tailwindcss";
```

Single import provides base reset (preflight), theme variables, and all
utilities. No other directives needed.

### Configuration

1. **`@theme` for design tokens.** Colors, spacing, fonts, breakpoints —
   all defined in `@theme` blocks in CSS.
2. **`@theme` generates utilities; `:root` does not.** Use `@theme` for
   values that need utility classes. Use `:root` for CSS variables that
   only need `var()` access. Putting everything in `@theme` bloats output.
3. **Reset before replacing.** `--color-*: initial` removes all default
   colors. Without the reset, defaults remain alongside custom values.
4. **Semantic token names.** `--color-primary`, `--color-surface`,
   `--color-error` — not `--color-blue-500` or `--color-gray-100`.
5. **OKLCH for custom colors.** `oklch(0.72 0.11 178)` — perceptually
   uniform, works with CSS `color-mix()`.
6. **`@source` for external content.** Register paths outside auto-detection:
   `@source "../node_modules/@my-company/ui-lib";`.

### Class Authoring

7. **Complete class names only.** Never concatenate or interpolate.
   `text-red-600` yes, `` `text-${color}-600` `` never. Tailwind scans
   source files as plain text — it cannot resolve expressions.
8. **Prettier plugin for ordering.** Install `prettier-plugin-tailwindcss`
   and let it enforce canonical order. Do not manually sort.
9. **CSS variable shorthand.** `bg-(--brand-color)` — parenthesis syntax
   auto-wraps in `var()`.
10. **Modifiers stack left-to-right.** `dark:lg:hover:bg-indigo-600`
    reads as "dark mode, large screen, on hover."
11. **Arbitrary values for one-offs only.** `bg-[#316ff6]` is fine used
    once; a repeated value belongs in `@theme`.
12. **Opacity via color modifier.** `bg-blue-500/50` for 50% opacity.
    `text-red-600/75` for text. Per-property, not whole-element.
13. **Important suffix.** `bg-red-500!` — the `!` goes at the end of
    the class name, after all modifiers.

### Dark Mode

14. **Default is `prefers-color-scheme`.** `dark:` uses media query
    unless overridden.
15. **`@custom-variant` for manual toggle.**
    `@custom-variant dark (&:where(.dark, .dark *));`
16. **Prevent FOUC.** Theme-detection script must be inline in `<head>`,
    not in a deferred bundle.
17. **`color-scheme` for native UI.** `scheme-light dark:scheme-dark` on
    `<html>` matches scrollbars and form controls to the active theme.

### Component Extraction

18. **Template components over `@apply`.** In React/Vue/Svelte, extract
    a component. In server templates, extract a partial. `@apply` is
    the last resort.
19. **`@apply` only for single-element patterns.** `.btn-primary` is
    acceptable. Multi-element structures belong in template components.
20. **Place component classes in `@layer components`.** Ensures utilities
    can still override them.

### Content Detection & Performance

21. **Never dynamically construct class names.** Map dynamic values to
    static class string lookups.
22. **`@source not` to exclude directories.** Reduces scan scope and
    avoids generating unused CSS.
23. **`@source inline()` for safelisting.** Force generation of classes
    from CMS or database content not visible in source files.

### Motion & Accessibility

24. **Respect reduced motion.** Gate animations with `motion-safe:` or
    disable with `motion-reduce:transition-none`.
25. **Specific transitions.** Use `transition-colors` or
    `transition-transform` — never `transition-all`.
26. **`outline-hidden` over `outline-none`.** `outline-hidden` preserves
    outlines in forced-colors mode for accessibility.

</conventions>

## Quick Syntax Reference

### Responsive (Mobile-First)

Unprefixed = all sizes. Prefix = that breakpoint **and up**.

| Prefix | Min-width | Prefix | Min-width |
|--------|-----------|--------|-----------|
| `sm:`  | 640px     | `xl:`  | 1280px    |
| `md:`  | 768px     | `2xl:` | 1536px    |
| `lg:`  | 1024px    |        |           |

```html
<div class="text-center sm:text-left">     <!-- centered on mobile, left sm+ -->
<div class="md:max-xl:flex">               <!-- flex only between md and xl -->
<div class="min-[900px]:grid-cols-3">      <!-- arbitrary breakpoint -->
```

### Container Queries

```html
<div class="@container">
  <div class="flex flex-col @md:flex-row">...</div>
</div>
```

### Gradients

```html
<div class="bg-linear-to-r from-cyan-500 to-blue-500"></div>
<div class="bg-radial from-sky-200 via-blue-400 to-indigo-900"></div>
<div class="bg-conic from-violet-700 via-sky-500 to-purple-500"></div>
```

### Shadows & Rings

| Class | Purpose |
|-------|---------|
| `shadow-xs` | Subtle elevation |
| `shadow-sm` | Card-level shadow |
| `shadow-md` | Dropdown / popover |
| `shadow-lg` / `shadow-xl` | Modal / dialog |
| `ring-3 ring-blue-500` | Focus ring (default ring = 1px currentColor) |
| `inset-shadow-sm` | Inner shadow |

### Composable Transforms & Filters

Transforms and filters compose directly — no wrapper class needed:

```html
<div class="rotate-45 scale-110 translate-x-4">      <!-- compose freely -->
<div class="blur-sm brightness-110 saturate-150">     <!-- filters compose too -->
<div class="backdrop-blur-sm bg-white/30">            <!-- frosted glass -->
```

### Dynamic Runtime Values

Set CSS variables inline, reference with utility shorthand:

```jsx
<button
  style={{ "--bg": color, "--bg-hover": hoverColor }}
  className="bg-(--bg) hover:bg-(--bg-hover)"
/>
```

## Anti-Patterns

| Incorrect | Correct | Reason |
|-----------|---------|--------|
| `` `bg-${color}-500` `` | `{ blue: "bg-blue-500" }[color]` | Scanner can't resolve expressions |
| `bg-[var(--brand)]` | `bg-(--brand)` | Parenthesis shorthand wraps in `var()` |
| `bg-opacity-50` | `bg-black/50` | Color modifier syntax for opacity |
| `@apply` for multi-element component | Extract template component | Utilities belong in markup |
| `:root { --color-x: ... }` for utilities | `@theme { --color-x: ... }` | Only `@theme` generates utility classes |
| `outline-none` | `outline-hidden` | Preserves forced-colors accessibility |
| `transition-all` | `transition-colors` | Transition only what changes |
| `ring` expecting thick ring | `ring-3` | Default ring is 1px currentColor |
| `theme(colors.red.500)` | `var(--color-red-500)` | CSS variables, not `theme()` function |

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

<examples>

**Bad review comment:**
```
"According to best practices, you should use @theme for design tokens."
```

**Good review comment:**
```
"Move this to CSS: `@theme { --color-brand: oklch(...); }` —
 @theme generates utility classes, :root does not."
```

</examples>

## Integration

This skill provides Tailwind-specific conventions alongside other skills:

1. **Coding** — Discovery, planning, verification discipline
2. **CSS** — Underlying stylesheet fundamentals (prerequisite — load first)
3. **Tailwind CSS** — Utility-first patterns, theme configuration (this skill)
4. **Framework skill** — Framework-specific class binding (React, Vue, Svelte)

The CSS skill is a prerequisite: it provides specificity, box model, and
layout knowledge that Tailwind abstracts but does not replace. Framework
skills handle how classes are bound to elements in each framework.

**Utility classes are the default. When in doubt, keep configuration in
`@theme` and styling in markup.**
