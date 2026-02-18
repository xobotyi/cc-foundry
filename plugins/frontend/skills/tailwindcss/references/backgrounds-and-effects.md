# Backgrounds & Effects

## 1. Background Color

Apply theme colors with `bg-{color}-{shade}`. Use the `/` opacity modifier — never `bg-opacity-*`.

| Class | CSS |
|-------|-----|
| `bg-white` | `background-color: var(--color-white)` |
| `bg-blue-500` | `background-color: var(--color-blue-500)` |
| `bg-transparent` | `background-color: transparent` |
| `bg-inherit` | `background-color: inherit` |
| `bg-current` | `background-color: currentColor` |
| `bg-blue-500/50` | `background-color: oklch(... / 0.5)` — opacity modifier |
| `bg-(--my-color)` | `background-color: var(--my-color)` — CSS variable shorthand |
| `bg-[#316ff6]` | `background-color: #316ff6` — arbitrary value |

**v4 rule:** `bg-opacity-50` is removed. Always use `bg-color/50`.

---

## 2. Background Image & Gradients

### Image

```html
<div class="bg-[url(/img/hero.jpg)] bg-cover bg-center bg-no-repeat"></div>
```

Remove with `bg-none`.

### Linear Gradients — v4 syntax

`bg-gradient-to-r` is the **v3** form. In v4 use `bg-linear-*`.

| Class | CSS |
|-------|-----|
| `bg-linear-to-r` | `linear-gradient(to right, var(--tw-gradient-stops))` |
| `bg-linear-to-br` | `linear-gradient(to bottom right, ...)` |
| `bg-linear-45` | `linear-gradient(45deg in oklab, ...)` |
| `bg-linear-to-r/srgb` | interpolate in sRGB color space |
| `bg-linear-to-r/oklch` | interpolate in oklch (perceptually uniform hues) |

Default interpolation is **oklab**. Directions: `t`, `tr`, `r`, `br`, `b`, `bl`, `l`, `tl`.

### Radial & Conic Gradients

| Class | Example |
|-------|---------|
| `bg-radial` | center radial gradient |
| `bg-radial-[at_50%_75%]` | positioned radial gradient |
| `bg-conic` | conic starting at 0° |
| `bg-conic-180` | conic starting at 180° |
| `bg-conic/decreasing` | decreasing hue interpolation |

### Gradient Color Stops

| Class | Effect |
|-------|--------|
| `from-indigo-500` | start color |
| `via-purple-500` | mid color |
| `to-pink-500` | end color |
| `from-10%` | start position |
| `via-30%` | mid position |
| `to-90%` | end position |
| `from-blue-500/50` | start color with opacity |

Stops support the same opacity modifier syntax as `bg-*`.

### Gradient examples

```html
<!-- Linear left-to-right -->
<div class="bg-linear-to-r from-cyan-500 to-blue-500"></div>

<!-- Angled with opacity -->
<div class="bg-linear-65 from-purple-500/80 to-pink-500"></div>

<!-- Radial positioned -->
<div class="bg-radial-[at_50%_75%] from-sky-200 via-blue-400 to-indigo-900 to-90%"></div>

<!-- Gradient text -->
<p class="bg-linear-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">Hello</p>
```

---

## 3. Background Size, Position, Repeat, Attachment

### Size

| Class | CSS |
|-------|-----|
| `bg-cover` | `background-size: cover` |
| `bg-contain` | `background-size: contain` |
| `bg-auto` | `background-size: auto` |
| `bg-size-[auto_100px]` | arbitrary size |

### Position

| Class | CSS |
|-------|-----|
| `bg-center` | `background-position: center` |
| `bg-top` | `background-position: top` |
| `bg-bottom-right` | `background-position: bottom right` |
| `bg-position-[center_top_1rem]` | arbitrary position |

All 9 positions: `top-left`, `top`, `top-right`, `left`, `center`, `right`, `bottom-left`,
`bottom`, `bottom-right`.

### Repeat

| Class | CSS |
|-------|-----|
| `bg-repeat` | `background-repeat: repeat` |
| `bg-repeat-x` | repeat horizontally |
| `bg-repeat-y` | repeat vertically |
| `bg-repeat-space` | repeat without clipping |
| `bg-repeat-round` | repeat without clipping, stretch to avoid gaps |
| `bg-no-repeat` | no repeat |

### Attachment

| Class | CSS |
|-------|-----|
| `bg-fixed` | fixed relative to viewport |
| `bg-local` | scrolls with container and viewport |
| `bg-scroll` | scrolls with viewport, not container |

---

## 4. Background Clip & Origin

### Clip — where background is painted

| Class | CSS |
|-------|-----|
| `bg-clip-border` | `background-clip: border-box` |
| `bg-clip-padding` | `background-clip: padding-box` |
| `bg-clip-content` | `background-clip: content-box` |
| `bg-clip-text` | `background-clip: text` |

Gradient text requires `bg-clip-text text-transparent`:
```html
<p class="bg-linear-to-r from-pink-500 to-violet-500 bg-clip-text text-5xl font-extrabold text-transparent">
  Hello world
</p>
```

### Origin — background-position reference box

| Class | CSS |
|-------|-----|
| `bg-origin-border` | `background-origin: border-box` |
| `bg-origin-padding` | `background-origin: padding-box` (default) |
| `bg-origin-content` | `background-origin: content-box` |

---

## 5. Background Blend Mode

Blend background image with background color.

| Class | Mode |
|-------|------|
| `bg-blend-normal` | normal |
| `bg-blend-multiply` | multiply |
| `bg-blend-screen` | screen |
| `bg-blend-overlay` | overlay |
| `bg-blend-darken` | darken |
| `bg-blend-lighten` | lighten |
| `bg-blend-color-dodge` | color-dodge |
| `bg-blend-color-burn` | color-burn |
| `bg-blend-hard-light` | hard-light |
| `bg-blend-soft-light` | soft-light |
| `bg-blend-difference` | difference |
| `bg-blend-exclusion` | exclusion |
| `bg-blend-hue` / `bg-blend-saturation` / `bg-blend-color` / `bg-blend-luminosity` | HSL modes |

---

## 6. Box Shadow

### v4 Scale Shift

The shadow scale shifted by one step from v3. Map old classes to new:

| v3 class | v4 class | CSS value |
|----------|----------|-----------|
| `shadow` (1px) | `shadow-2xs` | `0 1px rgb(0 0 0 / 0.05)` |
| `shadow-sm` | `shadow-xs` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` |
| `shadow-md`→ | `shadow-sm` | `0 1px 3px 0 / 0 1px 2px -1px` |
| `shadow-lg`→ | `shadow-md` / `shadow-lg` | larger |
| — | `shadow-xl`, `shadow-2xl` | largest |

**Do not write `shadow-sm` expecting v3 behavior — it maps to v4 `shadow-xs`.**

### Outer shadow

```html
<div class="shadow-md"></div>
<div class="shadow-xl/20"></div>               <!-- opacity modifier -->
<button class="shadow-lg shadow-cyan-500/50">  <!-- colored shadow -->
```

### Inset shadow

| Class | CSS |
|-------|-----|
| `inset-shadow-2xs` | `inset 0 1px rgb(0 0 0 / 0.05)` |
| `inset-shadow-xs` | `inset 0 1px 1px rgb(0 0 0 / 0.05)` |
| `inset-shadow-sm` | `inset 0 2px 4px rgb(0 0 0 / 0.05)` |
| `inset-shadow-none` | remove inset shadow |

Default inset opacity is 5% — increase with `/50` modifier.

### Ring (solid box-shadow outline)

`ring` default is **1px currentColor** in v4 (not 3px blue as in v3).

| Class | CSS |
|-------|-----|
| `ring` | `0 0 0 1px` in currentColor |
| `ring-2` | `0 0 0 2px` |
| `ring-blue-500` | ring in blue-500 |
| `ring-blue-500/50` | ring with opacity |
| `inset-ring` | `inset 0 0 0 1px` |
| `inset-ring-2` | `inset 0 0 0 2px` |

Remove: `shadow-none`, `inset-shadow-none`, `ring-0`, `inset-ring-0`.

---

## 7. Opacity

`opacity-{0–100}` — sets the entire element's opacity including children.

```html
<button class="opacity-100">Full</button>
<button class="opacity-50">Half</button>
<button class="disabled:opacity-75">Disabled state</button>
```

Arbitrary: `opacity-[.67]`. Custom property: `opacity-(--my-alpha)`.

**Use color opacity modifiers (`bg-blue-500/50`, `text-red-600/75`) for per-property opacity.**
Use `opacity-*` only when you need to affect the whole element subtree.

---

## 8. Mix Blend Mode

Controls how element content blends with the stacking context behind it.

| Class | Mode |
|-------|------|
| `mix-blend-multiply` | multiply |
| `mix-blend-screen` | screen |
| `mix-blend-overlay` | overlay |
| `mix-blend-darken` / `mix-blend-lighten` | darken/lighten |
| `mix-blend-plus-darker` / `mix-blend-plus-lighter` | plus modes |
| (same set as bg-blend-*) | all CSS blend modes |

Use `isolate` on a parent to create a new stacking context and contain blending:

```html
<div class="isolate flex -space-x-14">
  <div class="bg-yellow-500 mix-blend-multiply ..."></div>
  <div class="bg-green-500 mix-blend-multiply ..."></div>
</div>
```

---

## 9. Colors (Text, Accent, Caret)

### Text color

```html
<p class="text-blue-600 dark:text-sky-400"></p>
<p class="text-blue-600/75"></p>            <!-- opacity modifier -->
<p class="hover:text-blue-600"></p>
```

Pattern: `text-{color}-{shade}` / `text-{color}-{shade}/{opacity}`.

### Accent color (form controls)

Overrides browser default for checkboxes, radio buttons, progress bars.

```html
<input type="checkbox" class="accent-pink-500" />
<input type="checkbox" class="accent-purple-500/75" />  <!-- Firefox only for opacity -->
```

### Caret color (text input cursor)

```html
<textarea class="caret-pink-500 focus:ring-pink-500"></textarea>
```

---

## 10. SVG Fill & Stroke

### Fill

| Class | CSS |
|-------|-----|
| `fill-blue-500` | `fill: var(--color-blue-500)` |
| `fill-current` | `fill: currentColor` |
| `fill-none` | `fill: none` |
| `fill-transparent` | `fill: transparent` |

`fill-current` is the idiomatic pattern for icon components — SVG inherits the parent's text
color automatically:

```html
<button class="text-indigo-600 hover:text-white">
  <svg class="size-5 fill-current">...</svg>
</button>
```

### Stroke

| Class | CSS |
|-------|-----|
| `stroke-cyan-500` | `stroke: var(--color-cyan-500)` |
| `stroke-current` | `stroke: currentColor` |
| `stroke-none` | `stroke: none` |
| `stroke-1` | `stroke-width: 1` |
| `stroke-2` | `stroke-width: 2` |
| `stroke-[1.5]` | `stroke-width: 1.5` (arbitrary) |

---

## 11. Interactivity

### Appearance

```html
<select class="appearance-none ...">...</select>  <!-- remove native styling -->
<input class="appearance-none forced-colors:appearance-auto" />  <!-- a11y fallback -->
```

### Cursor

Common cursors:

| Class | Use |
|-------|-----|
| `cursor-pointer` | clickable element |
| `cursor-not-allowed` | disabled state |
| `cursor-wait` / `cursor-progress` | loading states |
| `cursor-grab` / `cursor-grabbing` | drag handles |
| `cursor-text` | text input |
| `cursor-move` | draggable items |
| `cursor-none` | hide cursor |

Arbitrary: `cursor-[url(hand.cur),_pointer]`.

### Pointer Events

```html
<div class="pointer-events-none absolute ...">  <!-- icon overlay, passes clicks through -->
<div class="pointer-events-auto ...">           <!-- restore default -->
```

Children still receive events. Use to make decorative overlays non-interactive.

### Resize

| Class | CSS |
|-------|-----|
| `resize-none` | prevent resize |
| `resize` | both directions |
| `resize-y` | vertical only (common for textarea) |
| `resize-x` | horizontal only |

### User Select

| Class | CSS |
|-------|-----|
| `select-none` | prevent text selection |
| `select-text` | allow text selection |
| `select-all` | select all on click |
| `select-auto` | browser default |

### Touch Action

Controls scroll/zoom on touch devices.

| Class | CSS |
|-------|-----|
| `touch-auto` | browser default |
| `touch-none` | disable all touch interactions |
| `touch-pan-x` | horizontal pan only |
| `touch-pan-y` | vertical pan only |
| `touch-pan-left` / `touch-pan-right` | directional pan |
| `touch-pan-up` / `touch-pan-down` | directional pan |
| `touch-pinch-zoom` | pinch zoom only |
| `touch-manipulation` | pan + pinch, no double-tap zoom |

---

## 12. Object Fit & Position

For replaced elements (`<img>`, `<video>`) inside a sized container.

### Object Fit

| Class | Behavior |
|-------|----------|
| `object-cover` | fill container, crop if needed |
| `object-contain` | fit inside, letterbox |
| `object-fill` | stretch to fill (distorts) |
| `object-scale-down` | shrink to fit, never enlarge |
| `object-none` | natural size, no scaling |

Pattern: always pair with explicit dimensions.
```html
<img class="h-48 w-96 object-cover object-center" src="..." />
```

### Object Position

Same 9-point grid as background-position, prefixed `object-*`:
`object-top-left`, `object-top`, `object-top-right`, `object-left`, `object-center`,
`object-right`, `object-bottom-left`, `object-bottom`, `object-bottom-right`.

Arbitrary: `object-[25%_75%]`.

---

## 13. Aspect Ratio

| Class | CSS |
|-------|-----|
| `aspect-square` | `1 / 1` |
| `aspect-video` | `16 / 9` |
| `aspect-auto` | `auto` |
| `aspect-3/2` | `3 / 2` (arbitrary ratio shorthand) |
| `aspect-[4/3]` | arbitrary |

```html
<img class="aspect-3/2 w-full object-cover" src="..." />
<iframe class="aspect-video w-full" src="..."></iframe>
```

---

## 14. Columns

Multi-column layout — items flow into columns automatically.

| Class | CSS |
|-------|-----|
| `columns-3` | 3 columns |
| `columns-xs` | column width ≈ 20rem (320px), count auto |
| `columns-sm` | column width ≈ 24rem (384px) |
| `columns-md` | column width ≈ 28rem (448px) |
| `columns-auto` | `columns: auto` |

Set gap with `gap-{size}` (the standard gap utilities):

```html
<div class="columns-3 gap-8">
  <img class="aspect-3/2 mb-8 object-cover" src="..." />
  <img class="aspect-square mb-8 object-cover" src="..." />
</div>

<!-- Width-based, responsive -->
<div class="columns-2 gap-4 sm:columns-3 sm:gap-8">...</div>
```

Width-based columns (`columns-xs`, `columns-sm`, ...) use `--container-*` tokens. Customize
in `@theme { --container-4xs: 14rem; }`.
