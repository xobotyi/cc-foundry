# Custom Utilities and Variants Reference

## `@utility` — Custom Utility Classes

Custom utilities are inserted into the `utilities` layer automatically. They support all
variants (`hover:`, `focus:`, `lg:`, etc.) without extra configuration.

### Simple utility

```css
@utility content-auto {
  content-visibility: auto;
}
```

Usage: `content-auto`, `hover:content-auto`, `lg:content-auto`

### Complex utility (with nesting)

```css
@utility scrollbar-hidden {
  &::-webkit-scrollbar {
    display: none;
  }
}
```

### Functional utility (accepts argument via `--value()`)

Use `@utility tab-*` (wildcard) to accept a value. The `--value()` function resolves
the argument in three modes — any combination can be used in the same rule:

```css
@utility tab-* {
  tab-size: --value(--tab-size-*);   /* theme key */
  tab-size: --value(integer);         /* bare value */
  tab-size: --value([integer]);       /* arbitrary value */
}
```

Unresolved declarations are omitted from output. Multiple `--value()` calls in the same
`@utility` are tried independently.

#### `--value()` resolution modes

| Syntax | Matches | Example class |
|--------|---------|---------------|
| `--value(--ns-*)` | Theme key in `--ns-*` namespace | `tab-github` (if `--tab-size-github` exists) |
| `--value(integer)` | Bare integer | `tab-4`, `tab-76` |
| `--value(number)` | Bare decimal number | `opacity-75` |
| `--value(percentage)` | Bare percentage | `opacity-50%` |
| `--value(ratio)` | Fraction (triggers ratio+modifier handling) | `aspect-3/4` |
| `--value([integer])` | Arbitrary integer | `tab-[8]` |
| `--value([length])` | Arbitrary length | `w-[117px]` |
| `--value([color])` | Arbitrary color | `bg-[#abc]` |
| `--value([*])` | Any arbitrary value | |
| `--value("inherit", "initial")` | Literal keyword | `tab-inherit` |

Bare value types: `number`, `integer`, `ratio`, `percentage`.
Arbitrary value types: `absolute-size`, `angle`, `bg-size`, `color`, `family-name`,
`generic-name`, `image`, `integer`, `length`, `line-width`, `number`, `percentage`,
`position`, `ratio`, `relative-size`, `url`, `vector`, `*`.

#### Multiple modes in one declaration (left-to-right resolution)

```css
@utility tab-* {
  tab-size: --value(--tab-size-*, integer, [integer]);
}
```

#### Modifiers via `--modifier()`

Works like `--value()` but reads the modifier portion (`text-lg/tight` → modifier is `tight`):

```css
@utility text-* {
  font-size: --value(--text-*, [length]);
  line-height: --modifier(--leading-*, [length], [*]);
}
```

If no modifier is present, modifier-dependent declarations are omitted.

#### Negative values

Register a separate `-utility-*` form:

```css
@utility inset-* {
  inset: --spacing(--value(integer));
  inset: --value([percentage], [length]);
}

@utility -inset-* {
  inset: --spacing(--value(integer) * -1);
  inset: calc(--value([percentage], [length]) * -1);
}
```

#### Fractions (ratio type)

```css
@utility aspect-* {
  aspect-ratio: --value(--aspect-ratio-*, ratio, [ratio]);
}
```

`ratio` type treats value + modifier as a single fraction: `aspect-3/4`, `aspect-[7/9]`.

---

## `@custom-variant` — Custom Variants

### Shorthand (single selector condition)

```css
@custom-variant theme-midnight (&:where([data-theme="midnight"] *));
@custom-variant dark (&:where(.dark, .dark *));
```

Usage: `theme-midnight:bg-black`, `dark:text-white`

### Block form (multiple rules or media queries)

```css
@custom-variant any-hover {
  @media (any-hover: hover) {
    &:hover {
      @slot;
    }
  }
}
```

`@slot` marks where the utility CSS is injected. Required in block form when nesting.

### Dark mode override

Override the built-in `dark` variant for class-based toggling:

```css
/* Class-based */
@custom-variant dark (&:where(.dark, .dark *));

/* Data attribute */
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));
```

Default (no override): `dark:` uses `@media (prefers-color-scheme: dark)`.

---

## `@variant` — Apply Variants in Custom CSS

Use `@variant` inside custom CSS rules to apply a Tailwind variant:

```css
.my-element {
  background: white;

  @variant dark {
    background: black;
  }
}
```

Compiles to:

```css
.my-element {
  background: white;

  @media (prefers-color-scheme: dark) {
    background: black;
  }
}
```

Multiple variants: nest them:

```css
.my-element {
  @variant dark {
    @variant hover {
      background: black;
    }
  }
}
```

---

## `@apply` — Inline Utility Classes into Custom CSS

Use `@apply` to compose utility classes into a custom CSS rule. **Last resort only** —
prefer template components in React/Vue/Svelte.

```css
@layer components {
  .btn-primary {
    @apply rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white;
    @apply hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500;
  }
}
```

Rules:
- Place `@apply`-based classes in `@layer components` so utilities can override them
- Single-element patterns only — multi-element structures belong in template components
- Acceptable: third-party library overrides, legacy HTML you don't control
- Not acceptable: replicating component structure that belongs in framework templates

---

## `@reference` — Import Without Duplicating CSS

Use `@reference` in Vue/Svelte `<style>` blocks or CSS Modules to access theme vars,
custom utilities, and custom variants without duplicating output CSS:

```vue
<style>
  @reference "../../app.css";

  h1 {
    @apply text-2xl font-bold text-red-500;
  }
</style>
```

When using default theme only (no custom `@theme`, `@custom-variant`, `@plugin`):

```vue
<style>
  @reference "tailwindcss";

  h1 {
    @apply text-2xl font-bold;
  }
</style>
```

`@reference` supports subpath imports (`#app.css`) via `package.json` `imports` field.

---

## `@source` — Content Detection Control

```css
/* Register path outside auto-detection */
@source "../node_modules/@my-company/ui-lib";

/* Exclude path */
@source not "../src/legacy";

/* Force-generate specific classes (safelist) */
@source inline("underline");
@source inline("{hover:,focus:,}underline");
@source inline("{hover:,}bg-red-{50,{100..900..100},950}");

/* Explicitly exclude from generation */
@source not inline("{hover:,focus:,}bg-red-{50,{100..900..100},950}");
```

`@source inline()` uses brace expansion. Use for CMS/database-driven classes that don't
appear as static strings in source files.

---

## `@plugin` — Load JavaScript Plugin

```css
@plugin "@tailwindcss/typography";
@plugin "./local-plugin.js";
```

`@plugin` accepts package name or local path. Use for legacy or third-party plugins.
CSS-native `@utility` and `@custom-variant` are preferred over JS plugins for new code.

---

## `@layer` — CSS Layer Placement

```css
@layer base {
  h1 { font-size: var(--text-2xl); }
}

@layer components {
  .card {
    background-color: var(--color-white);
    border-radius: var(--radius-lg);
    padding: --spacing(6);
    box-shadow: var(--shadow-xl);
  }
}
```

Layer precedence: `base` < `components` < `utilities`. Utilities always win over components.

---

## Build-Time Functions

### `--alpha()` — Adjust color opacity in CSS

```css
.element {
  color: --alpha(var(--color-lime-300) / 50%);
}
/* Compiles to: color: color-mix(in oklab, var(--color-lime-300) 50%, transparent); */
```

### `--spacing()` — Generate spacing value from theme scale

```css
.element {
  margin: --spacing(4);
}
/* Compiles to: margin: calc(var(--spacing) * 4); */
```

Also valid in arbitrary values: `py-[calc(--spacing(4)-1px)]`

### `theme()` — deprecated

`theme(colors.red.500)` → use `var(--color-red-500)` instead.

---

## Arbitrary Values and Properties

### Arbitrary value

```html
<div class="top-[117px]">...</div>
<div class="bg-[#bada55]">...</div>
```

### CSS variable shorthand (v4)

```html
<div class="bg-(--brand-color)">...</div>   <!-- v4: auto-wraps in var() -->
<div class="bg-[var(--brand)]">...</div>    <!-- v3 syntax: still works but verbose -->
```

### Arbitrary property

```html
<div class="[mask-type:luminance]">...</div>
<div class="hover:[mask-type:alpha]">...</div>
```

### Arbitrary variant

```html
<li class="lg:[&:nth-child(-n+3)]:hover:underline">...</li>
```

### Type hints for ambiguous CSS vars

```html
<div class="text-(length:--my-var)">...</div>  <!-- font-size -->
<div class="text-(color:--my-var)">...</div>   <!-- text color -->
```

### Whitespace in arbitrary values

Use underscore `_` for spaces: `grid-cols-[1fr_500px_2fr]`. URLs preserve underscores.
Escape with backslash to force underscore: `content-['hello\_world']`.

---

## Anti-Patterns

| Don't | Do |
|-------|-----|
| Dynamic class concat: `` `bg-${color}-500` `` | Static map: `{ blue: "bg-blue-500" }` |
| `@apply` for multi-element component | Extract a template component |
| `@apply` as default approach | Use markup utilities; `@apply` is the escape hatch |
| `bg-[var(--brand)]` | `bg-(--brand)` — v4 shorthand |
| `@layer components` without utilities override intent | Put component classes in `@layer components` |
| `@source inline()` for classes visible in source | Let auto-detection handle them |
| JS plugins for new utilities | Use `@utility` and `@custom-variant` in CSS |
