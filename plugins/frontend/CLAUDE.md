# frontend Plugin

Frontend platform discipline: CSS, accessibility, framework conventions, and browser-specific
practices.

## Skills

| Skill | Purpose |
|-------|---------|
| `css` | CSS conventions, layout systems, SCSS/SASS (modern Dart Sass), responsive design, methodologies |
| `tailwindcss` | Tailwind CSS v4 utility-first discipline: CSS-first config, `@theme` tokens, class composition |
| `react` | React component patterns, hooks, state management, performance, testing conventions |
| `vue` | Vue 3 Composition API, SFC patterns, reactivity, composables, TypeScript integration |
| `svelte` | Svelte 5 runes, reactivity model, SvelteKit conventions (routing, load, form actions) |
| `accessibility` | WCAG 2.2 compliance, ARIA patterns, semantic HTML, keyboard navigation, focus management |

## Skill Dependencies

The `tailwindcss` skill has `css` as a hard prerequisite — it requires CSS fundamentals
(specificity, box model, layout) to be loaded before Tailwind-specific conventions apply.
The skill enforces this via a `<prerequisite>` block that invokes `frontend:css`.

## Plugin Scope

This plugin covers frontend platform concerns specific to building for the browser.
Language-specific skills (JavaScript/TypeScript) are provided by the `javascript` plugin.
Framework skills (React, Vue, Svelte) cover framework-specific conventions; the `css`,
`tailwindcss`, and `accessibility` skills are framework-agnostic and apply across all
frontend work. The `tailwindcss` skill bridges CSS fundamentals and framework-specific
class binding — it routes to 9 reference files covering theme configuration, custom
utilities, class authoring, framework integration, layout, sizing, typography, backgrounds,
and transforms/animations.
