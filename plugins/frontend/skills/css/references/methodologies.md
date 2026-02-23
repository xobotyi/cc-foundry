# CSS Methodologies

Naming conventions, architecture patterns, and organization strategies.

## BEM (Block Element Modifier)

Naming convention that creates clear relationships between HTML and CSS.

```css
/* Block */
.card { }

/* Element (double underscore) */
.card__title { }
.card__image { }

/* Modifier (double hyphen) */
.card--featured { }
.card__title--large { }
```

### Rules

- **Blocks** are standalone components: `.card`, `.nav`, `.form`.
- **Elements** are parts of a block: `.card__header`, `.card__body`.
- **Modifiers** are variations: `.card--dark`, `.card__title--bold`.
- **Never nest elements:** `.card__header__title` is wrong.
  Flatten to `.card__title` or create a new block.
- **Modifiers don't exist alone.** Always pair with the base class:
  `class="card card--featured"`.

### When to Use BEM

- Team projects needing consistent conventions
- Large codebases with many components
- Projects without CSS Modules or scoped styles

### When BEM Is Unnecessary

- CSS Modules or scoped component styles (framework handles scoping)
- Utility-first CSS (Tailwind)
- Small projects with few components

## CSS Modules

Scoped CSS classes compiled to unique identifiers. Eliminates naming conflicts.

```css
/* Button.module.css */
.button {
  padding: 0.5rem 1rem;
}

.primary {
  background: var(--color-primary);
}
```

```jsx
import styles from './Button.module.css';
<button className={`${styles.button} ${styles.primary}`}>Click</button>
```

### Rules

- **Use simple, descriptive class names.** Scoping eliminates conflict risk.
  `.button` not `.btn-component-primary-v2`.
- **One module per component.**
- **Compose shared styles:**
  ```css
  .button {
    composes: resetButton from './shared.module.css';
  }
  ```
- **Global escape hatch:** `:global(.utility-class)` when needed.
- **Pair with custom properties** for theming (variables aren't scoped).

## Utility-First CSS

Small, single-purpose classes composed in HTML. Tailwind CSS is the
primary framework.

```html
<div class="flex items-center gap-4 p-4 rounded-lg bg-white shadow-md">
  <img class="w-12 h-12 rounded-full" src="avatar.jpg" alt="" />
  <div>
    <p class="font-semibold text-gray-900">Name</p>
    <p class="text-sm text-gray-500">Role</p>
  </div>
</div>
```

### When to Use Utilities

- Rapid prototyping
- Design system implementation with strict constraints
- Teams comfortable with utility patterns

### When to Avoid

- Content-heavy sites with repetitive patterns (use component classes)
- When HTML readability is critical
- Projects without build tooling to purge unused utilities

### Hybrid Approach

Combine utilities with component classes:

```css
/* Component base via CSS */
.card {
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-md);
  overflow: hidden;
}

/* Variations and one-offs via utilities in HTML */
```

## Architecture Patterns

### ITCSS (Inverted Triangle CSS)

Organize styles by specificity, from low to high:

1. **Settings** -- Variables, design tokens
2. **Tools** -- Mixins, functions
3. **Generic** -- Reset, normalize
4. **Elements** -- Bare HTML elements (`h1`, `p`, `a`)
5. **Objects** -- Layout patterns (`.container`, `.grid`)
6. **Components** -- UI components (`.card`, `.button`)
7. **Utilities** -- Overrides (`.hidden`, `.text-center`)

Maps naturally to cascade layers:

```css
@layer settings, generic, elements, objects, components, utilities;
```

### Modern Token-Based Architecture

```
tokens/
├── colors.css       /* Design tokens as custom properties */
├── spacing.css
├── typography.css
└── index.css        /* @import all tokens */

base/
├── reset.css
├── typography.css
└── index.css

components/
├── button.css
├── card.css
└── index.css

utilities/
├── spacing.css
├── display.css
└── index.css
```

## Selector Strategy

### Specificity Management

- **Keep specificity flat and low.** Prefer single class selectors.
- **Never use ID selectors for styling.** `#header` = specificity 1-0-0.
- **Avoid qualifying classes with elements.** `.error` not `div.error`.
- **Use `:where()` to zero-out specificity** when needed:
  ```css
  :where(.card) .title { /* 0-0-1 specificity */ }
  ```
- **Use `:is()` with awareness** -- takes highest specificity of its arguments.

### Selector Nesting Depth

- **Maximum 3 levels.** Deeper nesting = DOM coupling = fragile styles.
- **Flatten in SCSS.** Just because you can nest doesn't mean you should.

```scss
/* Bad */
.page {
  .content {
    .card {
      .card-header {
        .title { }  /* 5 levels deep */
      }
    }
  }
}

/* Good */
.card__title { }  /* flat */
```

## Formatting

### Declaration Order

Group related properties. Within groups, alphabetize or follow
a consistent convention.

**Recommended grouping order:**
1. Layout (`display`, `position`, `grid-*`, `flex-*`)
2. Box model (`width`, `height`, `margin`, `padding`, `border`)
3. Typography (`font-*`, `text-*`, `color`, `line-height`)
4. Visual (`background`, `box-shadow`, `opacity`, `transform`)
5. Interaction (`cursor`, `pointer-events`, `transition`, `animation`)

### General Rules

- **2-space indentation.** No tabs.
- **One declaration per line.**
- **Semicolon after every declaration** (including the last one).
- **Space after colon:** `color: red` not `color:red`.
- **Opening brace on same line** as selector.
- **Blank line between rules.**
- **Lowercase everything** (selectors, properties, values, hex colors).
- **Single quotes** for attribute selectors and font names:
  `font-family: 'Open Sans', sans-serif`.
- **No units on zero values:** `margin: 0` not `margin: 0px`
  (except where required, e.g., `flex: 0 0 0px`).
- **Leading zero on decimals:** `opacity: 0.5` not `opacity: .5`.
- **Shorthand hex where possible:** `#ebc` not `#eebbcc`.
- **Avoid `!important`.** Use cascade layers or specificity to resolve conflicts.
