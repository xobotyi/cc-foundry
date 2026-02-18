# Transforms, Animations, Filters, Masks, Scroll, Table & Misc

Reference for motion, visual transformation, CSS filters, gradient masks, scroll snapping,
table layout, and miscellaneous utilities in Tailwind CSS v4.

---

## Transitions

Apply transitions to specify which properties animate on state change. The default transition
uses `cubic-bezier(0.4, 0, 0.2, 1)` easing and `150ms` duration.

```html
<!-- Transition common properties -->
<button class="transition hover:bg-indigo-500 hover:-translate-y-1 ...">Save</button>

<!-- Transition colors only -->
<button class="transition-colors hover:bg-indigo-500 ...">Save</button>

<!-- Transition transforms only -->
<div class="transition-transform hover:scale-105 ...">Card</div>
```

**Transition property utilities:**

| Class | What transitions |
|-------|-----------------|
| `transition` | color, bg, border, opacity, shadow, transform, filter, backdrop-filter, display |
| `transition-all` | all properties |
| `transition-colors` | color, background-color, border-color, text-decoration-color, fill, stroke, gradients |
| `transition-opacity` | opacity |
| `transition-shadow` | box-shadow |
| `transition-transform` | transform, translate, scale, rotate |
| `transition-none` | disables transition |

**Duration:** `duration-<number>` sets `transition-duration: <number>ms` — e.g., `duration-150`,
`duration-300`, `duration-700`. Use `duration-initial` to reset.

**Easing:** `ease-linear`, `ease-in`, `ease-out`, `ease-in-out`. Customize in `@theme`:
```css
@theme { --ease-in-expo: cubic-bezier(0.95, 0.05, 0.795, 0.035); }
```
Then use `ease-in-expo`.

**Delay:** `delay-<number>` sets `transition-delay: <number>ms` — e.g., `delay-150`, `delay-300`.

**Reduced motion — always respect user preferences:**
```html
<!-- Disable transition for motion-sensitive users -->
<button class="transition motion-reduce:transition-none ...">...</button>
<!-- Disable animation -->
<svg class="animate-spin motion-safe:animate-spin ...">...</svg>
```

---

## Animations

Built-in animations: `animate-spin`, `animate-ping`, `animate-pulse`, `animate-bounce`,
`animate-none`.

```html
<!-- Loading spinner -->
<svg class="animate-spin size-5 ...">...</svg>

<!-- Notification badge pulse -->
<span class="animate-ping absolute inline-flex size-3 rounded-full bg-sky-400 opacity-75"></span>

<!-- Skeleton loader -->
<div class="animate-pulse bg-gray-200 rounded h-2 ..."></div>

<!-- Scroll-down indicator -->
<svg class="animate-bounce size-6 ...">...</svg>
```

**Custom animations** — define in `@theme`, include `@keyframes`:
```css
@theme {
  --animate-wiggle: wiggle 1s ease-in-out infinite;

  @keyframes wiggle {
    0%, 100% { transform: rotate(-3deg); }
    50% { transform: rotate(3deg); }
  }
}
```
Then use `animate-wiggle`.

---

## 2D Transforms

All 2D transforms compose using CSS individual transform properties (`scale`, `rotate`,
`translate`) — no `transform` function stacking required.

### Scale

```html
<img class="scale-75 ..." />      <!-- 75% both axes -->
<img class="scale-x-75 ..." />    <!-- 75% x-axis only -->
<img class="scale-y-125 ..." />   <!-- 125% y-axis only -->
<img class="-scale-x-100 ..." />  <!-- mirror on x -->
```

Values are percentages: `scale-50` = 50%, `scale-100` = 100%, `scale-150` = 150%.
Negative values mirror: `-scale-100` flips on both axes.

### Rotate

```html
<img class="rotate-45 ..." />     <!-- 45 degrees clockwise -->
<img class="-rotate-45 ..." />    <!-- 45 degrees counter-clockwise -->
<img class="rotate-90 ..." />
```

Values in degrees — any integer: `rotate-6`, `rotate-45`, `rotate-90`, `rotate-180`.

### Translate

```html
<!-- Spacing scale (rem-based) -->
<img class="translate-4 ..." />       <!-- both axes by spacing(4) -->
<img class="-translate-x-4 ..." />    <!-- negative x -->
<img class="translate-y-1/2 ..." />   <!-- 50% of element height -->
<img class="-translate-full ..." />   <!-- -100% both axes -->
<img class="translate-px ..." />      <!-- 1px -->
```

Accepts: spacing scale numbers, fractions (`1/2`, `1/4`, `full`), and `px`.

### Skew

```html
<img class="skew-3 ..." />      <!-- skew both axes 3deg -->
<img class="skew-x-6 ..." />    <!-- skew x-axis only -->
<img class="-skew-y-12 ..." />  <!-- negative y skew -->
```

### Transform utilities

```html
<!-- Remove all transforms -->
<div class="skew-y-3 md:transform-none">...</div>

<!-- GPU acceleration (improves performance for animated elements) -->
<div class="scale-150 transform-gpu">...</div>
```

---

## 3D Transforms

### 3D Rotation

Use `rotate-x-<number>`, `rotate-y-<number>`, `rotate-z-<number>` for 3D rotations.
Combine multiple axes on the same element:

```html
<img class="rotate-x-50 rotate-z-45 ..." />
<img class="rotate-x-15 -rotate-y-30 ..." />
```

### 3D Translation

`translate-z-<number>` requires the **parent** to have `transform-3d`:

```html
<div class="transform-3d">
  <img class="-translate-z-8 rotate-x-50 ..." />
  <img class="translate-z-12 rotate-x-50 ..." />
</div>
```

### 3D Scale

```html
<div class="scale-3d scale-x-75 scale-y-75 scale-z-50 ...">...</div>
```

### Perspective

Control the z-plane depth. Apply to the **container** element, not the transformed child.

```html
<div class="perspective-dramatic transform-3d">   <!-- 100px — very close -->
  <div class="rotate-x-50 ...">...</div>
</div>
<div class="perspective-normal transform-3d">     <!-- 500px — moderate -->
  <div class="rotate-x-50 ...">...</div>
</div>
```

| Class | Value |
|-------|-------|
| `perspective-dramatic` | 100px |
| `perspective-near` | 300px |
| `perspective-normal` | 500px |
| `perspective-midrange` | 800px |
| `perspective-distant` | 1200px |
| `perspective-none` | none |

Customize in `@theme`:
```css
@theme { --perspective-remote: 1800px; }
```

**Perspective origin** — where the vanishing point is located:
```html
<div class="perspective-near perspective-origin-top-left ...">
<div class="perspective-near perspective-origin-bottom-right ...">
```

Values: `perspective-origin-{center|top|top-right|right|bottom-right|bottom|bottom-left|left|top-left}`.

### Backface visibility

```html
<div class="backface-hidden ...">  <!-- hide when facing away (default) -->
<div class="backface-visible ..."> <!-- show when facing away -->
```

---

## CSS Filters

Filters stack on elements. Combine multiple filter utilities freely — they compose using CSS
custom properties.

**Remove all filters:**
```html
<img class="blur-md brightness-150 invert md:filter-none" src="..." />
```

### Blur

```html
<img class="blur-none" />  <!-- no blur -->
<img class="blur-xs" />    <!-- 4px -->
<img class="blur-sm" />    <!-- 8px -->
<img class="blur-md" />    <!-- 12px -->
<img class="blur-lg" />    <!-- 16px -->
<img class="blur-xl" />    <!-- 24px -->
<img class="blur-2xl" />   <!-- 40px -->
<img class="blur-3xl" />   <!-- 64px -->
```

Customize: `@theme { --blur-2xs: 2px; }` then use `blur-2xs`.

### Brightness

`brightness-<number>` — values are percentages: `brightness-50` = 50%, `brightness-100` = 100%,
`brightness-125`, `brightness-200`. Below 100 darkens; above 100 brightens.

### Contrast

`contrast-<number>` — same scale as brightness. `contrast-0` = grayscale-ish, `contrast-100` =
normal, `contrast-150` = high contrast.

### Grayscale

```html
<img class="grayscale" />     <!-- fully grayscale -->
<img class="grayscale-0" />   <!-- no grayscale (reset) -->
```

### Hue Rotate

```html
<img class="hue-rotate-90" />     <!-- 90 degree hue shift -->
<img class="-hue-rotate-30" />    <!-- negative shift -->
```

### Invert

```html
<img class="invert" />    <!-- fully inverted -->
<img class="invert-0" />  <!-- not inverted -->
```

### Saturate

`saturate-<number>` — `saturate-0` = desaturated, `saturate-100` = normal, `saturate-150` =
oversaturated.

### Sepia

```html
<img class="sepia" />    <!-- fully sepia -->
<img class="sepia-0" />  <!-- no sepia -->
```

### Drop Shadow (filter)

Drop shadow applies to element shape including transparent areas — useful for SVG and
irregular shapes. Use box-shadow for rectangular elements instead.

```html
<svg class="drop-shadow-md ...">...</svg>
<svg class="drop-shadow-xl ...">...</svg>
<svg class="drop-shadow-xl/50 ...">...</svg>           <!-- 50% opacity -->
<svg class="drop-shadow-xl drop-shadow-cyan-500/50 ...">...</svg>  <!-- colored -->
```

| Class | Shadow |
|-------|--------|
| `drop-shadow-xs` | 0 1px 1px rgb(0 0 0 / 0.05) |
| `drop-shadow-sm` | 0 1px 2px rgb(0 0 0 / 0.15) |
| `drop-shadow-md` | 0 3px 3px rgb(0 0 0 / 0.12) |
| `drop-shadow-lg` | 0 4px 4px rgb(0 0 0 / 0.15) |
| `drop-shadow-xl` | 0 9px 7px rgb(0 0 0 / 0.1) |
| `drop-shadow-2xl` | 0 25px 25px rgb(0 0 0 / 0.15) |

---

## Backdrop Filters

Backdrop filters apply to the area **behind** the element (blurred glass effect). Combine
multiple backdrop filter utilities freely.

**Remove all backdrop filters:**
```html
<div class="backdrop-blur-md md:backdrop-filter-none"></div>
```

```html
<!-- Frosted glass panel -->
<div class="backdrop-blur-sm bg-white/30 ..."></div>
<div class="backdrop-blur-xs backdrop-grayscale ..."></div>
```

Available sub-utilities: `backdrop-blur-*`, `backdrop-brightness-*`, `backdrop-contrast-*`,
`backdrop-grayscale`, `backdrop-hue-rotate-*`, `backdrop-invert`, `backdrop-opacity-*`,
`backdrop-saturate-*`, `backdrop-sepia`.

---

## Masks

Masks control element visibility using gradient or image masks. Tailwind v4 introduces a
comprehensive mask utility system.

### Image Masks

```html
<!-- Custom image mask -->
<div class="mask-[url(/img/shape.png)] bg-[url(/img/mountains.jpg)] ..."></div>

<!-- Remove mask -->
<div class="mask-none">...</div>
```

### Linear Gradient Masks

Mask edges using directional utilities. Default gradient: black (opaque) → transparent.

```html
<!-- Single-side fade -->
<div class="mask-b-from-50% bg-[url(/img/mountains.jpg)] ..."></div>   <!-- fade from bottom at 50% -->
<div class="mask-r-from-30% bg-[url(/img/mountains.jpg)] ..."></div>   <!-- fade from right at 30% -->
<div class="mask-t-from-50% bg-[url(/img/mountains.jpg)] ..."></div>   <!-- fade from top -->

<!-- Range control (from = opaque region end, to = transparent region start) -->
<div class="mask-l-from-50% mask-l-to-90% ..."></div>
<div class="mask-b-from-20% mask-b-to-80% ..."></div>

<!-- Both sides simultaneously -->
<div class="mask-x-from-70% mask-x-to-90% ..."></div>  <!-- left+right -->
<div class="mask-y-from-70% mask-y-to-90% ..."></div>  <!-- top+bottom -->
```

**Angled linear mask:**
```html
<div class="mask-linear-50 mask-linear-from-60% mask-linear-to-80% ..."></div>
<div class="-mask-linear-50 mask-linear-from-60% mask-linear-to-80% ..."></div>
```

### Radial Gradient Masks

```html
<!-- Center fade out -->
<img class="mask-radial-[100%_100%] mask-radial-from-75% mask-radial-at-left ..." />

<!-- From center, opaque at core, transparent at edges -->
<div class="mask-radial-from-transparent mask-radial-from-15% mask-radial-to-black mask-radial-to-60% ..."></div>
```

**Radial position:** `mask-radial-at-{top-left|top|top-right|left|center|right|bottom-left|bottom|bottom-right}`

**Radial size:** `mask-radial-closest-corner`, `mask-radial-closest-side`,
`mask-radial-farthest-corner`, `mask-radial-farthest-side`

**Shape:** `mask-circle` (single length size), `mask-ellipse` (two-axis size, default)

### Conic Gradient Masks

```html
<!-- Progress ring at 75% -->
<div class="border-4 border-amber-500 mask-conic-from-75% mask-conic-to-75% ..."></div>

<!-- Angled start -->
<div class="mask-conic-90 mask-conic-from-25% mask-conic-to-75% ..."></div>
```

### Combining Masks

Gradient masks compose using `mask-composite: intersect` by default. Override with:

| Class | Behavior |
|-------|----------|
| `mask-add` | union of masks |
| `mask-subtract` | subtract second from first |
| `mask-intersect` | intersection only (default for compound utilities) |
| `mask-exclude` | XOR — only non-overlapping areas |

### Mask Position and Size

```html
<!-- Position the mask image itself (not the radial origin) -->
<div class="mask-center ...">
<div class="mask-top-right ...">

<!-- Size the mask image -->
<div class="mask-cover ...">    <!-- fill container, crop if needed -->
<div class="mask-contain ...">  <!-- fit without cropping -->
<div class="mask-auto ...">     <!-- original size -->
```

---

## Scroll Snap

Set up scroll snap on the container, alignment on children. Container and children require
separate utilities.

### Container (parent element)

```html
<!-- Horizontal snap -->
<div class="snap-x overflow-x-auto ...">

<!-- Vertical snap -->
<div class="snap-y overflow-y-auto ...">

<!-- Mandatory (always snaps to nearest point) -->
<div class="snap-x snap-mandatory ...">

<!-- Proximity (only snaps when close) -->
<div class="snap-x snap-proximity ...">

<!-- Disable -->
<div class="snap-none ...">
```

### Alignment (child elements)

```html
<div class="snap-center ..."><img /></div>   <!-- center in viewport -->
<div class="snap-start ..."><img /></div>    <!-- align to start -->
<div class="snap-end ..."><img /></div>      <!-- align to end -->
<div class="snap-align-none ..."><img /></div>
```

### Stop behavior

```html
<!-- Force stop at every snap point (use with snap-mandatory) -->
<div class="snap-center snap-always ..."><img /></div>

<!-- Allow skipping snap points -->
<div class="snap-center snap-normal ..."><img /></div>
```

### Scroll Behavior

```html
<!-- Smooth scrolling (apply to html element for anchor links) -->
<html class="scroll-smooth">

<!-- Normal scrolling -->
<html class="scroll-smooth md:scroll-auto">
```

Note: `scroll-behavior` only affects browser-triggered scroll events, not JavaScript scrolling.

---

## Table Layout

```html
<!-- Auto: columns sized by content (default browser behavior) -->
<table class="table-auto">...</table>

<!-- Fixed: columns use declared widths; first row sets column widths -->
<table class="table-fixed">
  <thead>
    <tr>
      <th class="w-1/2">Song</th>   <!-- 50% -->
      <th class="w-1/4">Artist</th>  <!-- 25% -->
      <th class="w-1/4">Year</th>    <!-- 25% -->
    </tr>
  </thead>
  ...
</table>
```

`table-fixed` is useful for preventing layout reflow when data loads and for equal-width
columns. Undeclared columns in `table-fixed` split remaining width equally.

---

## Vertical Alignment

For inline and table-cell elements:

```html
<span class="align-baseline">...</span>      <!-- align to parent baseline -->
<span class="align-top">...</span>           <!-- top of line -->
<span class="align-middle">...</span>        <!-- middle of line -->
<span class="align-bottom">...</span>        <!-- bottom of line -->
<span class="align-text-top">...</span>      <!-- top of parent font -->
<span class="align-text-bottom">...</span>   <!-- bottom of parent font -->
<span class="align-sub">...</span>           <!-- subscript baseline -->
<span class="align-super">...</span>         <!-- superscript baseline -->
```

---

## Field Sizing

Auto-resize form controls to their content:

```html
<!-- Grows/shrinks with content (auto-expanding textarea) -->
<textarea class="field-sizing-content" rows="2">...</textarea>

<!-- Fixed size (default browser behavior) -->
<textarea class="field-sizing-fixed w-80" rows="2">...</textarea>
```

`field-sizing-content` is useful for single-line inputs that should grow, or textareas that
eliminate the need for JavaScript resize logic.

---

## Anti-Patterns

| Don't | Do |
|-------|-----|
| `transform-gpu` on every element | Only use on animated elements where GPU helps |
| 3D transforms without `transform-3d` on parent | Add `transform-3d` to parent when using `translate-z-*` |
| `transition-all` | Use specific transition utilities (`transition-colors`, `transition-transform`) |
| Animations without `motion-safe` / `motion-reduce` | Wrap animated classes with `motion-safe:` or check `motion-reduce:` |
| `perspective-*` on the transformed child | Apply perspective to the **parent** container |
| Multiple masks without checking `mask-composite` | Default is `intersect`; set explicitly if you need other behavior |
| `snap-x` without also setting snap alignment on children | Always pair container snap type with child snap alignment |
