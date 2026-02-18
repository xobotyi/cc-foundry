# Class Authoring

## Class Name Rules

**Complete names only.** Tailwind scans source files as plain text — it cannot resolve expressions.

```
// NEVER
const cls = `text-${color}-600`         // broken: scanner sees only the template literal
const cls = "text-" + size              // broken: concatenation invisible to scanner

// ALWAYS
const map = { red: "text-red-600", blue: "text-blue-600" }
const cls = map[color]                  // works: full class names present in source
```

**No dynamic construction** — even with TypeScript types. Map values to static strings.

---

## Modifier Syntax

Variants prefix the utility with `variant:`. Stack left-to-right, each narrowing the condition.

```
hover:bg-sky-700            // hover state
dark:bg-gray-800            // dark mode
sm:grid-cols-3              // responsive breakpoint ≥ 40rem
dark:lg:hover:bg-indigo-600 // dark mode AND ≥ 64rem AND hover
```

**v4 stacking order is left-to-right** (v3 was right-to-left). When migrating stacked variants
involving `*` or `prose-*`, reverse the order.

```
// v3
first:*:pt-0
// v4
*:first:pt-0
```

---

## Responsive Breakpoints

Mobile-first: unprefixed utilities apply to all sizes; prefixed apply at that breakpoint and up.

| Prefix | Min-width     |
|--------|---------------|
| `sm`   | 40rem (640px) |
| `md`   | 48rem (768px) |
| `lg`   | 64rem (1024px)|
| `xl`   | 80rem (1280px)|
| `2xl`  | 96rem (1536px)|

```html
<!-- mobile-first: no prefix for base, prefix for larger -->
<img class="w-16 md:w-32 lg:w-48" />

<!-- DON'T use sm: to mean "mobile only" -->
<div class="sm:text-center">  <!-- only centers ≥640px, not on mobile -->

<!-- DO: unprefixed for mobile, override at breakpoints -->
<div class="text-center sm:text-left">
```

**Range targeting:**
```html
<div class="md:max-xl:flex">   <!-- only between md and xl -->
<div class="md:max-lg:flex">   <!-- only at md breakpoint -->
```

**Arbitrary breakpoints:**
```html
<div class="min-[320px]:text-center max-[600px]:bg-sky-300">
```

**Custom breakpoints via `@theme`:**
```css
@theme {
  --breakpoint-xs: 30rem;
  --breakpoint-*: initial;   /* reset all defaults first if needed */
  --breakpoint-tablet: 40rem;
}
```

---

## Container Queries

```html
<div class="@container">
  <div class="flex flex-col @md:flex-row">...</div>
</div>

<!-- Named containers for nested scenarios -->
<div class="@container/main">
  <div class="flex @sm/main:flex-col">...</div>
</div>

<!-- Arbitrary container sizes -->
<div class="@container">
  <div class="flex flex-col @min-[475px]:flex-row">...</div>
</div>
```

Container query sizes: `@3xs` (16rem) through `@7xl` (80rem). Customize via `--container-*`.

---

## Arbitrary Values

One-off values outside the design system — use sparingly. If repeated, move to `@theme`.

```html
<!-- Arbitrary color -->
<button class="bg-[#316ff6]">Sign in with Facebook</button>

<!-- Arbitrary grid -->
<div class="grid grid-cols-[24rem_2.5rem_minmax(0,1fr)]">

<!-- calc() with theme values -->
<div class="max-h-[calc(100dvh-(--spacing(6)))]">

<!-- Arbitrary property (CSS variable inline) -->
<div class="[--gutter-width:1rem] lg:[--gutter-width:2rem]">
```

**CSS variable shorthand (v4):**
```html
<!-- v3 syntax — DO NOT USE in v4 -->
<div class="bg-[--brand-color]">

<!-- v4 syntax -->
<div class="bg-(--brand-color)">
```

**Arbitrary selectors (last resort):**
```html
<div class="[&>[data-active]+span]:text-blue-600">
```

**Underscores in arbitrary values represent spaces:**
```html
<div class="grid-cols-[max-content_auto]">  <!-- correct v4 -->
<div class="grid-cols-[max-content,auto]">  <!-- v3 only, broken in v4 -->
```

---

## Important Modifier

Append `!` to the end of the class name (v4). Prefix `!` (v3 style) is deprecated.

```html
<!-- v4 -->
<div class="bg-red-500! flex! hover:bg-red-600/50!">

<!-- v3 (deprecated, still works but don't use) -->
<div class="!bg-red-500 !flex">
```

Global important flag (for legacy CSS coexistence):
```css
@import "tailwindcss" important;
```

---

## Dark Mode

Default: `prefers-color-scheme` media query.

```html
<div class="bg-white dark:bg-gray-800">
```

Manual toggle (class-based):
```css
@custom-variant dark (&:where(.dark, .dark *));
```

Apply `color-scheme` utility to match browser UI to theme:
```html
<html class="scheme-light dark:scheme-dark">
```

**Prevent FOUC:** theme-detection script must be inline in `<head>`, not deferred.

---

## State Variants

### Pseudo-classes

```html
<!-- Common interactive states -->
hover:  focus:  active:  visited:  focus-visible:  focus-within:

<!-- Form states -->
disabled:  required:  invalid:  checked:  read-only:  indeterminate:

<!-- Structural -->
first:  last:  odd:  even:  nth-3:  nth-last-5:  only-child:  empty:

<!-- Conditional -->
has-checked:         <!-- element has a checked descendant -->
not-focus:           <!-- element is NOT focused -->
```

### Parent/Sibling State

```html
<!-- group: style children based on parent state -->
<a href="#" class="group">
  <h3 class="group-hover:text-white">Title</h3>
  <p class="group-hover:text-white">Body</p>
</a>

<!-- Named groups for nested group disambiguation -->
<li class="group/item">
  <a class="group/edit group-hover/item:visible">
    <span class="group-hover/edit:text-gray-700">Call</span>
  </a>
</li>

<!-- in-*: like group but without marking the parent -->
<div tabindex="0">
  <div class="opacity-50 in-focus:opacity-100">...</div>
</div>

<!-- peer: style elements based on preceding sibling state -->
<input type="email" class="peer" />
<p class="invisible peer-invalid:visible">Error message</p>

<!-- Named peers -->
<input class="peer/draft" type="radio" />
<input class="peer/published" type="radio" />
<span class="peer-checked/draft:block hidden">Draft saved</span>
```

### has() Variant

```html
<!-- Style element when it has a checked descendant -->
<label class="has-checked:bg-indigo-50 has-checked:ring-indigo-200">
  <input type="radio" />
  Google Pay
</label>

<!-- group-has-* and peer-has-* also available -->
<div class="group">
  <svg class="hidden group-has-[a]:block">...</svg>
  <p>Text with <a href="#">link</a></p>
</div>
```

---

## Conflict Resolution

Last class in the generated stylesheet wins, **not** last in the HTML attribute. The stylesheet
order is fixed by Tailwind's generation — don't rely on attribute order to resolve conflicts.

```html
<!-- display: grid wins, not flex — even though flex comes last in attribute -->
<div class="grid flex">
```

Use conditional rendering instead:
```jsx
<div className={gridLayout ? "grid" : "flex"}>
```

---

## Dynamic Values from Runtime Sources

Use inline styles for values from DB/API. For hover states on dynamic values, set CSS variables
inline and reference with utility classes:

```jsx
<button
  style={{ "--bg": buttonColor, "--bg-hover": buttonColorHover }}
  className="bg-(--bg) hover:bg-(--bg-hover)"
>
```

---

## v3 → v4 Migration Quick Reference

| v3 | v4 |
|----|-----|
| `@tailwind base; @tailwind utilities;` | `@import "tailwindcss";` |
| `!bg-red-500` (prefix `!`) | `bg-red-500!` (suffix `!`) |
| `bg-[--brand]` | `bg-(--brand)` |
| `shadow-sm` | `shadow-xs` |
| `shadow` (bare) | `shadow-sm` |
| `rounded-sm` | `rounded-xs` |
| `rounded` (bare) | `rounded-sm` |
| `blur-sm` | `blur-xs` |
| `blur` (bare) | `blur-sm` |
| `outline-none` | `outline-hidden` |
| `ring` (3px blue) | `ring-3` + `ring-blue-500` |
| `bg-opacity-50` | `bg-black/50` |
| `flex-shrink-*` | `shrink-*` |
| `flex-grow-*` | `grow-*` |
| `overflow-ellipsis` | `text-ellipsis` |
| `bg-gradient-to-r` | `bg-linear-to-r` |
| `theme(colors.red.500)` | `var(--color-red-500)` |
| `grid-cols-[a,b]` (comma=space) | `grid-cols-[a_b]` (underscore=space) |
| Stacking: `first:*:pt-0` | Stacking: `*:first:pt-0` |
| `tailwindcss` PostCSS plugin | `@tailwindcss/postcss` |
| `tailwindcss` Vite | `@tailwindcss/vite` plugin |
| `npx tailwindcss` CLI | `npx @tailwindcss/cli` |

**Border/divide default color changed:** v3 used `gray-200`; v4 uses `currentColor`. Always
specify a color with `border-*` and `divide-*` utilities.

**Gradient variant behavior:** In v4, variant overrides preserve other gradient stops. Use
`via-none` explicitly to drop a three-stop gradient back to two stops.

**`space-x/y-*` and `divide-x/y-*` selectors changed** (performance fix). Migrate to `gap`
with flex/grid where possible.

**Hover on mobile:** v4 `hover:` only fires when primary input supports hover
(`@media (hover: hover)`). No action needed; this is a correctness fix.

**Upgrade tool:** `npx @tailwindcss/upgrade` handles most changes automatically. Run on a
separate branch and review the diff.
