# frontend Plugin

Frontend platform discipline: CSS, accessibility, framework conventions, and browser-specific practices.

## Skills

- **`css`** — CSS conventions, layout systems, SCSS/SASS (modern Dart Sass), responsive design, methodologies
- **`tailwindcss`** — Tailwind CSS v4 utility-first discipline: CSS-first config, `@theme` tokens, class composition
- **`react`** — React component patterns, hooks, state management, performance, testing conventions
- **`vue`** — Vue 3 Composition API, SFC patterns, reactivity, composables, TypeScript integration
- **`svelte`** — Svelte 5 runes, reactivity model, SvelteKit conventions (routing, load, form actions)
- **`accessibility`** — WCAG 2.2 compliance, ARIA patterns, semantic HTML, keyboard navigation, focus management

## Skill Dependencies

- `tailwindcss` → `css` — hard prerequisite, enforced by a `<prerequisite>` block that invokes `frontend:css`

## Plugin Scope

- Language discipline (JavaScript/TypeScript) belongs to the `javascript` plugin, never to a skill here
- `css`, `tailwindcss`, and `accessibility` apply across all frontend work; `react`, `vue`, and `svelte` carry
  framework-specific conventions
