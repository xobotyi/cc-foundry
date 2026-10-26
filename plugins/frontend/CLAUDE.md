# frontend Plugin

Frontend platform discipline: CSS, accessibility, framework conventions, and browser-specific practices.

## Skills

- **`css`** — CSS conventions, layout systems, SCSS/SASS (modern Dart Sass), responsive design, methodologies
- **`tailwindcss`** — Tailwind CSS v4 utility-first discipline: CSS-first config, `@theme` tokens, class composition
- **`react`** — React component patterns, hooks, state management, performance, testing conventions
- **`vue`** — Vue 3 Composition API, SFC patterns, reactivity, composables, TypeScript integration
- **`svelte`** — Svelte 5 runes, reactivity model, SvelteKit conventions (routing, load, form actions)
- **`accessibility`** — WCAG 2.2 compliance, ARIA patterns, semantic HTML, keyboard navigation, focus management
- **`frontend-design`** — which visible choice to make and whether it landed on the rendered page: reuse of the existing
  design, inherited defaults, controls and states, interface copy, render verification. Two references carry the
  conditional depth:
  - `references/converged-defaults.md` — the dated catalogue of stock looks, report counts, cleared patterns, remedies
  - `references/render-checks.md` — thresholds with their sources, and the folk rules no source supports

## Skill Dependencies

- `tailwindcss` → `css` — hard prerequisite, enforced by a `<prerequisite>` block that invokes `frontend:css`
- `frontend-design` names `css`, `tailwindcss`, and `accessibility` as boundaries with no invoke pointer — the soft tier
  of [ADR 1.3](/design-docs/adr/1.3-skill-dependencies.md). `frontend-design` decides which value; they govern how it is
  written and whether it conforms

## Plugin Scope

- Language discipline (JavaScript/TypeScript) belongs to the `javascript` plugin, never to a skill here
- `css`, `tailwindcss`, `accessibility`, and `frontend-design` apply across all frontend work; `react`, `vue`, and
  `svelte` carry framework-specific conventions
- `frontend-design` owns interface copy — labels, errors, empty states, placeholder content. Prose for readers belongs
  to `the-writer`

## Conventions

**Authoring `frontend-design`:**

- **The body carries kinds of default; the catalogue carries names.** A named typeface, a color value, or a dated
  cluster never enters `SKILL.md`. It goes to `references/converged-defaults.md` with the date it was observed and its
  source, because the names turn over within months and the kinds do not
- **Never recommend a replacement value**, in the body or in a reference. Every documented case of a prescribed
  alternative ended with the alternative as the next stock look; the catalogue records three
- **A rule about inherited defaults, controls, states, copy, or render checks enters the body with an observed
  correction behind it**, never from a tell-list. Those sections were built from user corrections in real sessions, and
  that is what separates them from the public lists
- **Counts in the catalogue come from reading comments, never from keyword matching.** The upstream ranking it was built
  against rests on a lexicon, and a full read of the same comments found most lexicon entries rare and the largest
  non-visual categories absent from it. Re-ground by reading
- **A threshold in `references/render-checks.md` carries the source that states it**, and where sources disagree both
  numbers stay. A number with no source goes under the rules no source supports
- Prior art is taken as methodology, never as craft or text ([ADR 1.6](/design-docs/adr/1.6-prior-art-reuse.md)):
  Anthropic's skill of the same name, unslop-ui, Impeccable, and Vercel's Web Interface Guidelines are sources for
  method, and their text is not copied
- The name is shared with Anthropic's `frontend-design:frontend-design` on purpose — it is the term users search for.
  The description and `when_to_use` carry the discrimination. The two differ where this one ranks the user's instruction
  and the existing design first, examines inherited defaults, and prescribes a render pass across widths and states
- Re-ground the references by refreshing `skills/frontend-design/.dev/reference-inventory.json` and running
  `vp run cli docs-fetch plugins/frontend/skills/frontend-design/.dev/reference-inventory.json`
