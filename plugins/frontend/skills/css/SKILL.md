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

## Route to Reference

| Situation | Reference |
|-----------|-----------|
| Flexbox, CSS Grid, alignment, responsive grids | [layout.md](references/layout.md) |
| Nesting, cascade layers, container queries, `:has()`, custom properties, view transitions | [modern-css.md](references/modern-css.md) |
| SCSS/Dart Sass, `@use`/`@forward`, module system, mixins, functions | [scss.md](references/scss.md) |
| Fluid sizing, media queries, logical properties, `clamp()`, breakpoints | [responsive.md](references/responsive.md) |
| BEM, CSS Modules, utility-first, ITCSS, formatting, selector strategy | [methodologies.md](references/methodologies.md) |

Read the relevant reference before writing code in that area.

## Core Rules

These apply to ALL CSS code. No exceptions.

### Selectors and Specificity

1. **Single class selectors by default.** Keep specificity flat at 0-1-0.
2. **Never use ID selectors for styling.** IDs are for anchors and JS hooks.
3. **Don't qualify classes with elements.** `.error` not `div.error`.
4. **Max nesting depth: 3 levels.** Deeper nesting couples CSS to DOM structure.
5. **Avoid `!important`.** Use cascade layers or restructure selectors instead.
   The only valid use is in a low-priority reset layer for truly essential styles.

### Layout

1. **Flexbox for one-dimensional flow.** Rows or columns of items.
2. **Grid for two-dimensional layout.** Rows AND columns simultaneously.
3. **Never use `float` for layout.** Floats are for wrapping text around images.
4. **`gap` over margin hacks.** Works in both flexbox and grid.
5. **`auto-fit` + `minmax()` for responsive grids.** No media queries needed.
6. **Intrinsic sizing first.** Use `flex-wrap`, `min()`, `max()`, `clamp()`
   before reaching for media queries.

### Box Model and Sizing

1. **Always set `box-sizing: border-box`** globally via reset.
2. **`rem` for font sizes and breakpoints.** Respects user preferences.
3. **`em` for component-relative spacing** (padding that scales with font size).
4. **Fluid sizing with `clamp()`.** Replace manual breakpoint ladders.
5. **`aspect-ratio` over padding hacks** for maintaining proportions.
6. **No units on zero values.** `margin: 0` not `margin: 0px`.

### Custom Properties

1. **Define design tokens on `:root`.** Scope overrides to components.
2. **Semantic naming.** `--color-text-primary` not `--dark-gray`.
3. **Provide fallbacks** in component-level variables:
   `var(--button-bg, var(--color-primary))`.
4. **Use `@property` for typed, animatable custom properties.**

### Responsive Design

1. **Mobile-first.** Default styles for small screens, enhance upward.
2. **Content-driven breakpoints.** Let content decide, not device sizes.
3. **`rem` for breakpoints.** `@media (width >= 45rem)` not `(min-width: 768px)`.
4. **Logical properties for layout.** `margin-inline-start` not `margin-left`.
5. **Container queries for component-level adaptation.**
   Media queries only for viewport-dependent elements (nav, header).
6. **Respect user preferences.** `prefers-reduced-motion`,
   `prefers-color-scheme`, `prefers-contrast`.

### SCSS

1. **`@use` and `@forward` only.** `@import` is deprecated.
2. **Namespace access.** `variables.$primary` not global `$primary`.
3. **`math.div()` for division.** The `/` operator is deprecated.
4. **Prefix private members with `-` or `_`.**
5. **Prefer mixins over `@extend`.** More predictable output.
6. **Max nesting: 3 levels.** Same rule as native CSS.

## Quick Anti-Pattern Reference

| Don't | Do |
|-------|------|
| `#header { }` | `.header { }` |
| `div.card { }` | `.card { }` |
| `color: red !important` | Fix cascade with layers or specificity |
| `float: left` for layout | `display: flex` or `display: grid` |
| `margin-left: 1rem` (layout) | `margin-inline-start: 1rem` |
| `@media (min-width: 768px)` | `@media (width >= 48rem)` |
| `font-size: 5vw` | `font-size: clamp(1rem, 0.5rem + 2vw, 3rem)` |
| `padding-bottom: 56.25%` (ratio) | `aspect-ratio: 16 / 9` |
| `.card .card-header .title` | `.card__title` (flat) |
| `@import 'variables'` (SCSS) | `@use 'variables'` |
| `$primary / 2` (SCSS) | `math.div($primary, 2)` |
| `lighten($color, 10%)` | `color.adjust($color, $lightness: 10%)` |
| `body:has(.sidebar)` | `.layout:has(> .sidebar)` (specific anchor) |
| `color: #eebbcc` | `color: #ebc` |
| `opacity: .5` | `opacity: 0.5` |
| `margin: 0px` | `margin: 0` |

## Application

When **writing** CSS:
- Apply all conventions silently -- don't narrate each rule being followed.
- Use intrinsic sizing and fluid techniques before media queries.
- If an existing codebase contradicts a convention, follow the codebase and
  flag the divergence once.

When **reviewing** CSS:
- Cite the specific violation and show the fix inline.
- Don't lecture or quote the rule -- state what's wrong and how to fix it.

```
Bad review comment:
  "According to CSS best practices, you should avoid using ID selectors
   for styling because they have high specificity."

Good review comment:
  "`#header` -> `.header` -- IDs create specificity 1-0-0, difficult to override."
```

## Integration

This skill provides CSS-specific conventions alongside the **coding** skill:

1. **Coding** -- Discovery, planning, verification discipline
2. **CSS** -- Stylesheet conventions and patterns
3. **Coding** -- Final verification

The coding skill governs workflow; this skill governs CSS implementation choices.

For SCSS projects, this single skill covers both CSS and SCSS conventions.
For framework-specific component styling (React, Vue, Svelte), the respective
framework skill adds component-level patterns on top of this skill.

**Predictability is the highest CSS virtue. When in doubt, keep specificity low
and cascade explicit.**
