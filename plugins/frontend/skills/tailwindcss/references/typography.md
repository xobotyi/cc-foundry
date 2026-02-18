# Typography

## 1. Font Properties

### Font Family

| Class | CSS |
|-------|-----|
| `font-sans` | `font-family: var(--font-sans)` — ui-sans-serif, system-ui, sans-serif… |
| `font-serif` | `font-family: var(--font-serif)` — ui-serif, Georgia, Cambria… |
| `font-mono` | `font-family: var(--font-mono)` — ui-monospace, SFMono-Regular, Menlo… |
| `font-(family-name:<prop>)` | `font-family: var(<prop>)` |
| `font-[<value>]` | `font-family: <value>` |

**Theme customization:**
```css
@theme {
  --font-display: "Oswald", sans-serif;
  --font-display--font-feature-settings: "cv02", "cv03";   /* optional */
  --font-display--font-variation-settings: "opsz" 32;       /* optional */
}
```
Google Fonts `@import` must appear before `@import "tailwindcss"` in the CSS file.

### Font Size

Each size utility sets both `font-size` and a default `line-height` via CSS variables.

| Class | Size | Default line-height |
|-------|------|---------------------|
| `text-xs` | 0.75rem (12px) | calc(1 / 0.75) |
| `text-sm` | 0.875rem (14px) | calc(1.25 / 0.875) |
| `text-base` | 1rem (16px) | calc(1.5 / 1) |
| `text-lg` | 1.125rem (18px) | calc(1.75 / 1.125) |
| `text-xl` | 1.25rem (20px) | calc(1.75 / 1.25) |
| `text-2xl` | 1.5rem (24px) | calc(2 / 1.5) |
| `text-3xl` | 1.875rem (30px) | calc(2.25 / 1.875) |
| `text-4xl` | 2.25rem (36px) | calc(2.5 / 2.25) |
| `text-5xl` | 3rem (48px) | 1 |
| `text-6xl` | 3.75rem (60px) | 1 |
| `text-7xl` | 4.5rem (72px) | 1 |
| `text-8xl` | 6rem (96px) | 1 |
| `text-9xl` | 8rem (128px) | 1 |
| `text-(length:<prop>)` | `font-size: var(<prop>)` | — |
| `text-[<value>]` | `font-size: <value>` | — |

Override line-height inline: `text-sm/6`, `text-sm/7`, `text-lg/loose` — sets both size and
line-height in one class.

**Theme — per-size defaults:**
```css
@theme {
  --text-tiny: 0.625rem;
  --text-tiny--line-height: 1.5rem;
  --text-tiny--letter-spacing: 0.125rem;
  --text-tiny--font-weight: 500;
}
```

### Font Weight

| Class | Value |
|-------|-------|
| `font-thin` | 100 |
| `font-extralight` | 200 |
| `font-light` | 300 |
| `font-normal` | 400 |
| `font-medium` | 500 |
| `font-semibold` | 600 |
| `font-bold` | 700 |
| `font-extrabold` | 800 |
| `font-black` | 900 |
| `font-(<prop>)` | `font-weight: var(<prop>)` |
| `font-[<value>]` | `font-weight: <value>` |

### Font Style

| Class | CSS |
|-------|-----|
| `italic` | `font-style: italic` |
| `not-italic` | `font-style: normal` |

### Font Smoothing

| Class | CSS |
|-------|-----|
| `antialiased` | `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale` |
| `subpixel-antialiased` | `-webkit-font-smoothing: auto; -moz-osx-font-smoothing: auto` |

### Font Stretch

| Class | CSS |
|-------|-----|
| `font-stretch-ultra-condensed` | `font-stretch: ultra-condensed` (50%) |
| `font-stretch-extra-condensed` | `font-stretch: extra-condensed` (62.5%) |
| `font-stretch-condensed` | `font-stretch: condensed` (75%) |
| `font-stretch-semi-condensed` | `font-stretch: semi-condensed` (87.5%) |
| `font-stretch-normal` | `font-stretch: normal` (100%) |
| `font-stretch-semi-expanded` | `font-stretch: semi-expanded` (112.5%) |
| `font-stretch-expanded` | `font-stretch: expanded` (125%) |
| `font-stretch-extra-expanded` | `font-stretch: extra-expanded` (150%) |
| `font-stretch-ultra-expanded` | `font-stretch: ultra-expanded` (200%) |
| `font-stretch-<percentage>` | e.g. `font-stretch-75%` |
| `font-stretch-(<prop>)` | `font-stretch: var(<prop>)` |
| `font-stretch-[<value>]` | `font-stretch: <value>` |

Only effective on fonts with multiple width variations.

### Font Variant Numeric

These utilities are composable — stack multiple on one element.

| Class | CSS |
|-------|-----|
| `normal-nums` | `font-variant-numeric: normal` (reset) |
| `ordinal` | ordinal glyphs (1st, 2nd…) |
| `slashed-zero` | zero with slash |
| `lining-nums` | baseline-aligned numerals |
| `oldstyle-nums` | numerals with descenders |
| `proportional-nums` | variable-width numerals |
| `tabular-nums` | uniform-width numerals (use in tables/pricing) |
| `diagonal-fractions` | diagonal fraction glyphs |
| `stacked-fractions` | stacked fraction glyphs |

Reset with `normal-nums` (e.g. `md:normal-nums`).

---

## 2. Text Spacing

### Letter Spacing (tracking)

| Class | Value |
|-------|-------|
| `tracking-tighter` | −0.05em |
| `tracking-tight` | −0.025em |
| `tracking-normal` | 0em |
| `tracking-wide` | 0.025em |
| `tracking-wider` | 0.05em |
| `tracking-widest` | 0.1em |
| `tracking-(<prop>)` | `letter-spacing: var(<prop>)` |
| `tracking-[<value>]` | `letter-spacing: <value>` |

Negative values (with custom numeric scale): `-tracking-2`.

### Line Height (leading)

Prefer the font-size/line-height shorthand (`text-sm/6`) over standalone `leading-*` where possible.

| Class | CSS |
|-------|-----|
| `leading-none` | `line-height: 1` |
| `leading-<number>` | `line-height: calc(var(--spacing) * <number>)` |
| `leading-(<prop>)` | `line-height: var(<prop>)` |
| `leading-[<value>]` | `line-height: <value>` |

Combined: `text-base/6` sets font-size to base AND line-height to spacing×6.

### Text Indent

| Class | CSS |
|-------|-----|
| `indent-<number>` | `text-indent: calc(var(--spacing) * <number>)` |
| `-indent-<number>` | negative text indent |
| `indent-px` | `text-indent: 1px` |
| `indent-(<prop>)` | `text-indent: var(<prop>)` |
| `indent-[<value>]` | `text-indent: <value>` |

---

## 3. Text Styling

### Text Decoration Line

| Class | CSS |
|-------|-----|
| `underline` | `text-decoration-line: underline` |
| `overline` | `text-decoration-line: overline` |
| `line-through` | `text-decoration-line: line-through` |
| `no-underline` | `text-decoration-line: none` |

### Text Decoration Color

`decoration-<color>` — uses theme color palette (same namespace as `text-*`, `bg-*`).
Supports opacity modifier: `decoration-sky-500/30`.
Custom: `decoration-(<prop>)`, `decoration-[<value>]`.

### Text Decoration Style

| Class | CSS |
|-------|-----|
| `decoration-solid` | solid |
| `decoration-double` | double |
| `decoration-dotted` | dotted |
| `decoration-dashed` | dashed |
| `decoration-wavy` | wavy |

### Text Decoration Thickness

| Class | CSS |
|-------|-----|
| `decoration-<number>` | `text-decoration-thickness: <number>px` |
| `decoration-from-font` | thickness from font metrics |
| `decoration-auto` | browser default |
| `decoration-(length:<prop>)` | `text-decoration-thickness: var(<prop>)` |
| `decoration-[<value>]` | `text-decoration-thickness: <value>` |

### Text Underline Offset

| Class | CSS |
|-------|-----|
| `underline-offset-<number>` | `text-underline-offset: <number>px` |
| `-underline-offset-<number>` | negative offset |
| `underline-offset-auto` | `text-underline-offset: auto` |
| `underline-offset-(<prop>)` | `text-underline-offset: var(<prop>)` |
| `underline-offset-[<value>]` | `text-underline-offset: <value>` |

### Text Shadow (NEW in v4)

| Class | Shadow value |
|-------|-------------|
| `text-shadow-2xs` | `0px 1px 0px rgb(0 0 0 / 0.15)` |
| `text-shadow-xs` | `0px 1px 1px rgb(0 0 0 / 0.2)` |
| `text-shadow-sm` | three-layer at 0.075 opacity |
| `text-shadow-md` | three-layer at 0.1 opacity |
| `text-shadow-lg` | three-layer at 0.1 opacity, wider spread |
| `text-shadow-none` | `text-shadow: none` |
| `text-shadow-(<prop>)` | `text-shadow: var(<prop>)` |
| `text-shadow-[<value>]` | `text-shadow: <value>` |

**Opacity modifier:** `text-shadow-lg/30` — default opacities are low (≤20%), increase for
more pronounced effect.

**Shadow color:** `text-shadow-<color>` sets `--tw-text-shadow-color`. Colored shadows default
to 100% opacity; use modifier to reduce: `text-shadow-sky-300/50`.

**Theme:**
```css
@theme {
  --text-shadow-xl: 0 35px 35px rgb(0 0 0 / 0.25);
}
```

### Text Transform

| Class | CSS |
|-------|-----|
| `uppercase` | `text-transform: uppercase` |
| `lowercase` | `text-transform: lowercase` |
| `capitalize` | `text-transform: capitalize` |
| `normal-case` | `text-transform: none` (reset) |

---

## 4. Text Layout

### Text Alignment

| Class | CSS |
|-------|-----|
| `text-left` | `text-align: left` |
| `text-center` | `text-align: center` |
| `text-right` | `text-align: right` |
| `text-justify` | `text-align: justify` |
| `text-start` | `text-align: start` (logical, RTL-aware) |
| `text-end` | `text-align: end` (logical, RTL-aware) |

Prefer `text-start`/`text-end` for i18n layouts.

### Text Wrap

| Class | CSS | Use case |
|-------|-----|----------|
| `text-wrap` | `text-wrap: wrap` | default wrapping |
| `text-nowrap` | `text-wrap: nowrap` | prevent wrapping |
| `text-balance` | `text-wrap: balance` | even lines in headings (≤6 lines) |
| `text-pretty` | `text-wrap: pretty` | prevent orphans in body text |

`text-balance` is best for headings — browsers cap it at ~6 lines for performance.
`text-pretty` is best for body paragraphs to prevent single-word last lines.

### Text Overflow

| Class | CSS |
|-------|-----|
| `truncate` | `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` |
| `text-ellipsis` | `text-overflow: ellipsis` (requires `overflow-hidden`) |
| `text-clip` | `text-overflow: clip` (requires `overflow-hidden`) |

`truncate` is the shorthand — use it instead of combining three utilities manually.

### Line Clamp

| Class | CSS |
|-------|-----|
| `line-clamp-<number>` | truncates to N lines with ellipsis via `-webkit-line-clamp` |
| `line-clamp-none` | removes clamping |
| `line-clamp-(<prop>)` | dynamic via CSS variable |
| `line-clamp-[<value>]` | arbitrary value |

### White Space

| Class | Newlines | Spaces | Wraps |
|-------|----------|--------|-------|
| `whitespace-normal` | collapsed | collapsed | yes |
| `whitespace-nowrap` | collapsed | collapsed | no |
| `whitespace-pre` | preserved | preserved | no |
| `whitespace-pre-line` | preserved | collapsed | yes |
| `whitespace-pre-wrap` | preserved | preserved | yes |
| `whitespace-break-spaces` | preserved | preserved | yes (trailing spaces wrap) |

### Word Break

| Class | CSS | Effect |
|-------|-----|--------|
| `break-normal` | `word-break: normal` | break at word boundaries |
| `break-all` | `word-break: break-all` | break anywhere, no word preservation |
| `break-keep` | `word-break: keep-all` | prevents CJK text from breaking |

### Hyphens

| Class | CSS |
|-------|-----|
| `hyphens-none` | no hyphenation (ignores `&shy;`) |
| `hyphens-manual` | hyphenate only at `&shy;` (browser default) |
| `hyphens-auto` | browser-controlled, language-aware (requires `lang` attribute) |

### Overflow Wrap

| Class | CSS | Effect |
|-------|-----|--------|
| `wrap-break-word` | `overflow-wrap: break-word` | break within words if needed |
| `wrap-anywhere` | `overflow-wrap: anywhere` | like break-word + affects intrinsic size |
| `wrap-normal` | `overflow-wrap: normal` | natural break points only |

`wrap-anywhere` is useful in flex containers — avoids needing `min-w-0` on flex children.

---

## 5. Lists

### List Style Type

| Class | CSS |
|-------|-----|
| `list-disc` | `list-style-type: disc` |
| `list-decimal` | `list-style-type: decimal` |
| `list-none` | `list-style-type: none` |
| `list-(<prop>)` | `list-style-type: var(<prop>)` |
| `list-[<value>]` | e.g. `list-[upper-roman]` |

### List Style Position

| Class | CSS |
|-------|-----|
| `list-inside` | `list-style-position: inside` |
| `list-outside` | `list-style-position: outside` |

### List Style Image

| Class | CSS |
|-------|-----|
| `list-image-[<value>]` | e.g. `list-image-[url(/img/check.png)]` |
| `list-image-(<prop>)` | `list-style-image: var(<prop>)` |
| `list-image-none` | removes marker image |

---

## 6. Generated Content

| Class | CSS |
|-------|-----|
| `content-[<value>]` | `content: <value>` |
| `content-(<prop>)` | `content: var(<prop>)` |
| `content-none` | `content: none` |

Use with `before:` and `after:` variants:
```html
<a class="after:content-['_↗']">Link</a>
<p before="Hello" class="before:content-[attr(before)]"></p>
```

Spaces in arbitrary values: use underscore (`content-['Hello_World']`).
Literal underscore: escape it (`content-['Hello\_World']`).

---

## v4 Changes from v3

| v3 | v4 |
|----|-----|
| No `text-shadow-*` utilities | `text-shadow-2xs/xs/sm/md/lg` built-in |
| `text-wrap` not supported | `text-balance`, `text-pretty` available |
| `font-stretch-*` not available | `font-stretch-condensed` etc. built-in |
| `leading-tight`, `leading-loose` named scale | Numeric `leading-<number>` against spacing scale |
| `text-<size>` sets font-size only | `text-<size>` also sets default `line-height` via CSS var |
| `overflow-wrap` utilities absent | `wrap-break-word`, `wrap-anywhere`, `wrap-normal` |
