# Layout & Positioning Reference

## 1. Display

| Class               | CSS                          |
|---------------------|------------------------------|
| `block`             | `display: block`             |
| `inline-block`      | `display: inline-block`      |
| `inline`            | `display: inline`            |
| `flex`              | `display: flex`              |
| `inline-flex`       | `display: inline-flex`       |
| `grid`              | `display: grid`              |
| `inline-grid`       | `display: inline-grid`       |
| `flow-root`         | `display: flow-root`         |
| `contents`          | `display: contents`          |
| `hidden`            | `display: none`              |
| `list-item`         | `display: list-item`         |
| `table`             | `display: table`             |
| `inline-table`      | `display: inline-table`      |
| `table-caption`     | `display: table-caption`     |
| `table-cell`        | `display: table-cell`        |
| `table-column`      | `display: table-column`      |
| `table-column-group`| `display: table-column-group`|
| `table-footer-group`| `display: table-footer-group`|
| `table-header-group`| `display: table-header-group`|
| `table-row-group`   | `display: table-row-group`   |
| `table-row`         | `display: table-row`         |

**Accessibility:**

| Class       | Effect                                                    |
|-------------|-----------------------------------------------------------|
| `sr-only`   | Visually hidden, readable by screen readers               |
| `not-sr-only` | Reverses `sr-only` (restores visible layout)            |

`hidden` removes from document flow. `invisible` keeps space but hides visually — use
`visibility` utilities for that (see §7).

**Responsive example:** `flex md:inline-flex`

---

## 2. Position

| Class      | CSS                     |
|------------|-------------------------|
| `static`   | `position: static`      |
| `relative` | `position: relative`    |
| `absolute` | `position: absolute`    |
| `fixed`    | `position: fixed`       |
| `sticky`   | `position: sticky`      |

- `static` — normal flow; offsets ignored; not a positioning context for children.
- `relative` — normal flow; offsets relative to natural position; IS a positioning context.
- `absolute` — removed from flow; offsets relative to nearest non-static ancestor.
- `fixed` — relative to viewport; stays in place on scroll.
- `sticky` — `relative` until threshold crossed, then `fixed` within its scroll container.

### Inset (top / right / bottom / left)

Prefixes: `inset` (all), `inset-x` (inline), `inset-y` (block), `top`, `right`, `bottom`,
`left`, `start` (inline-start), `end` (inline-end).

| Suffix pattern    | CSS value                          |
|-------------------|------------------------------------|
| `-<number>`       | `calc(var(--spacing) * <number>)`  |
| `--<number>`      | negative spacing value             |
| `-<fraction>`     | `calc(<fraction> * 100%)`          |
| `-full`           | `100%`                             |
| `-auto`           | `auto`                             |
| `-px`             | `1px`                              |
| `-(<custom>)`     | `var(<custom>)`                    |
| `-[<value>]`      | `<value>`                          |

**Common placement patterns:**

```html
<!-- Fill parent -->       <div class="absolute inset-0">
<!-- Pin top-left -->      <div class="absolute top-0 left-0">
<!-- Pin top-right -->     <div class="absolute top-0 right-0">
<!-- Span top edge -->     <div class="absolute inset-x-0 top-0 h-16">
<!-- Span left edge -->    <div class="absolute inset-y-0 left-0 w-16">
<!-- Negative offset -->   <div class="absolute -top-4 -left-4">
```

`start-*` / `end-*` map to left/right based on text direction (LTR/RTL).

### Z-Index

| Class             | CSS                           |
|-------------------|-------------------------------|
| `z-<number>`      | `z-index: <number>`           |
| `-z-<number>`     | `z-index: calc(<number> * -1)`|
| `z-auto`          | `z-index: auto`               |
| `z-[<value>]`     | `z-index: <value>`            |
| `z-(<custom>)`    | `z-index: var(<custom>)`      |

**Responsive example:** `z-10 md:z-50`

---

## 3. Float & Clear

**Float** — legacy wrapping layout. Prefer flex/grid for new work.

| Class         | CSS                       |
|---------------|---------------------------|
| `float-left`  | `float: left`             |
| `float-right` | `float: right`            |
| `float-start` | `float: inline-start`     |
| `float-end`   | `float: inline-end`       |
| `float-none`  | `float: none`             |

**Clear**

| Class         | CSS                       |
|---------------|---------------------------|
| `clear-left`  | `clear: left`             |
| `clear-right` | `clear: right`            |
| `clear-both`  | `clear: both`             |
| `clear-start` | `clear: inline-start`     |
| `clear-end`   | `clear: inline-end`       |
| `clear-none`  | `clear: none`             |

`float-start`/`float-end` and `clear-start`/`clear-end` are logical properties — direction-aware.

---

## 4. Flexbox

### Container

Apply `flex` or `inline-flex` to the container, then use the flex child utilities on items.

**Direction**

| Class              | CSS                             |
|--------------------|---------------------------------|
| `flex-row`         | `flex-direction: row`           |
| `flex-row-reverse` | `flex-direction: row-reverse`   |
| `flex-col`         | `flex-direction: column`        |
| `flex-col-reverse` | `flex-direction: column-reverse`|

**Wrap**

| Class               | CSS                      |
|---------------------|--------------------------|
| `flex-nowrap`       | `flex-wrap: nowrap`      |
| `flex-wrap`         | `flex-wrap: wrap`        |
| `flex-wrap-reverse` | `flex-wrap: wrap-reverse`|

### Flex Items

**Flex shorthand**

| Class           | CSS                              |
|-----------------|----------------------------------|
| `flex-1`        | `flex: 1` (grow/shrink, ignore initial size) |
| `flex-auto`     | `flex: auto` (grow/shrink, respect initial)  |
| `flex-initial`  | `flex: 0 auto` (shrink only)    |
| `flex-none`     | `flex: none` (fixed size)       |
| `flex-<number>` | `flex: <number>`                |
| `flex-<fraction>`| `flex: calc(<fraction> * 100%)` |
| `flex-[<value>]`| `flex: <value>`                 |

**Grow**

| Class           | CSS                   |
|-----------------|-----------------------|
| `grow`          | `flex-grow: 1`        |
| `grow-0`        | `flex-grow: 0`        |
| `grow-<number>` | `flex-grow: <number>` |

**Shrink**

| Class             | CSS                     |
|-------------------|-------------------------|
| `shrink`          | `flex-shrink: 1`        |
| `shrink-0`        | `flex-shrink: 0`        |
| `shrink-<number>` | `flex-shrink: <number>` |

**Basis** (initial size of flex items)

| Class              | CSS value                                   |
|--------------------|---------------------------------------------|
| `basis-<number>`   | `calc(var(--spacing) * <number>)`           |
| `basis-<fraction>` | `calc(<fraction> * 100%)`                   |
| `basis-full`       | `100%`                                      |
| `basis-auto`       | `auto`                                      |
| `basis-3xs`…`basis-7xl` | container scale tokens (256px–1280px) |
| `basis-[<value>]`  | `<value>`                                   |

---

## 5. Grid

### Template

| Class                     | CSS                                                    |
|---------------------------|--------------------------------------------------------|
| `grid-cols-<number>`      | `grid-template-columns: repeat(<n>, minmax(0, 1fr))`   |
| `grid-cols-none`          | `grid-template-columns: none`                          |
| `grid-cols-subgrid`       | `grid-template-columns: subgrid`                       |
| `grid-cols-[<value>]`     | `grid-template-columns: <value>`                       |
| `grid-rows-<number>`      | `grid-template-rows: repeat(<n>, minmax(0, 1fr))`      |
| `grid-rows-none`          | `grid-template-rows: none`                             |
| `grid-rows-subgrid`       | `grid-template-rows: subgrid`                          |
| `grid-rows-[<value>]`     | `grid-template-rows: <value>`                          |

**Subgrid** — child container adopts parent's tracks. Requires `col-span-*` or `row-span-*`
on the subgrid element to define its span within the parent.

### Auto Flow

| Class                 | CSS                            |
|-----------------------|--------------------------------|
| `grid-flow-row`       | `grid-auto-flow: row`          |
| `grid-flow-col`       | `grid-auto-flow: column`       |
| `grid-flow-dense`     | `grid-auto-flow: dense`        |
| `grid-flow-row-dense` | `grid-auto-flow: row dense`    |
| `grid-flow-col-dense` | `grid-auto-flow: column dense` |

### Auto Columns / Rows

| Class              | CSS                              |
|--------------------|----------------------------------|
| `auto-cols-auto`   | `grid-auto-columns: auto`        |
| `auto-cols-min`    | `grid-auto-columns: min-content` |
| `auto-cols-max`    | `grid-auto-columns: max-content` |
| `auto-cols-fr`     | `grid-auto-columns: minmax(0, 1fr)` |
| `auto-rows-auto`   | `grid-auto-rows: auto`           |
| `auto-rows-min`    | `grid-auto-rows: min-content`    |
| `auto-rows-max`    | `grid-auto-rows: max-content`    |
| `auto-rows-fr`     | `grid-auto-rows: minmax(0, 1fr)` |

Custom: `auto-cols-[minmax(0,2fr)]`, `auto-rows-(<custom>)`

### Column Placement

| Class                | CSS                                          |
|----------------------|----------------------------------------------|
| `col-span-<number>`  | `grid-column: span <n> / span <n>`           |
| `col-span-full`      | `grid-column: 1 / -1`                        |
| `col-start-<number>` | `grid-column-start: <n>`                     |
| `-col-start-<number>`| `grid-column-start: calc(<n> * -1)`          |
| `col-start-auto`     | `grid-column-start: auto`                    |
| `col-end-<number>`   | `grid-column-end: <n>`                       |
| `col-end-auto`       | `grid-column-end: auto`                      |
| `col-auto`           | `grid-column: auto`                          |

### Row Placement

| Class               | CSS                                         |
|---------------------|---------------------------------------------|
| `row-span-<number>` | `grid-row: span <n> / span <n>`             |
| `row-span-full`     | `grid-row: 1 / -1`                          |
| `row-start-<number>`| `grid-row-start: <n>`                       |
| `row-start-auto`    | `grid-row-start: auto`                      |
| `row-end-<number>`  | `grid-row-end: <n>`                         |
| `row-end-auto`      | `grid-row-end: auto`                        |
| `row-auto`          | `grid-row: auto`                            |

### Gap

| Class             | CSS                                         |
|-------------------|---------------------------------------------|
| `gap-<number>`    | `gap: calc(var(--spacing) * <n>)`           |
| `gap-x-<number>`  | `column-gap: calc(var(--spacing) * <n>)`    |
| `gap-y-<number>`  | `row-gap: calc(var(--spacing) * <n>)`       |
| `gap-[<value>]`   | `gap: <value>`                              |
| `gap-(<custom>)`  | `gap: var(<custom>)`                        |

Gap applies to both flex and grid containers.

### Order

| Class              | CSS                           |
|--------------------|-------------------------------|
| `order-<number>`   | `order: <number>`             |
| `-order-<number>`  | `order: calc(<number> * -1)`  |
| `order-first`      | `order: -9999`                |
| `order-last`       | `order: 9999`                 |
| `order-none`       | `order: 0`                    |
| `order-[<value>]`  | `order: <value>`              |

---

## 6. Alignment

Alignment utilities work across both flex and grid containers. The axis semantics differ:
in flex, "main axis" = direction of `flex-direction`; in grid, inline axis = horizontal,
block axis = vertical.

### justify-content — main/inline axis of container

| Class                    | CSS                            |
|--------------------------|--------------------------------|
| `justify-start`          | `justify-content: flex-start`  |
| `justify-end`            | `justify-content: flex-end`    |
| `justify-end-safe`       | `justify-content: safe flex-end` |
| `justify-center`         | `justify-content: center`      |
| `justify-center-safe`    | `justify-content: safe center` |
| `justify-between`        | `justify-content: space-between` |
| `justify-around`         | `justify-content: space-around`|
| `justify-evenly`         | `justify-content: space-evenly`|
| `justify-stretch`        | `justify-content: stretch`     |
| `justify-normal`         | `justify-content: normal`      |
| `justify-baseline`       | `justify-content: baseline`    |

### align-content — cross/block axis, multi-row containers

| Class              | CSS                              |
|--------------------|----------------------------------|
| `content-normal`   | `align-content: normal`          |
| `content-start`    | `align-content: flex-start`      |
| `content-end`      | `align-content: flex-end`        |
| `content-center`   | `align-content: center`          |
| `content-between`  | `align-content: space-between`   |
| `content-around`   | `align-content: space-around`    |
| `content-evenly`   | `align-content: space-evenly`    |
| `content-baseline` | `align-content: baseline`        |
| `content-stretch`  | `align-content: stretch`         |

### align-items — cross axis of container (all items)

| Class                  | CSS                          |
|------------------------|------------------------------|
| `items-start`          | `align-items: flex-start`    |
| `items-end`            | `align-items: flex-end`      |
| `items-end-safe`       | `align-items: safe flex-end` |
| `items-center`         | `align-items: center`        |
| `items-center-safe`    | `align-items: safe center`   |
| `items-baseline`       | `align-items: baseline`      |
| `items-baseline-last`  | `align-items: last baseline` |
| `items-stretch`        | `align-items: stretch`       |

### align-self — cross axis override for individual item

| Class                 | CSS                         |
|-----------------------|-----------------------------|
| `self-auto`           | `align-self: auto`          |
| `self-start`          | `align-self: flex-start`    |
| `self-end`            | `align-self: flex-end`      |
| `self-end-safe`       | `align-self: safe flex-end` |
| `self-center`         | `align-self: center`        |
| `self-center-safe`    | `align-self: safe center`   |
| `self-stretch`        | `align-self: stretch`       |
| `self-baseline`       | `align-self: baseline`      |
| `self-baseline-last`  | `align-self: last baseline` |

### justify-items — inline axis of grid container (all items)

| Class                       | CSS                         |
|-----------------------------|-----------------------------|
| `justify-items-start`       | `justify-items: start`      |
| `justify-items-end`         | `justify-items: end`        |
| `justify-items-end-safe`    | `justify-items: safe end`   |
| `justify-items-center`      | `justify-items: center`     |
| `justify-items-center-safe` | `justify-items: safe center`|
| `justify-items-stretch`     | `justify-items: stretch`    |
| `justify-items-normal`      | `justify-items: normal`     |

### justify-self — inline axis override for individual grid item

| Class                      | CSS                          |
|----------------------------|------------------------------|
| `justify-self-auto`        | `justify-self: auto`         |
| `justify-self-start`       | `justify-self: start`        |
| `justify-self-end`         | `justify-self: end`          |
| `justify-self-end-safe`    | `justify-self: safe end`     |
| `justify-self-center`      | `justify-self: center`       |
| `justify-self-center-safe` | `justify-self: safe center`  |
| `justify-self-stretch`     | `justify-self: stretch`      |

### place-content — shorthand for align-content + justify-content

| Class                    | CSS                             |
|--------------------------|---------------------------------|
| `place-content-center`   | `place-content: center`         |
| `place-content-center-safe` | `place-content: safe center` |
| `place-content-start`    | `place-content: start`          |
| `place-content-end`      | `place-content: end`            |
| `place-content-end-safe` | `place-content: safe end`       |
| `place-content-between`  | `place-content: space-between`  |
| `place-content-around`   | `place-content: space-around`   |
| `place-content-evenly`   | `place-content: space-evenly`   |
| `place-content-baseline` | `place-content: baseline`       |
| `place-content-stretch`  | `place-content: stretch`        |

**Safe alignment** (`-safe` suffix) — falls back to `start` alignment when content
overflows the container. Prevents clipping on the hidden side.

---

## 7. Visibility & Isolation

### Visibility

| Class       | CSS                        | Effect                                     |
|-------------|----------------------------|--------------------------------------------|
| `visible`   | `visibility: visible`      | Normal visibility                          |
| `invisible` | `visibility: hidden`       | Hidden but retains layout space            |
| `collapse`  | `visibility: collapse`     | Table rows/cols hidden without layout shift|

`invisible` vs `hidden`: `invisible` keeps the element in document flow (space preserved);
`hidden` (`display: none`) removes it entirely.

`collapse` is designed for table rows, row groups, columns, column groups — hides without
affecting column widths or row heights of other cells.

### Isolation

| Class             | CSS                    |
|-------------------|------------------------|
| `isolate`         | `isolation: isolate`   |
| `isolation-auto`  | `isolation: auto`      |

`isolate` creates a new stacking context without needing `z-index`. Use to prevent
`mix-blend-mode` or `z-index` from leaking across component boundaries.

---

## Common Layout Recipes

**Center content in a box:**
```html
<div class="flex items-center justify-center">...</div>
<!-- or -->
<div class="grid place-content-center">...</div>
```

**Sidebar + main (fixed sidebar):**
```html
<div class="flex gap-4">
  <aside class="w-64 shrink-0">...</aside>
  <main class="flex-1 min-w-0">...</main>
</div>
```

**Holy grail (header, footer, sidebar, main):**
```html
<div class="grid grid-rows-[auto_1fr_auto] min-h-screen">
  <header>...</header>
  <div class="flex">
    <aside class="w-64 shrink-0">...</aside>
    <main class="flex-1">...</main>
  </div>
  <footer>...</footer>
</div>
```

**Sticky header:**
```html
<header class="sticky top-0 z-10">...</header>
```

**Absolute overlay (fill parent):**
```html
<div class="relative">
  <div class="absolute inset-0 bg-black/50">...</div>
</div>
```

**Responsive column count:**
```html
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">...</div>
```

**Auto-fit responsive grid (arbitrary value):**
```html
<div class="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">...</div>
```

---

## Arbitrary Values

All layout utilities accept arbitrary values in `[...]` and CSS custom properties in `(...)`:

```html
<div class="grid-cols-[200px_1fr_200px]">         <!-- custom template -->
<div class="col-span-[3]">                         <!-- arbitrary span -->
<div class="top-[calc(100vh-4rem)]">               <!-- calc expression -->
<div class="z-[999]">                              <!-- arbitrary z-index -->
<div class="gap-[clamp(1rem,3vw,2rem)]">           <!-- clamp -->
<div class="inset-(--nav-height)">                 <!-- CSS custom property -->
```
