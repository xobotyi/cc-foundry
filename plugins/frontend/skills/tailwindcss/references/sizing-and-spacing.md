# Sizing & Spacing Reference

## Spacing Scale

`--spacing` CSS variable drives all spacing utilities. `1` unit = `0.25rem` (4px).

- **0** — 0rem (0px)
- **px** — 1px
- **0.5** — 0.125rem (2px)
- **1** — 0.25rem (4px)
- **1.5** — 0.375rem (6px)
- **2** — 0.5rem (8px)
- **2.5** — 0.625rem (10px)
- **3** — 0.75rem (12px)
- **3.5** — 0.875rem (14px)
- **4** — 1rem (16px)
- **5** — 1.25rem (20px)
- **6** — 1.5rem (24px)
- **7** — 1.75rem (28px)
- **8** — 2rem (32px)
- **10** — 2.5rem (40px)
- **12** — 3rem (48px)
- **16** — 4rem (64px)
- **20** — 5rem (80px)
- **24** — 6rem (96px)
- **28** — 7rem (112px)
- **32** — 8rem (128px)
- **36** — 9rem (144px)
- **40** — 10rem (160px)
- **44** — 11rem (176px)
- **48** — 12rem (192px)
- **56** — 14rem (224px)
- **64** — 16rem (256px)
- **72** — 18rem (288px)
- **80** — 20rem (320px)
- **96** — 24rem (384px)

Customize via `@theme { --spacing: 4px; }` or extend individual steps.

---

## 1. Width & Height

### Width (`w-*`)

- **`w-<number>`** — `width: calc(var(--spacing) * <number>)`
- **`w-<fraction>`** — `width: calc(<fraction> * 100%)`
- **`w-px`** — `width: 1px`
- **`w-auto`** — `width: auto`
- **`w-full`** — `width: 100%`
- **`w-screen`** — `width: 100vw`
- **`w-dvw/lvw/svw`** — `width: 100dvw / 100lvw / 100svw`
- **`w-dvh/lvh/svh`** — `width: 100dvh / 100lvh / 100svh`
- **`w-min`** — `width: min-content`
- **`w-max`** — `width: max-content`
- **`w-fit`** — `width: fit-content`

**Container scale** (maps to `--container-*` variables):

- **`w-3xs`** — 16rem (256px)
- **`w-2xs`** — 18rem (288px)
- **`w-xs`** — 20rem (320px)
- **`w-sm`** — 24rem (384px)
- **`w-md`** — 28rem (448px)
- **`w-lg`** — 32rem (512px)
- **`w-xl`** — 36rem (576px)
- **`w-2xl`** — 42rem (672px)
- **`w-3xl`** — 48rem (768px)
- **`w-4xl`** — 56rem (896px)
- **`w-5xl`** — 64rem (1024px)
- **`w-6xl`** — 72rem (1152px)
- **`w-7xl`** — 80rem (1280px)

Fractions: `w-1/2`, `w-1/3`, `w-2/3`, `w-1/4`, `w-3/4`, `w-1/5` … `w-4/5`, `w-1/6`, `w-5/6`.

### Height (`h-*`)

- **`h-<number>`** — `height: calc(var(--spacing) * <number>)`
- **`h-<fraction>`** — `height: calc(<fraction> * 100%)`
- **`h-px`** — `height: 1px`
- **`h-auto`** — `height: auto`
- **`h-full`** — `height: 100%`
- **`h-screen`** — `height: 100vh`
- **`h-dvh/lvh/svh`** — `height: 100dvh / 100lvh / 100svh`
- **`h-dvw/lvw/svw`** — `height: 100dvw / 100lvw / 100svw`
- **`h-min`** — `height: min-content`
- **`h-max`** — `height: max-content`
- **`h-fit`** — `height: fit-content`
- **`h-lh`** — `height: 1lh` (line-height unit)

No container scale for height. Fractions work: `h-1/2`, `h-1/3`, `h-3/4`, `h-9/10`, etc.

### Combined size (`size-*`)

Sets both `width` and `height` simultaneously. Accepts all the same values as `w-*`: `size-<number>`, `size-<fraction>`,
`size-px`, `size-auto`, `size-full`, `size-dvw/dvh/lvw/lvh/svw/svh`, `size-min`, `size-max`, `size-fit`.

```html
<div class="size-16 ..."><!-- 4rem × 4rem --></div>
<div class="size-full ..."><!-- 100% × 100% --></div>
```

### Min/Max Width

`min-w-*` and `max-w-*` accept the same values as `w-*` (number, fraction, container scale, viewport units, `min`,
`max`, `fit`, `auto`/`none`).

- `max-w-none` — removes max-width constraint
- `min-w-auto` — `min-width: auto`
- `container` — responsive breakpoint-locked max-width utility:
  ```css
  width: 100%;
  @media (width >= 40rem) { max-width: 40rem; }  /* sm  */
  @media (width >= 48rem) { max-width: 48rem; }  /* md  */
  @media (width >= 64rem) { max-width: 64rem; }  /* lg  */
  @media (width >= 80rem) { max-width: 80rem; }  /* xl  */
  @media (width >= 96rem) { max-width: 96rem; }  /* 2xl */
  ```
  Does **not** center itself — add `mx-auto px-4` explicitly.

### Min/Max Height

`min-h-*` and `max-h-*` accept the same values as `h-*`.

- `max-h-none` — removes max-height constraint
- `min-h-lh`, `max-h-lh` — `1lh` (line-height unit)

---

## 2. Padding & Margin

### Padding (`p-*`)

- **`p`** — `padding` (all sides)
- **`px`** — `padding-inline`
- **`py`** — `padding-block`
- **`ps`** — `padding-inline-start`
- **`pe`** — `padding-inline-end`
- **`pt`** — `padding-top`
- **`pr`** — `padding-right`
- **`pb`** — `padding-bottom`
- **`pl`** — `padding-left`

Each prefix accepts: `<number>`, `px`, `(<custom-property>)`, `[<value>]`. No `auto` for padding.

```html
<div class="p-4 px-8 pt-2 ps-6 ..."></div>
```

### Margin (`m-*`)

- **`m`** — `margin` (all sides)
- **`mx`** — `margin-inline`
- **`my`** — `margin-block`
- **`ms`** — `margin-inline-start`
- **`me`** — `margin-inline-end`
- **`mt`** — `margin-top`
- **`mr`** — `margin-right`
- **`mb`** — `margin-bottom`
- **`ml`** — `margin-left`

Each prefix accepts: `<number>`, `-<number>` (negative), `auto`, `px`, `-px`.

**Auto centering:** `mx-auto` centers block elements horizontally.

**Negative margins:** prefix class name with `-`:

```html
<div class="-mt-8 ..."><!-- margin-top: -2rem --></div>
```

### Logical properties (padding & margin)

`ps-*` / `pe-*` map to inline-start/end — adapts to `dir="ltr"` or `dir="rtl"` automatically. `ms-*` / `me-*` same for
margin.

### Space between children

- **`space-x-<n>`** — Margin between horizontal siblings
- **`space-y-<n>`** — Margin between vertical siblings
- **`space-x-reverse`** — Use with `flex-row-reverse`
- **`space-y-reverse`** — Use with `flex-col-reverse`

Limitation: `space-*` is margin-based; prefer `gap-*` for grid/flex layouts that wrap.

---

## 3. Box Model

### Box Sizing

- **`box-border`** — `box-sizing: border-box`
- **`box-content`** — `box-sizing: content-box`

`box-border` is the default (applied via Tailwind's preflight). With `box-border`, padding and border are included in
the declared width/height.

### Box Decoration Break

Controls how background, border, padding render across line/column breaks.

- **`box-decoration-clone`** — `box-decoration-break: clone`
- **`box-decoration-slice`** — `box-decoration-break: slice`

Use `box-decoration-clone` so gradient backgrounds repeat on each line of wrapped inline text.

---

## 4. Borders

### Border Width

- **`border`** — `border-width: 1px`
- **`border-<number>`** — `border-width: <number>px`
- **`border-x[-<n>]`** — `border-inline-width: 1px / <n>px`
- **`border-y[-<n>]`** — `border-block-width: 1px / <n>px`
- **`border-s[-<n>]`** — `border-inline-start-width: 1px / <n>px`
- **`border-e[-<n>]`** — `border-inline-end-width: 1px / <n>px`
- **`border-t[-<n>]`** — `border-top-width: 1px / <n>px`
- **`border-r[-<n>]`** — `border-right-width: 1px / <n>px`
- **`border-b[-<n>]`** — `border-bottom-width: 1px / <n>px`
- **`border-l[-<n>]`** — `border-left-width: 1px / <n>px`

**Divide utilities** (borders between children):

- **`divide-x[-<n>]`** — `border-inline-end-width` on all but last child
- **`divide-y[-<n>]`** — `border-bottom-width` on all but last child
- **`divide-x-reverse` / `divide-y-reverse`** — For reversed flex order

### Border Style

- **`border-solid`** — `border-style: solid`
- **`border-dashed`** — `border-style: dashed`
- **`border-dotted`** — `border-style: dotted`
- **`border-double`** — `border-style: double`
- **`border-hidden`** — `border-style: hidden`
- **`border-none`** — `border-style: none`

Same values available as `divide-solid`, `divide-dashed`, etc. for child dividers.

### Border Color

Pattern: `border-{color}-{shade}` (e.g., `border-indigo-500`).

Special values: `border-inherit`, `border-current`, `border-transparent`.

Per-side: `border-t-{color}`, `border-r-{color}`, `border-b-{color}`, `border-l-{color}`, `border-x-{color}`,
`border-y-{color}`, `border-s-{color}`, `border-e-{color}`.

Opacity modifier: `border-indigo-500/50` sets alpha to 50%.

Divide color: `divide-{color}-{shade}` — same pattern.

Custom: `border-[#243c5a]` or `border-(--my-color)`.

### Border Radius

**v4 scale shift:** `rounded` without suffix maps to the `xs` size. Use explicit suffixes.

- **`rounded-xs`** — `--radius-xs` (2px)
- **`rounded-sm`** — `--radius-sm` (4px)
- **`rounded-md`** — `--radius-md` (6px)
- **`rounded-lg`** — `--radius-lg` (8px)
- **`rounded-xl`** — `--radius-xl` (12px)
- **`rounded-2xl`** — `--radius-2xl` (16px)
- **`rounded-3xl`** — `--radius-3xl` (24px)
- **`rounded-4xl`** — `--radius-4xl` (32px)
- **`rounded-none`** — `0` (0px)
- **`rounded-full`** — `calc(infinity * 1px)` (pill)

**Per-side** (two corners): `rounded-t-*`, `rounded-r-*`, `rounded-b-*`, `rounded-l-*`.

**Per-corner** (physical): `rounded-tl-*`, `rounded-tr-*`, `rounded-br-*`, `rounded-bl-*`.

**Logical variants:**

- **`rounded-s-*`** — LTR: `rounded-l-*` / RTL: `rounded-r-*`
- **`rounded-e-*`** — LTR: `rounded-r-*` / RTL: `rounded-l-*`
- **`rounded-ss-*`** — LTR: `rounded-tl-*` / RTL: `rounded-tr-*`
- **`rounded-se-*`** — LTR: `rounded-tr-*` / RTL: `rounded-tl-*`
- **`rounded-es-*`** — LTR: `rounded-bl-*` / RTL: `rounded-br-*`
- **`rounded-ee-*`** — LTR: `rounded-br-*` / RTL: `rounded-bl-*`

Pill button: `rounded-full`. Remove radius: `rounded-none`.

Customize: `@theme { --radius-5xl: 3rem; }`.

---

## 5. Outlines

Outlines sit outside the border, do not affect layout, and are commonly used for focus rings.

### Outline Width

- **`outline`** — `outline-width: 1px`
- **`outline-<number>`** — `outline-width: <number>px`

Arbitrary: `outline-[2vw]` or `outline-(length:--my-var)`.

### Outline Style

- **`outline-solid`** — `outline-style: solid`
- **`outline-dashed`** — `outline-style: dashed`
- **`outline-dotted`** — `outline-style: dotted`
- **`outline-double`** — `outline-style: double`
- **`outline-none`** — `outline-style: none` — completely removes outline
- **`outline-hidden`** — `outline: 2px solid transparent; outline-offset: 2px`

**v4 change:** `outline-none` in v3 is now `outline-hidden` in v4. `outline-hidden` preserves the outline in
forced-colors mode (accessibility). Prefer it over `outline-none` when hiding focus outlines; always provide alternative
focus styling.

### Outline Color

Pattern: `outline-{color}-{shade}` (e.g., `outline-blue-500`).

Special: `outline-inherit`, `outline-current`, `outline-transparent`.

Opacity: `outline-blue-500/75`.

Custom: `outline-[#243c5a]` or `outline-(--my-color)`.

### Outline Offset

- **`outline-offset-<n>`** — `outline-offset: <n>px`
- **`-outline-offset-<n>`** — `outline-offset: calc(<n>px * -1)`

Common focus pattern:

```html
<button class="focus:outline-2 focus:outline-offset-2 focus:outline-sky-500 ...">
```

---

## 6. Border Spacing & Collapse (Tables)

### Border Collapse

- **`border-collapse`** — `border-collapse: collapse`
- **`border-separate`** — `border-collapse: separate`

`border-collapse` merges adjacent cell borders. `border-separate` keeps them distinct (required for `border-spacing`).

### Border Spacing

Only effective with `border-separate`.

- **`border-spacing-<n>`** — `border-spacing: calc(var(--spacing) * <n>)`
- **`border-spacing-x-<n>`** — horizontal spacing only
- **`border-spacing-y-<n>`** — vertical spacing only

```html
<table class="border-separate border-spacing-2 ...">
```

---

## 7. Overflow

### Overflow

- **`overflow-auto`** — `overflow: auto`
- **`overflow-hidden`** — `overflow: hidden`
- **`overflow-clip`** — `overflow: clip`
- **`overflow-visible`** — `overflow: visible`
- **`overflow-scroll`** — `overflow: scroll`

Per-axis: `overflow-x-*` and `overflow-y-*` accept the same values.

- `overflow-auto` — adds scrollbars only when content overflows
- `overflow-scroll` — always shows scrollbars (OS may hide if not needed)
- `overflow-clip` — clips without creating a scroll container (unlike `overflow-hidden`)

### Overscroll Behavior

Controls what happens when a scroll boundary is reached.

- **`overscroll-auto`** — `overscroll-behavior: auto`
- **`overscroll-contain`** — `overscroll-behavior: contain`
- **`overscroll-none`** — `overscroll-behavior: none`

Per-axis: `overscroll-x-*` and `overscroll-y-*`.

- `overscroll-contain` — prevents scroll chaining to parent; preserves bounce effects
- `overscroll-none` — prevents scroll chaining and bounce effects
- `overscroll-auto` — default; allows scroll chaining to parent

---

## Value Syntax Reference

- **`w-<number>`** — e.g. `w-4`, `w-0.5` — Multiplied by `--spacing` (0.25rem)
- **`w-<fraction>`** — e.g. `w-1/2`, `w-2/3` — Percentage of parent
- **`w-[<value>]`** — e.g. `w-[220px]`, `w-[5vw]` — Arbitrary value
- **`w-(<custom-property>)`** — e.g. `w-(--my-width)` — CSS variable shorthand (v4)
- **`-m-<number>`** — e.g. `-mt-4`, `-mx-8` — Negative margin
- **`border-(length:--var)`** — e.g. `border-(length:--bw)` — Length-typed custom property
