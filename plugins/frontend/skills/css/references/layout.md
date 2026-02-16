# Layout Systems

CSS layout with Flexbox and Grid. Choose the right system, apply it correctly.

## Flexbox vs Grid

| Use | System |
|-----|--------|
| One-dimensional flow (row or column) | Flexbox |
| Two-dimensional layout (rows AND columns) | Grid |
| Content-driven sizing | Flexbox |
| Layout-driven sizing | Grid |
| Component internals (nav items, card content) | Flexbox |
| Page-level structure, complex arrangements | Grid |
| Items need to wrap naturally | Flexbox |
| Precise placement on named lines/areas | Grid |

Both work together. A grid item can be a flex container and vice versa.

## Flexbox

### Container Properties

```css
.container {
  display: flex;
  flex-direction: row;        /* row | row-reverse | column | column-reverse */
  flex-wrap: wrap;             /* nowrap | wrap | wrap-reverse */
  justify-content: flex-start; /* flex-start | flex-end | center | space-between | space-around | space-evenly */
  align-items: stretch;        /* stretch | flex-start | flex-end | center | baseline */
  align-content: normal;       /* applies only when flex-wrap: wrap */
  gap: 1rem;                   /* row-gap column-gap */
}
```

**Shorthand:** `flex-flow: row wrap` combines `flex-direction` and `flex-wrap`.

### Item Properties

```css
.item {
  flex: 1 1 auto;  /* flex-grow flex-shrink flex-basis */
  align-self: center;
  order: 0;
}
```

**Always use the `flex` shorthand.** It sets intelligent defaults:
- `flex: 1` = `flex: 1 1 0` -- equal sizing from zero basis
- `flex: auto` = `flex: 1 1 auto` -- grow/shrink from content size
- `flex: none` = `flex: 0 0 auto` -- fully inflexible
- `flex: initial` = `flex: 0 1 auto` -- can shrink, won't grow

### Intrinsic Responsive Wrapping

Use `flex-wrap` with `flex` to create responsive layouts without media queries:

```css
/* Items wrap when they can't maintain 300px minimum */
.container {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.item {
  flex: 1 1 300px; /* grow, shrink, 300px ideal basis */
}
```

This is the preferred pattern for content-driven responsive layouts.

### Centering

```css
/* Perfect centering */
.parent {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Or with auto margins */
.parent { display: flex; }
.child { margin: auto; }
```

### Common Patterns

**Space-between with wrapping fallback:**
```css
.nav {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.5rem;
}
```

**Alignment shifting wrapping (title + action):**
```css
.header {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.header__title {
  flex: 1 1 400px; /* wraps below 400px */
}
```

## CSS Grid

### Defining Tracks

```css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: auto 1fr auto;
  gap: 1rem;
}
```

**Key functions:**
- `repeat(count, size)` -- repeat track patterns
- `minmax(min, max)` -- flexible track sizing
- `fit-content(max)` -- size to content with a cap
- `fr` unit -- fraction of remaining free space

### Responsive Grid Without Media Queries

The canonical responsive grid pattern:

```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}
```

- `auto-fit` -- expand columns to fill space (prefer over `auto-fill` in most cases)
- `auto-fill` -- keep empty tracks (useful when you want consistent column count)

### Named Grid Areas

```css
.layout {
  display: grid;
  grid-template-areas:
    "header header header"
    "sidebar main aside"
    "footer footer footer";
  grid-template-columns: 200px 1fr 200px;
  grid-template-rows: auto 1fr auto;
}

.header { grid-area: header; }
.sidebar { grid-area: sidebar; }
.main { grid-area: main; }
```

Named areas auto-create named lines: `header-start`, `header-end`, etc.

### Line-Based Placement

```css
.item {
  grid-column: 1 / 3;     /* start-line / end-line */
  grid-row: 2 / span 2;   /* start / span count */
}
```

Negative line numbers count from the end: `grid-column: 1 / -1` spans full width.

### Subgrid

Children inherit parent grid tracks:

```css
.parent {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
}

.child {
  grid-column: 2 / 4;
  display: grid;
  grid-template-columns: subgrid; /* inherits parent lines */
}
```

### Alignment in Grid

```css
.grid {
  /* Align all items */
  justify-items: start;    /* inline axis */
  align-items: center;     /* block axis */

  /* Align the grid itself within container */
  justify-content: center;
  align-content: start;
}

.item {
  /* Override for single item */
  justify-self: end;
  align-self: stretch;
}

/* Shorthand */
.grid {
  place-items: center;     /* align-items / justify-items */
  place-content: center;   /* align-content / justify-content */
}
```

### Implicit Grid

Items placed beyond explicit tracks create implicit tracks:

```css
.grid {
  grid-auto-rows: minmax(100px, auto);  /* size implicit rows */
  grid-auto-flow: dense;  /* fill holes (use carefully -- affects a11y) */
}
```

## Anti-Patterns

| Don't | Do |
|-------|------|
| `float` for layout | Flexbox or Grid |
| Flexbox for 2D layouts | Grid |
| Grid for simple row of items | Flexbox |
| `grid-auto-flow: dense` without considering a11y | Explicit placement or accept gaps |
| Hardcoded `px` widths on grid items | `fr`, `minmax()`, or `auto` |
| Media queries for every breakpoint | `auto-fit`/`auto-fill` + `minmax()` |
| `order` that breaks logical reading order | Source order matches visual order |
| `justify-content: space-between` with wrap (orphan gap) | `gap` + `flex-wrap` |
