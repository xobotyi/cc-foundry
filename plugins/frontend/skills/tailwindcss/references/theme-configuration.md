# Theme Configuration Reference

## Entry Point

```css
@import "tailwindcss";
```

This imports `theme.css` (default tokens), `preflight.css` (base reset), and `utilities.css`.
No `@tailwind base/components/utilities` — those are v3 syntax.

---

## `@theme` Directive

`@theme` defines design tokens that generate utility classes. It is **not** equivalent to `:root`.

| Placement | Generates utility classes | Use for |
|-----------|--------------------------|---------|
| `@theme { ... }` | Yes | Design tokens that need utility classes |
| `:root { ... }` | No | CSS vars that don't need utilities |

Rules:
- Must be top-level (not nested under selectors or media queries)
- All values compile to `:root { ... }` CSS vars in output
- Only used CSS vars are emitted by default (use `static` option to force all)

### `@theme` Options

```css
@theme { ... }           /* default: only emit used vars */
@theme static { ... }    /* always emit all vars */
@theme inline { ... }    /* inline var() references into utility output */
```

Use `@theme inline` when a token references another variable — prevents CSS variable
resolution failures in the cascade:

```css
/* Without inline: font-sans may resolve incorrectly in some cascade positions */
@theme inline {
  --font-sans: var(--font-inter);
}
```

---

## Namespaces → Utility Classes

| Namespace | Generated utilities |
|-----------|---------------------|
| `--color-*` | `bg-*`, `text-*`, `border-*`, `ring-*`, `fill-*`, `stroke-*`, etc. |
| `--font-*` | `font-*` (font-family) |
| `--text-*` | `text-*` (font-size) |
| `--font-weight-*` | `font-*` (font-weight) |
| `--tracking-*` | `tracking-*` (letter-spacing) |
| `--leading-*` | `leading-*` (line-height) |
| `--breakpoint-*` | Responsive variants: `sm:*`, `md:*`, etc. |
| `--container-*` | Container query variants: `@sm:*`, and `max-w-*` |
| `--spacing-*` or `--spacing` | `px-*`, `py-*`, `m-*`, `w-*`, `h-*`, etc. |
| `--radius-*` | `rounded-*` |
| `--shadow-*` | `shadow-*` |
| `--inset-shadow-*` | `inset-shadow-*` |
| `--drop-shadow-*` | `drop-shadow-*` |
| `--blur-*` | `blur-*` |
| `--perspective-*` | `perspective-*` |
| `--aspect-*` | `aspect-*` |
| `--ease-*` | `ease-*` |
| `--animate-*` | `animate-*` |

Breakpoints generate **variants**, not utilities. Colors generate multiple utility families
(`bg-*`, `text-*`, `border-*`, etc.) from a single namespace.

---

## Extending vs. Replacing vs. Resetting

### Extend (add new tokens alongside defaults)

```css
@theme {
  --font-script: "Great Vibes", cursive;
  --breakpoint-3xl: 120rem;
  --color-mint-500: oklch(0.72 0.11 178);
}
```

### Override (replace a single default value)

```css
@theme {
  --breakpoint-sm: 30rem;  /* was 40rem */
}
```

### Reset a namespace (remove all defaults in that namespace, add custom)

```css
@theme {
  --color-*: initial;
  --color-white: #fff;
  --color-brand: oklch(0.65 0.22 260);
  --color-surface: oklch(0.98 0 0);
}
```

`--color-*: initial` removes ALL default color utilities. Only your custom values remain.

### Reset everything (fully custom theme)

```css
@theme {
  --*: initial;
  --spacing: 4px;
  --font-body: Inter, sans-serif;
  --color-primary: oklch(0.65 0.22 260);
}
```

---

## Colors

### OKLCH format (v4 default)

All v4 default colors use OKLCH. Use OKLCH for custom colors — perceptually uniform,
works reliably in CSS `color-mix()`.

```
oklch(lightness chroma hue)
oklch(0.72 0.11 178)   /* lightness: 0–1, chroma: 0–0.4+, hue: 0–360 */
```

Shorthand: `oklch(72% 0.11 178)` also valid. Default theme uses decimal form.

### Default palette

22 color families × 11 steps (50–950): `red`, `orange`, `amber`, `yellow`, `lime`, `green`,
`emerald`, `teal`, `cyan`, `sky`, `blue`, `indigo`, `violet`, `purple`, `fuchsia`, `pink`,
`rose`, `slate`, `gray`, `zinc`, `neutral`, `stone`. Plus `black` and `white`.

### Color utilities

Every `--color-*` token generates utilities across: `bg-*`, `text-*`, `decoration-*`,
`border-*`, `outline-*`, `shadow-*`, `inset-shadow-*`, `ring-*`, `inset-ring-*`,
`accent-*`, `caret-*`, `fill-*`, `stroke-*`.

### Opacity modifier

```html
<div class="bg-sky-500/50">...</div>       <!-- 50% opacity -->
<div class="bg-sky-500/[71.37%]">...</div> <!-- arbitrary opacity -->
<div class="bg-cyan-400/(--my-alpha)">...</div> <!-- CSS var opacity -->
```

### Referencing colors in CSS

```css
color: var(--color-blue-500);
background-color: --alpha(var(--color-gray-950) / 10%);
```

`--alpha()` compiles to `color-mix(in oklab, ...)`. Use it over `rgba()` for theme colors.

### Custom palette patterns

```css
/* Add custom colors */
@theme {
  --color-brand: oklch(0.65 0.22 260);
  --color-surface: oklch(0.98 0 0);
}

/* Replace entire palette */
@theme {
  --color-*: initial;
  --color-white: #fff;
  --color-brand: oklch(0.65 0.22 260);
}

/* Disable specific colors */
@theme {
  --color-lime-*: initial;
  --color-fuchsia-*: initial;
}

/* Reference another variable (use inline to avoid cascade issues) */
@theme inline {
  --color-canvas: var(--acme-canvas-color);
}
```

### Semantic token naming

Use semantic names for design system tokens — not palette references:

```css
/* Correct */
@theme {
  --color-primary: oklch(0.51 0.26 277);
  --color-surface: oklch(0.98 0 0);
  --color-error: oklch(0.58 0.24 27);
}

/* Wrong — palette references as design tokens */
@theme {
  --color-blue-brand: oklch(0.51 0.26 277);
}
```

---

## Dark Mode

### Default: `prefers-color-scheme` media query

```html
<div class="bg-white dark:bg-gray-900">...</div>
```

No configuration needed. `dark:` variant uses `@media (prefers-color-scheme: dark)`.

### Manual toggle: class-based

Override the `dark` variant with `@custom-variant`:

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));
```

Now `dark:` utilities apply when `.dark` class is present on any ancestor:

```html
<html class="dark">
  <div class="bg-white dark:bg-gray-900">...</div>
</html>
```

### Manual toggle: data attribute

```css
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));
```

```html
<html data-theme="dark">...</html>
```

### Three-way toggle (system / light / dark)

Requires inline `<head>` script to prevent FOUC — never in a deferred bundle:

```js
// Must be inline in <head>
document.documentElement.classList.toggle(
  "dark",
  localStorage.theme === "dark" ||
    (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches)
);
```

**FOUC rule:** Theme detection must run before paint. Deferred JS causes flash of wrong theme.

---

## Content Detection (`@source`)

Tailwind auto-scans all project files **except**: `.gitignore`d files, `node_modules`,
binary files, CSS files, and lock files.

### Register additional sources

```css
@source "../node_modules/@my-company/ui-lib";
@source "../packages/shared-components";
```

Required for: npm packages with Tailwind classes, monorepo packages outside auto-detection.

### Set base path

```css
@import "tailwindcss" source("../src");
```

Useful in monorepos where build commands run from repo root.

### Exclude paths

```css
@source not "../src/components/legacy";
```

Reduces scan scope. Use for large directories that don't use Tailwind.

### Disable auto-detection

```css
@import "tailwindcss" source(none);

@source "../admin";
@source "../shared";
```

### Safelist (force generation)

```css
@source inline("underline");
@source inline("{hover:,focus:,}underline");
@source inline("{hover:,}bg-red-{50,{100..900..100},950}");
```

`@source inline()` uses brace expansion. Use for: CMS content, database-driven classes,
classes that exist only at runtime.

### Explicitly exclude from generation

```css
@source not inline("{hover:,focus:,}bg-red-{50,{100..900..100},950}");
```

---

## Sharing Theme Across Projects

Put `@theme` in a standalone CSS file and import it:

```css
/* packages/brand/theme.css */
@theme {
  --*: initial;
  --color-brand: oklch(0.65 0.22 260);
}

/* app/app.css */
@import "tailwindcss";
@import "../packages/brand/theme.css";
```

---

## Referencing Theme Vars in JavaScript

```js
// CSS vars work directly in JS APIs
motion.div animate={{ backgroundColor: "var(--color-blue-500)" }}

// Resolved value (rarely needed)
const val = getComputedStyle(document.documentElement).getPropertyValue("--shadow-xl");
```

---

## V3 → V4 Migration Gotchas

| V3 | V4 |
|----|----|
| `tailwind.config.js` theme | `@theme { ... }` in CSS |
| `theme.extend.colors.brand` | `--color-brand: oklch(...)` in `@theme` |
| `theme(colors.red.500)` | `var(--color-red-500)` |
| `bg-opacity-50` | `bg-black/50` (opacity modifier) |
| `bg-gradient-to-r` | `bg-linear-to-r` |
| `shadow-sm` (v3 small) | `shadow-xs` (scale shifted) |
| `rounded` (v3 small) | `rounded-sm` (scale shifted) |
| `!bg-red-500` (important prefix) | `bg-red-500!` (important suffix) |
| `ring` (3px blue) | `ring-3` (v4 default is 1px currentColor) |
| `outline-none` | `outline-hidden` |
| `bg-[var(--brand)]` | `bg-(--brand)` (v4 CSS var shorthand) |
| `safelist` in config | `@source inline("class-name")` |

**`@config` directive:** Use only for incremental v3→v4 migration. `corePlugins`,
`safelist`, and `separator` from JS config are not supported in v4.
