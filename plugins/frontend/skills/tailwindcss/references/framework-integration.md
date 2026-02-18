# Framework Integration

## Installation

### Vite (recommended)

```bash
npm install tailwindcss @tailwindcss/vite
```

```ts
// vite.config.ts
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss()],
});
```

```css
/* src/app.css */
@import "tailwindcss";
```

### PostCSS

```bash
npm install tailwindcss @tailwindcss/postcss
```

```js
// postcss.config.mjs
export default {
  plugins: {
    "@tailwindcss/postcss": {},
    // Remove postcss-import and autoprefixer — v4 handles both internally
  },
};
```

### CLI

```bash
npm install @tailwindcss/cli
npx @tailwindcss/cli -i input.css -o output.css
```

No `tailwind.config.js` in v4. Configuration lives in CSS via `@theme`.

---

## Preflight (Base Reset)

Automatically injected when using `@import "tailwindcss"`. Key behaviors:

| Element | Preflight behavior |
|---------|-------------------|
| All elements | `margin: 0; padding: 0; box-sizing: border-box; border: 0 solid` |
| `h1`–`h6` | Unstyled — same size/weight as body text |
| `ol`, `ul`, `menu` | No bullets or numbers |
| `img`, `svg`, `video`, etc. | `display: block; vertical-align: middle` |
| `img`, `video` | `max-width: 100%; height: auto` |
| `[hidden]` | `display: none !important` (except `hidden="until-found"`) |
| Buttons | `cursor: default` (v4; was `cursor: pointer` in v3) |
| Placeholder text | Current text color at 50% opacity (v4; was `gray-400` in v3) |
| `<dialog>` | Margins reset to 0 (v4) |

**Extending preflight** — add to `@layer base`:
```css
@layer base {
  h1 { font-size: var(--text-2xl); }
  h2 { font-size: var(--text-xl); }
  a  { color: var(--color-blue-600); text-decoration-line: underline; }
}
```

**Disabling preflight** — import parts individually:
```css
@layer theme, base, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
/* omit preflight.css */
@import "tailwindcss/utilities.css" layer(utilities);
```

When importing individually, flags go on their respective imports:
```css
/* source detection → utilities */
@import "tailwindcss/utilities.css" layer(utilities) source(none);

/* important flag → utilities */
@import "tailwindcss/utilities.css" layer(utilities) important;

/* theme(static) → theme */
@import "tailwindcss/theme.css" layer(theme) theme(static);

/* prefix → both */
@import "tailwindcss/theme.css" layer(theme) prefix(tw);
@import "tailwindcss/utilities.css" layer(utilities) prefix(tw);
```

**Third-party conflicts** — override Preflight in `@layer base`:
```css
@layer base {
  .google-map * { border-style: none; }
}
```

**Accessibility — unstyled lists:** VoiceOver does not announce `list-style: none` elements as
lists. Add `role="list"` if the content is semantically a list:
```html
<ul role="list">
  <li>One</li>
</ul>
```

---

## Prettier Plugin (Class Sorting)

```bash
npm install -D prettier prettier-plugin-tailwindcss
```

```js
// prettier.config.mjs
export default {
  plugins: ["prettier-plugin-tailwindcss"],
};
```

Sorts classes to canonical order automatically. Do not manually sort. The plugin works with
custom Tailwind configurations and integrates with every editor that supports Prettier.

Before/after example:
```html
<!-- before -->
<button class="text-white px-4 sm:px-8 py-2 bg-sky-700 hover:bg-sky-800">

<!-- after -->
<button class="bg-sky-700 px-4 py-2 text-white hover:bg-sky-800 sm:px-8">
```

---

## Editor Tooling

### VS Code / Cursor

Install **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`):
- Autocomplete for utility classes, `@theme` variables, directives
- Linting for CSS and markup
- Hover previews (shows generated CSS)
- Syntax highlighting for `@theme`, `@variant`, `@source`

If native CSS linting flags `@theme` or `@source` as errors, disable CSS validation for the
project or workspace.

### Zed

Built-in Tailwind CSS support (no extension needed): autocomplete, linting, hover previews.
Prettier plugin works when installed.

### JetBrains (WebStorm, PhpStorm)

Built-in intelligent Tailwind completions in HTML.

---

## CSS Modules, Vue/Svelte `<style>` Blocks

**Avoid** using CSS Modules or SFC `<style>` blocks with Tailwind. Each module is processed
separately — Tailwind runs once per file, causing slower builds and missing `@theme` context.

If you must use `<style>` blocks, import global styles as reference:
```html
<!-- Button.vue -->
<style scoped>
  @reference "../app.css";
  button { @apply bg-blue-500; }
</style>
```

Or use CSS variables directly (preferred — skips Tailwind processing entirely):
```html
<style scoped>
  button { background-color: var(--color-blue-500); }
</style>
```

**Do not use Sass, Less, or Stylus with Tailwind v4.** Tailwind is the preprocessor: it handles
`@import` bundling, nesting (via Lightning CSS), variables, and vendor prefixes. Using both is
redundant and incompatible.

---

## React Class Binding Patterns

**Conditional classes — use object map, not string concatenation:**
```tsx
// Static lookup — scanner sees full class names
const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-5 py-3 text-lg",
};

function Button({ size, children }) {
  return <button className={`font-bold ${sizes[size]}`}>{children}</button>;
}
```

**clsx — conditional class composition:**
```tsx
import clsx from "clsx";

function Button({ primary, disabled, className, children }) {
  return (
    <button
      className={clsx(
        "rounded-md px-4 py-2 font-medium",
        primary ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-900",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      {children}
    </button>
  );
}
```

**cva (class-variance-authority) — variant-based component API:**
```tsx
import { cva } from "class-variance-authority";

const button = cva("rounded-md font-medium", {
  variants: {
    intent: {
      primary: "bg-indigo-600 text-white hover:bg-indigo-700",
      secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
      danger: "bg-red-600 text-white hover:bg-red-700",
    },
    size: {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-base",
      lg: "px-6 py-3 text-lg",
    },
  },
  defaultVariants: { intent: "primary", size: "md" },
});

function Button({ intent, size, className, children }) {
  return <button className={button({ intent, size, className })}>{children}</button>;
}
```

**cn — merge + deduplicate (tailwind-merge + clsx):**
```tsx
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Allows prop overrides to win over defaults
function Card({ className, children }) {
  return <div className={cn("rounded-lg bg-white p-4 shadow", className)}>{children}</div>;
}
// <Card className="bg-gray-50" /> → bg-gray-50 wins over bg-white
```

Use `twMerge` when a component accepts a `className` prop that should override internal
defaults. Without it, both conflicting classes appear and CSS source order determines the winner
(which may not be the override).

---

## Vue / Svelte Class Binding Patterns

**Vue:**
```html
<template>
  <!-- Object syntax -->
  <button :class="{ 'bg-indigo-600': primary, 'bg-gray-100': !primary }">

  <!-- Array syntax with clsx -->
  <button :class="cn('rounded-md px-4 py-2', primary && 'bg-indigo-600 text-white')">
</template>
```

**Svelte 5:**
```svelte
<script>
  import { cn } from "$lib/utils";
  let { primary, class: className } = $props();
</script>

<button class={cn("rounded-md px-4 py-2", primary && "bg-indigo-600", className)}>
  <slot />
</button>
```

---

## color-scheme Utilities

Controls how browser-native UI elements (date pickers, scrollbars, form controls) render.

| Class | CSS |
|-------|-----|
| `scheme-light` | `color-scheme: light` |
| `scheme-dark` | `color-scheme: dark` |
| `scheme-light-dark` | `color-scheme: light dark` |
| `scheme-only-light` | `color-scheme: only light` |
| `scheme-only-dark` | `color-scheme: only dark` |
| `scheme-normal` | `color-scheme: normal` |

Apply on `<html>` to match native UI to theme:
```html
<html class="scheme-light dark:scheme-dark">
```

For explicit dark mode enforcement (no system preference):
```html
<html class="scheme-only-dark">
```

---

## forced-color-adjust Utilities

Controls behavior in Windows High Contrast / forced colors mode.

| Class | CSS |
|-------|-----|
| `forced-color-adjust-auto` | `forced-color-adjust: auto` — respects forced colors |
| `forced-color-adjust-none` | `forced-color-adjust: none` — opts out of forced colors |

**When to use `forced-color-adjust-none`:** Color swatches, custom radio/checkbox UI, or any
element where enforcing forced colors would destroy essential visual information (e.g., a color
picker showing color options).

```html
<fieldset>
  <legend class="sr-only">Choose a color</legend>
  <div class="forced-color-adjust-none grid grid-flow-col gap-3">
    <label>
      <input type="radio" class="sr-only" value="White" />
      <span class="sr-only">White</span>
      <span class="size-6 rounded-full bg-white border border-black/10"></span>
    </label>
  </div>
</fieldset>
```

Always include a `sr-only` text label when using `forced-color-adjust-none` on color UI — the
visual meaning is lost in forced colors mode, so accessible text is required.

**Restoring at larger breakpoints:**
```html
<!-- Custom color swatches on mobile, native select on desktop -->
<fieldset class="forced-color-adjust-none lg:forced-color-adjust-auto">
  <select class="hidden lg:block">...</select>
  <div class="lg:hidden"><!-- color swatches --></div>
</fieldset>
```

**Testing:** Enable forced colors in DevTools (Rendering panel → Emulate CSS media feature
`forced-colors: active`).

**`forced-colors` variant** — apply styles only in forced colors mode:
```html
<div class="forced-colors:outline forced-colors:outline-2">
```
