# frontend

Frontend platform discipline plugin for Claude Code.

## The Problem

Browser development requires specialized knowledge beyond general programming — CSS layout
systems, accessibility standards, framework-specific patterns, and cross-browser compatibility.
Generic coding skills don't capture these platform-specific practices.

## The Solution

Provides skills that teach Claude browser-specific practices: CSS methodologies, accessibility
patterns, and framework conventions for React, Vue, and Svelte. Keeps platform discipline
separate from language discipline (JavaScript/TypeScript).

## Installation

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install frontend
```

## Skills

### css

CSS conventions, layout systems, and modern patterns (nesting, cascade layers, container
queries, custom properties, SCSS/SASS). **Use when:** writing, reviewing, refactoring,
debugging, or understanding CSS and styling code.

### react

React component patterns, hooks, state management, performance optimization, and testing
conventions. **Use when:** working with React components, JSX, hooks, Context, or React
Testing Library.

### vue

Vue 3 Composition API, SFC patterns, reactivity system, composables, and TypeScript
integration. **Use when:** working with Vue components, composables, or Vue reactivity
patterns.

### svelte

Svelte 5 runes-first reactivity and SvelteKit fullstack conventions. **Use when:** working
with Svelte components, runes ($state, $derived, $effect), or SvelteKit routing and load
functions.

### tailwindcss

Tailwind CSS v4 utility-first discipline: CSS-first configuration via `@theme`, design
tokens, principled class composition, and framework integration patterns. Requires the
`css` skill as a prerequisite — loads it automatically. Includes 9 reference files covering
theme configuration, custom utilities/variants, class authoring conventions, framework
setup (Vite/PostCSS/Prettier), layout, sizing and spacing, typography, backgrounds and
effects, and transforms/animations. **Use when:** writing, reviewing, refactoring, or
debugging Tailwind CSS utility classes, theme configuration, custom utilities, dark mode,
or Tailwind integration with React/Vue/Svelte.

### accessibility

Web accessibility discipline: WCAG 2.2 compliance, ARIA patterns, semantic HTML, keyboard
navigation, and focus management. **Use when:** building accessible UI, reviewing
accessibility, or implementing interactive component patterns.

## Related Plugins

- **javascript** — JavaScript and TypeScript language discipline
- **the-coder** — Language-agnostic coding discipline (discovery, planning, verification)

## License

MIT
