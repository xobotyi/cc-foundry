# Responsive Design

Modern responsive CSS: fluid sizing, container queries, media queries,
and logical properties.

## Responsive Hierarchy

Use the right tool for each level of responsiveness:

| Level | Tool | When |
|-------|------|------|
| Content-driven | Flexbox wrapping, `min()`/`max()`/`clamp()` | Always -- baseline |
| Container-driven | Container queries, `cqi`/`cqw` units | Component adapts to parent size |
| Viewport-driven | Media queries, `vw`/`vh`/`dvh` units | Page-level layout changes |
| User preference | `prefers-*` media queries | Color scheme, motion, contrast |

**Design from the inside out:** Start with intrinsic sizing, add container
queries for component-level adaptation, use media queries only for
viewport-dependent elements (navigation, full-width sections).

## Fluid Sizing with `clamp()`

Replace fixed breakpoints with fluid ranges:

```css
/* Font size: 1rem minimum, fluid middle, 3rem maximum */
h1 {
  font-size: clamp(1.5rem, 1rem + 2.5vw, 3rem);
}

/* Spacing: fluid padding */
.section {
  padding: clamp(1rem, 5vw, 4rem) clamp(1rem, 3vw, 2rem);
}

/* Container width */
.container {
  width: min(100% - 2rem, 1200px);
  margin-inline: auto;
}
```

### Fluid Type Scale

```css
:root {
  --step-0: clamp(1rem, 0.5rem + 1.5vw, 1.25rem);
  --step-1: clamp(1.25rem, 0.75rem + 2vw, 1.75rem);
  --step-2: clamp(1.5rem, 1rem + 2.5vw, 2.5rem);
  --step-3: clamp(2rem, 1.25rem + 3vw, 3.5rem);
}
```

### Container-Relative Fluid Sizing

Replace `vw` with `cqi` for container-scoped fluid values:

```css
.card-wrapper {
  container-type: inline-size;
}

.card__title {
  font-size: clamp(1rem, 2.5cqi + 0.5rem, 2rem);
}

.card__content > * + * {
  margin-top: clamp(0.5rem, 1cqi + 0.5rem, 1.5rem);
}
```

## Media Queries

### Modern Syntax

Use range syntax (widely supported):

```css
/* Old */
@media (min-width: 768px) and (max-width: 1023px) { }

/* Modern -- preferred */
@media (768px <= width < 1024px) { }
@media (width >= 768px) { }
```

### Breakpoint Strategy

**Don't use fixed device breakpoints.** Let content determine breakpoints.

```css
/* Bad -- device-specific */
@media (min-width: 768px) { }   /* "tablet" */
@media (min-width: 1024px) { }  /* "desktop" */

/* Good -- content-driven */
@media (width >= 45rem) { }  /* when content needs more space */
```

**Use `rem` for breakpoints** -- respects user font size preferences.

### Single Container Max-Width

```css
/* One max-width, no fixed-width breakpoint ladder */
.container {
  width: min(100% - 2rem, 75rem);
  margin-inline: auto;
}
```

Avoid the pattern of multiple `max-width` values at different breakpoints.
It wastes space on intermediate viewport sizes.

### Height Queries

```css
/* Sticky header only when enough vertical space */
@media (height >= 40rem) {
  .site-header {
    position: sticky;
    top: 0;
  }
}
```

### Interaction Queries

```css
/* Hover effects only on devices with hover capability */
@media (hover: hover) {
  .card:hover { transform: translateY(-2px); }
}

/* Fine pointer (mouse) vs coarse (touch) */
@media (pointer: coarse) {
  .button { min-height: 44px; min-width: 44px; }
}
```

## User Preference Queries

### Color Scheme

```css
:root {
  color-scheme: light dark;

  --color-text: #1a1a1a;
  --color-bg: #ffffff;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-text: #e0e0e0;
    --color-bg: #121212;
  }
}
```

### Reduced Motion

```css
/* Default: with motion */
.element {
  transition: transform 0.3s ease;
}

@media (prefers-reduced-motion: reduce) {
  .element {
    transition: none;
  }
}

/* Or: progressive enhancement approach */
.element {
  transition: none;  /* default: no motion */
}

@media (prefers-reduced-motion: no-preference) {
  .element {
    transition: transform 0.3s ease;
  }
}
```

### High Contrast

```css
@media (prefers-contrast: more) {
  :root {
    --border-color: #000;
    --text-color: #000;
  }
}
```

## Logical Properties

Write CSS that adapts to writing direction (LTR/RTL) automatically.

```css
/* Physical (avoid for layout properties) */
margin-left: 1rem;
padding-right: 2rem;
border-top: 1px solid;
text-align: left;

/* Logical (preferred) */
margin-inline-start: 1rem;
padding-inline-end: 2rem;
border-block-start: 1px solid;
text-align: start;
```

### Mapping

| Physical | Logical (horizontal writing mode) |
|----------|-----------------------------------|
| `left`/`right` | `inline-start`/`inline-end` |
| `top`/`bottom` | `block-start`/`block-end` |
| `width` | `inline-size` |
| `height` | `block-size` |
| `margin-left` | `margin-inline-start` |
| `padding-top` | `padding-block-start` |
| `border-right` | `border-inline-end` |
| `text-align: left` | `text-align: start` |

### Shorthand

```css
/* Block (top/bottom) and inline (left/right) */
margin-block: 1rem 2rem;   /* block-start block-end */
margin-inline: auto;        /* both inline directions */
padding-block: 1rem;        /* same for both */
```

**Use logical properties for:**
- Margins, padding, borders (layout-sensitive)
- Text alignment
- Positioning offsets (`inset-inline-start` instead of `left`)

**Physical properties are fine for:**
- Visual effects not affected by writing direction (box-shadow offsets)
- Explicit design decisions that shouldn't flip

## Responsive Images

```css
img {
  max-width: 100%;
  height: auto;
  display: block;
}

/* Aspect ratio preservation */
.hero-image {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}
```

## Anti-Patterns

| Don't | Do |
|-------|------|
| Fixed device breakpoints (`768px`, `1024px`) | Content-driven breakpoints in `rem` |
| `px` for breakpoints | `rem` (respects user font size) |
| Multiple `max-width` ladder | `width: min(100% - 2rem, 75rem)` |
| `vw` units without clamp | `clamp(min, preferred, max)` |
| Font size in `vw` only (blows up on large screens) | `clamp()` with `rem` + `vw` |
| Hiding content with `display: none` at breakpoints | Restructure layout with flexbox/grid |
| Physical properties for layout | Logical properties |
| `@media (hover: hover)` without fallback | Progressive enhancement |
