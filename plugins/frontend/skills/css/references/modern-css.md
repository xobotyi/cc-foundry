# Modern CSS Features

Nesting, cascade layers, container queries, `:has()`, custom properties, and
view transitions.

## CSS Nesting

Native CSS nesting eliminates the need for preprocessors in many cases.

```css
.card {
  padding: 1rem;

  .title {
    font-size: 1.5rem;
  }

  &:hover {
    box-shadow: 0 2px 8px rgb(0 0 0 / 0.1);
  }

  @media (width >= 768px) {
    padding: 2rem;
  }
}
```

### Rules

1. **Use `&` for pseudo-classes/elements and compound selectors.**
   `&:hover`, `&::before`, `&.active`.
2. **Omit `&` for descendant selectors.** `.card { .title {} }` works.
3. **`&` is required when the nested selector starts with a type selector.**
   `& p {}` not `p {}` (without `&`, starts a new rule).
4. **Nesting at-rules works.** `@media`, `@supports`, `@container` nest directly.
5. **Specificity:** `:is()` wrapping applies. `.card { .title {} }` has same
   specificity as `.card .title`, but nested `:is(.card) .title` specificity
   may differ. Be aware of specificity changes.
6. **Max depth: 3 levels.** Deeper nesting creates specificity issues and
   couples CSS to DOM structure.

## Cascade Layers (`@layer`)

Layers give explicit control over cascade priority without specificity hacks.

### Layer Order

```css
/* Declare order up-front -- first declared = lowest priority */
@layer reset, defaults, components, utilities;

/* Un-layered styles always beat layered styles */
```

Priority (lowest to highest):
1. `reset` layer
2. `defaults` layer
3. `components` layer
4. `utilities` layer
5. Un-layered styles (highest normal priority)

**`!important` reverses layer order:**
1. `!important reset` (highest important priority)
2. `!important defaults`
3. `!important components`
4. `!important utilities`
5. `!important` un-layered

### Syntax

```css
/* Declare order */
@layer reset, defaults, components, utilities;

/* Block rule -- add styles to a layer */
@layer reset {
  *, *::before, *::after { box-sizing: border-box; }
}

/* Import into a layer */
@import url('vendor.css') layer(defaults);

/* Nested layers */
@layer components {
  @layer buttons, cards;
}
/* Access nested: */
@layer components.buttons { /* ... */ }

/* Anonymous layer (can't be appended to later) */
@layer { /* ... */ }
```

### Best Practices

1. **Declare all layers at the top of the stylesheet** in a single statement.
2. **Typical ordering:** `reset, defaults, themes, components, utilities`.
3. **Import third-party CSS into sub-layers:**
   `@import url('bootstrap.css') layer(vendor.bootstrap);`
4. **Use `revert-layer`** to roll back to the previous layer's value.
5. **`!important` in low layers is intentional** -- it means "this style is
   essential, don't override."
6. **Don't create layers per-component.** Layers manage cascade priority
   between categories (reset vs component vs utility), not scope.

## Container Queries

Style components based on their container's size, not the viewport.

### Setup

```css
/* Define containment context */
.card-wrapper {
  container-type: inline-size;  /* query inline dimension */
  container-name: card;          /* optional: name for targeting */
}

/* Shorthand */
.card-wrapper {
  container: card / inline-size;
}

/* Query the container */
@container card (width > 400px) {
  .card { flex-direction: row; }
}

/* Query nearest ancestor (no name) */
@container (width > 600px) {
  .card__title { font-size: 1.5rem; }
}
```

### Container Query Units

| Unit | Meaning |
|------|---------|
| `cqw` | 1% of container width |
| `cqh` | 1% of container height |
| `cqi` | 1% of container inline size |
| `cqb` | 1% of container block size |
| `cqmin` | smaller of `cqi` or `cqb` |
| `cqmax` | larger of `cqi` or `cqb` |

```css
/* Fluid font size based on container, not viewport */
.card__title {
  font-size: clamp(1rem, 2.5cqi + 0.5rem, 2rem);
}
```

### When to Use

- **Container queries:** Components that appear in different-width contexts
  (cards in sidebar vs main content, widgets in dashboards).
- **Media queries:** Viewport-dependent elements (site header, navigation,
  full-width sections).
- **Flexbox/grid intrinsic sizing:** Simple responsive adjustments
  (wrapping, auto-fit grids).

## The `:has()` Selector

Select elements based on their descendants or siblings. The "parent selector."

```css
/* Style parent based on child */
.card:has(.featured) {
  border: 2px solid var(--accent);
}

/* Style element based on sibling */
h1:has(+ h2) {
  margin-bottom: 0.25rem;
}

/* Logical OR -- has either */
.form:has(:invalid) {
  border-color: red;
}

/* Logical AND -- has both */
.card:has(img):has(.badge) {
  /* card with both image AND badge */
}
```

### Performance Rules

1. **Anchor to specific elements, not `body`, `:root`, or `*`.**
   Broad anchors force expensive re-evaluation on every DOM change.
2. **Use direct child (`>`) or sibling (`+`, `~`) combinators** inside
   `:has()` to limit traversal scope.
3. **Cannot nest `:has()` inside `:has()`.**
4. **Pseudo-elements are not valid** inside `:has()`.

```css
/* Bad -- broad anchor, full subtree traversal */
body:has(.sidebar-open) { /* ... */ }

/* Good -- specific anchor, direct child */
.layout:has(> .sidebar-open) { /* ... */ }
```

## Custom Properties (CSS Variables)

```css
:root {
  --color-primary: #0066cc;
  --spacing-md: 1rem;
}

.button {
  background: var(--color-primary);
  padding: var(--spacing-md);
}
```

### Rules

1. **Define on `:root` for globals.** Scope to components for local overrides.
2. **Always provide fallbacks** for component-level variables:
   `var(--button-bg, var(--color-primary))`.
3. **Case-sensitive.** `--my-color` differs from `--My-Color`.
4. **Custom properties inherit** by default (unlike most CSS properties).
5. **Use `@property` for typed variables:**

```css
@property --gradient-angle {
  syntax: "<angle>";
  inherits: false;
  initial-value: 0deg;
}
```

`@property` enables:
- Type checking (invalid values fall back to `initial-value`)
- Controlled inheritance (`inherits: false`)
- Animatable custom properties (critical for transitions)

### Naming Conventions

```css
:root {
  /* Design tokens -- semantic */
  --color-text-primary: #1a1a1a;
  --color-bg-surface: #ffffff;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;

  /* Component tokens -- scoped */
  --button-bg: var(--color-primary);
  --button-radius: 4px;
}
```

Use kebab-case. Prefix with category: `--color-`, `--spacing-`, `--font-`.

## View Transitions

Animate between DOM states or page navigations.

### Same-Document (SPA)

```js
document.startViewTransition(() => {
  // Update DOM here
});
```

```css
/* Default crossfade */
::view-transition-old(root) {
  animation: fade-out 0.25s ease;
}

::view-transition-new(root) {
  animation: fade-in 0.25s ease;
}
```

### Named Transitions

```css
.card {
  view-transition-name: card-hero;
}

/* Target specific element transition */
::view-transition-group(card-hero) {
  animation-duration: 0.3s;
}
```

### Cross-Document (MPA)

```css
@view-transition {
  navigation: auto;
}
```

### Rules

1. **`view-transition-name` must be unique** per page at transition time.
2. **Keep transitions short** -- 200-400ms for UI, longer for page-level.
3. **Respect `prefers-reduced-motion`:**

```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation-duration: 0.01ms !important;
  }
}
```
