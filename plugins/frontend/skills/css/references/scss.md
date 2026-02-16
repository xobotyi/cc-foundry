# SCSS / Dart Sass

Modern Dart Sass with the `@use`/`@forward` module system.

## Module System

**`@import` is deprecated** as of Dart Sass 1.80.0 and will be removed in
Dart Sass 3.0.0. Use `@use` and `@forward` exclusively.

### `@use`

Loads modules with namespaced access. Each module loaded once regardless of
how many files `@use` it.

```scss
// Load with default namespace (filename)
@use 'variables';

.button {
  color: variables.$primary;
  @include variables.rounded;
}

// Custom namespace
@use 'variables' as vars;
.button { color: vars.$primary; }

// No namespace (use sparingly, only for your own files)
@use 'variables' as *;
.button { color: $primary; }
```

**Rules:**
1. `@use` must appear before any rules except `@forward`.
2. Namespace defaults to the last component of the URL (without extension).
3. Members are scoped to the loading file -- not globally available.
4. Each module loaded exactly once -- no duplicate CSS output.

### `@forward`

Re-exports a module's members for downstream consumers. Used to create
public API entrypoints.

```scss
// _index.scss -- library entrypoint
@forward 'colors';
@forward 'typography';
@forward 'spacing';
```

**Adding prefixes:**
```scss
// Prefix all forwarded members
@forward 'buttons' as btn-*;
// Consumers: button.$btn-primary, @include button.btn-rounded
```

**Controlling visibility:**
```scss
@forward 'internal' hide $private-var, secret-mixin;
@forward 'internal' show $public-var, public-mixin;
```

**Configuration passthrough:**
```scss
// _opinionated.scss
@forward 'library' with (
  $primary: #0066cc !default,
  $border-radius: 4px !default
);
```

### Module Configuration

```scss
// _theme.scss
$primary: #0066cc !default;
$font-stack: system-ui, sans-serif !default;

// main.scss -- configure on first load
@use 'theme' with (
  $primary: #ff6600,
  $font-stack: 'Inter', sans-serif
);
```

Configuration applies globally for that module -- all subsequent `@use`
of the same module see the configured values.

### Private Members

Prefix with `-` or `_` to make members private to the module:

```scss
// _helpers.scss
$-internal-spacing: 8px;  // private
$public-spacing: 16px;    // public

@mixin -internal-reset { /* private */ }
@mixin public-reset { /* public */ }
```

### File Organization

```
styles/
├── _index.scss          # @forward entrypoint
├── abstracts/
│   ├── _index.scss      # @forward variables, mixins, functions
│   ├── _variables.scss
│   ├── _mixins.scss
│   └── _functions.scss
├── base/
│   ├── _index.scss
│   ├── _reset.scss
│   └── _typography.scss
├── components/
│   ├── _index.scss
│   ├── _button.scss
│   └── _card.scss
├── layout/
│   ├── _index.scss
│   ├── _header.scss
│   └── _grid.scss
└── main.scss            # @use 'abstracts', 'base', etc.
```

**Index files:** `_index.scss` in a folder loads automatically when you
`@use` the folder name: `@use 'abstracts'` loads `abstracts/_index.scss`.

**Partials:** Files prefixed with `_` are partials -- not compiled standalone.
Omit the `_` in `@use` paths.

## Built-in Modules

Access via `@use "sass:module"`:

```scss
@use "sass:math";
@use "sass:color";
@use "sass:string";
@use "sass:list";
@use "sass:map";
@use "sass:meta";
@use "sass:selector";
```

```scss
@use "sass:math";
@use "sass:color";

.element {
  width: math.div(100%, 3);           // Not 100% / 3
  color: color.adjust($primary, $lightness: -10%);
}
```

**The `/` operator for division is deprecated.** Use `math.div()`.

## SCSS Features

### Variables

```scss
$primary: #0066cc;
$spacing: (
  sm: 0.5rem,
  md: 1rem,
  lg: 2rem,
);
```

### Mixins

```scss
@mixin respond-to($breakpoint) {
  @if $breakpoint == 'md' {
    @media (width >= 768px) { @content; }
  } @else if $breakpoint == 'lg' {
    @media (width >= 1024px) { @content; }
  }
}

.card {
  padding: 1rem;

  @include respond-to('md') {
    padding: 2rem;
  }
}
```

### Functions

```scss
@use "sass:math";

@function rem($px, $base: 16) {
  @return math.div($px, $base) * 1rem;
}

.element {
  font-size: rem(18);  // 1.125rem
}
```

### Placeholder Selectors and `@extend`

```scss
%visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  clip: rect(0 0 0 0);
  overflow: hidden;
}

.sr-only {
  @extend %visually-hidden;
}
```

**Prefer mixins over `@extend`** in most cases. `@extend` produces
unexpected selectors and doesn't work across media queries.

### Maps for Design Tokens

```scss
@use "sass:map";

$colors: (
  'primary': #0066cc,
  'secondary': #6c757d,
  'danger': #dc3545,
);

@function color($name) {
  @return map.get($colors, $name);
}

.alert {
  background: color('danger');
}
```

### Loops for Utility Generation

```scss
@use "sass:map";

$spacing: (0: 0, 1: 0.25rem, 2: 0.5rem, 3: 1rem, 4: 2rem);

@each $key, $value in $spacing {
  .mt-#{$key} { margin-top: $value; }
  .mb-#{$key} { margin-bottom: $value; }
  .p-#{$key} { padding: $value; }
}
```

## Migration from `@import`

Use the official migrator:

```bash
npm install -g sass-migrator
sass-migrator module --migrate-deps your-entrypoint.scss
```

For built-in functions only (leave `@import` for now):
```bash
sass-migrator module --built-in-only your-entrypoint.scss
```

### Key Changes

| `@import` | `@use`/`@forward` |
|-----------|-------------------|
| Global namespace | Namespaced access |
| Loads multiple times | Loads once |
| Variables globally available | Scoped to loading file |
| `@import "file"` | `@use "file"` |
| No visibility control | `hide`/`show` in `@forward` |
| `$var: value !global` | `@use ... with ($var: value)` |
| `lighten($color, 10%)` | `color.adjust($color, $lightness: 10%)` |
| `percentage(0.5)` | `math.percentage(0.5)` |

## Anti-Patterns

| Don't | Do |
|-------|------|
| `@import` | `@use` and `@forward` |
| Global variables without `!default` | `$var: value !default` for configurable modules |
| `@extend` across components | `@mixin` -- more predictable output |
| Deep nesting (> 3 levels) | Flatten selectors |
| `100% / 3` division | `math.div(100%, 3)` |
| `lighten()` / `darken()` globals | `color.adjust()` from `sass:color` |
| Barrel files with `@use` of everything | `@forward` in `_index.scss` entrypoints |
